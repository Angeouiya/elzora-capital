import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { parseProjectInput, ProjectInput } from "@/lib/project-input";

type ProjectRow = Record<string, string | number | null>;

interface MembershipRow {
  id: string;
  role: string;
  mandate: string;
  verificationStatus: string;
}

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const mine = req.nextUrl.searchParams.get("mine") === "true";
  const result = await getD1()
    .prepare(
      `SELECT p.*,
              c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              c.legalForm AS companyLegalForm, c.country AS companyCountry,
              c.activity AS companyActivity, c.verificationStatus AS companyVerificationStatus,
              o.id AS offerId, o.fundingGoal AS offerFundingGoal,
              o.raisedAmount AS offerRaisedAmount, o.committedAmount AS offerCommittedAmount,
              o.backersCount AS offerBackersCount, o.annualRate AS offerAnnualRate,
              o.ratePeriod AS offerRatePeriod, o.durationMonths AS offerDurationMonths,
              o.repaymentType AS offerRepaymentType,
              o.upfrontCommissionPct AS offerUpfrontCommissionPct,
              o.annualFollowUpPct AS offerAnnualFollowUpPct,
              o.status AS offerStatus, o.closingDate AS offerClosingDate,
              o.publishedAt AS offerPublishedAt
       FROM Project p
       JOIN Company c ON c.id = p.companyId
       LEFT JOIN Offer o ON o.projectId = p.id
       WHERE EXISTS (
         SELECT 1 FROM CompanyMember m
         WHERE m.companyId = p.companyId AND m.userId = ?
       )
       AND (? = 0 OR p.submittedBy = ?)
       ORDER BY p.updatedAt DESC`
    )
    .bind(session.userId, mine ? 1 : 0, session.userId)
    .all<ProjectRow>();

  return NextResponse.json(
    { projects: result.results.map(mapProject) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const parsed = parseProjectInput(body, true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const database = getD1();
  const membership = await database
    .prepare(
      `SELECT m.id, m.role, m.mandate, c.verificationStatus
       FROM CompanyMember m JOIN Company c ON c.id = m.companyId
       WHERE m.userId = ? AND m.companyId = ? LIMIT 1`
    )
    .bind(session.userId, input.companyId)
    .first<MembershipRow>();

  if (!membership) return NextResponse.json({ error: "Accès refusé à cette entreprise" }, { status: 403 });
  if (!new Set(["submit", "sign", "manage"]).has(membership.mandate)) {
    return NextResponse.json({ error: "Votre mandat ne permet pas de soumettre un dossier" }, { status: 403 });
  }
  if (membership.verificationStatus !== "verified") {
    return NextResponse.json(
      {
        error: "Vérification de l'entreprise requise",
        code: "COMPANY_VERIFICATION_REQUIRED",
        message: "Vous pouvez conserver le dossier en brouillon pendant la vérification.",
      },
      { status: 403 }
    );
  }

  const projectId = input.projectId || crypto.randomUUID();
  const now = isoNow();
  let nextStatus = "submitted";
  let creating = !input.projectId;
  if (input.projectId) {
    const existing = await database
      .prepare(`SELECT companyId, submittedBy, status FROM Project WHERE id = ? LIMIT 1`)
      .bind(input.projectId)
      .first<{ companyId: string; submittedBy: string; status: string }>();
    if (!existing) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    if (existing.companyId !== input.companyId || existing.submittedBy !== session.userId) {
      return NextResponse.json({ error: "Accès refusé à ce dossier" }, { status: 403 });
    }
    if (!new Set(["draft", "complement_requested"]).has(existing.status)) {
      return NextResponse.json({ error: "Ce dossier n'est plus modifiable" }, { status: 409 });
    }
    nextStatus = existing.status === "complement_requested" ? "under_review" : "submitted";
    creating = false;
  }

  const statements = creating
    ? [insertProject(database, projectId, session.userId, input, nextStatus, now)]
    : [updateProject(database, projectId, input, nextStatus, now)];
  statements.push(
    database
      .prepare(
        `INSERT INTO ProjectEvent (id, projectId, eventType, description, actor, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        projectId,
        nextStatus,
        nextStatus === "under_review" ? "Compléments transmis par l'entreprise" : "Dossier transmis pour analyse",
        session.userId,
        now
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'project_submitted', 'project', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        projectId,
        JSON.stringify({ companyId: input.companyId, title: input.title, fundingGoal: input.fundingGoal }),
        requestIp(req),
        now
      ),
    database
      .prepare(
        `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
         VALUES (?, ?, 'submission', 'Dossier transmis', ?, 0, 'company_dashboard', ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        `Votre dossier « ${input.title} » a été transmis pour analyse.`,
        now
      )
  );

  try {
    await database.batch(statements);
  } catch (error) {
    console.error("project_submission_failed", error);
    return NextResponse.json({ error: "Soumission temporairement indisponible" }, { status: 503 });
  }

  const project = await getProject(database, projectId);
  return NextResponse.json({ project: project ? mapProject(project) : null }, { status: creating ? 201 : 200 });
}

function insertProject(
  database: D1Database,
  id: string,
  submittedBy: string,
  input: ProjectInput,
  status: string,
  now: string
) {
  return database
    .prepare(
      `INSERT INTO Project
        (id, companyId, submittedBy, title, description, longDescription, sector, country, city,
         imageUrl, instrumentType, fundingGoal, companyContribution, annualRate, ratePeriod,
         durationMonths, repaymentType, equityOfferedPct, valuationPre, minInvestment, maxInvestment,
         budgetDetail, repaymentSource, risksIdentified, status, submittedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(...projectBindings(id, submittedBy, input, status, now, now));
}

function updateProject(database: D1Database, id: string, input: ProjectInput, status: string, now: string) {
  return database
    .prepare(
      `UPDATE Project SET
         title = ?, description = ?, longDescription = ?, sector = ?, country = ?, city = ?,
         imageUrl = ?, instrumentType = ?, fundingGoal = ?, companyContribution = ?, annualRate = ?,
         ratePeriod = ?, durationMonths = ?, repaymentType = ?, equityOfferedPct = ?, valuationPre = ?,
         minInvestment = ?, maxInvestment = ?, budgetDetail = ?, repaymentSource = ?, risksIdentified = ?,
         status = ?, submittedAt = ?, updatedAt = ?
       WHERE id = ?`
    )
    .bind(
      input.title, input.description, input.longDescription, input.sector, input.country, input.city,
      input.imageUrl, input.instrumentType, input.fundingGoal, input.companyContribution, input.annualRate,
      input.ratePeriod, input.durationMonths, input.repaymentType, input.equityOfferedPct, input.valuationPre,
      input.minInvestment, input.maxInvestment, input.budgetDetail, input.repaymentSource,
      input.risksIdentified, status, now, now, id
    );
}

function projectBindings(
  id: string,
  submittedBy: string,
  input: ProjectInput,
  status: string,
  submittedAt: string | null,
  now: string
) {
  return [
    id, input.companyId, submittedBy, input.title, input.description, input.longDescription,
    input.sector, input.country, input.city, input.imageUrl, input.instrumentType, input.fundingGoal,
    input.companyContribution, input.annualRate, input.ratePeriod, input.durationMonths,
    input.repaymentType, input.equityOfferedPct, input.valuationPre, input.minInvestment,
    input.maxInvestment, input.budgetDetail, input.repaymentSource, input.risksIdentified,
    status, submittedAt, now, now,
  ];
}

async function getProject(database: D1Database, id: string) {
  return database
    .prepare(
      `SELECT p.*, c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              c.legalForm AS companyLegalForm, c.country AS companyCountry,
              c.activity AS companyActivity, c.verificationStatus AS companyVerificationStatus
       FROM Project p JOIN Company c ON c.id = p.companyId WHERE p.id = ? LIMIT 1`
    )
    .bind(id)
    .first<ProjectRow>();
}

function mapProject(row: ProjectRow) {
  const offer = row.offerId
    ? {
        id: row.offerId,
        fundingGoal: Number(row.offerFundingGoal),
        raisedAmount: Number(row.offerRaisedAmount),
        committedAmount: Number(row.offerCommittedAmount),
        backersCount: Number(row.offerBackersCount),
        annualRate: nullableNumber(row.offerAnnualRate),
        ratePeriod: row.offerRatePeriod,
        durationMonths: nullableNumber(row.offerDurationMonths),
        repaymentType: row.offerRepaymentType,
        upfrontCommissionPct: Number(row.offerUpfrontCommissionPct),
        annualFollowUpPct: Number(row.offerAnnualFollowUpPct),
        status: row.offerStatus,
        closingDate: row.offerClosingDate,
        publishedAt: row.offerPublishedAt,
      }
    : null;
  return {
    ...row,
    fundingGoal: Number(row.fundingGoal),
    companyContribution: Number(row.companyContribution),
    annualRate: nullableNumber(row.annualRate),
    durationMonths: nullableNumber(row.durationMonths),
    equityOfferedPct: nullableNumber(row.equityOfferedPct),
    valuationPre: nullableNumber(row.valuationPre),
    minInvestment: Number(row.minInvestment),
    maxInvestment: nullableNumber(row.maxInvestment),
    company: {
      id: row.companyId,
      legalName: row.companyLegalName,
      tradeName: row.companyTradeName,
      legalForm: row.companyLegalForm,
      country: row.companyCountry,
      activity: row.companyActivity,
      verificationStatus: row.companyVerificationStatus,
    },
    offer,
  };
}

function nullableNumber(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}
