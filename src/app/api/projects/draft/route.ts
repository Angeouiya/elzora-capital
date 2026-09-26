import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { parseProjectInput, PROJECT_INPUT_COLUMNS, projectInputValues } from "@/lib/project-input";

type Row = Record<string, string | number | null>;

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
  const parsed = parseProjectInput(body, false);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const database = getD1();
  const membership = await database
    .prepare(`SELECT id, mandate FROM CompanyMember WHERE userId = ? AND companyId = ? LIMIT 1`)
    .bind(session.userId, input.companyId)
    .first<{ id: string; mandate: string }>();
  if (!membership) return NextResponse.json({ error: "Accès refusé à cette entreprise" }, { status: 403 });
  if (!new Set(["submit", "sign", "manage"]).has(membership.mandate)) {
    return NextResponse.json({ error: "Votre mandat ne permet pas de modifier ce dossier" }, { status: 403 });
  }

  const now = isoNow();
  const projectId = input.projectId || crypto.randomUUID();
  let status = "draft";
  const creating = !input.projectId;
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
    status = existing.status;
  }

  const mutation = creating
    ? database
        .prepare(
          `INSERT INTO Project
            (id, companyId, submittedBy, ${PROJECT_INPUT_COLUMNS.join(", ")}, status, createdAt, updatedAt)
           VALUES (${Array.from({ length: PROJECT_INPUT_COLUMNS.length + 6 }, () => "?").join(", ")})`
        )
        .bind(
          projectId, input.companyId, session.userId, ...projectInputValues(input), status, now, now
        )
    : database
        .prepare(
          `UPDATE Project SET
             ${PROJECT_INPUT_COLUMNS.map((column) => `${column} = ?`).join(", ")},
             updatedAt = ?
           WHERE id = ?`
        )
        .bind(
          ...projectInputValues(input), now, projectId
        );

  try {
    await database.batch([
      mutation,
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, ?, 'project', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          creating ? "project_draft_created" : "project_draft_updated",
          projectId,
          JSON.stringify({ companyId: input.companyId, title: input.title }),
          requestIp(req),
          now
        ),
    ]);
  } catch (error) {
    console.error("project_draft_save_failed", error);
    return NextResponse.json({ error: "Enregistrement temporairement indisponible" }, { status: 503 });
  }

  const project = await database
    .prepare(
      `SELECT p.*, c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              c.legalForm AS companyLegalForm, c.country AS companyCountry,
              c.activity AS companyActivity, c.verificationStatus AS companyVerificationStatus
       FROM Project p JOIN Company c ON c.id = p.companyId WHERE p.id = ? LIMIT 1`
    )
    .bind(projectId)
    .first<Row>();

  return NextResponse.json({ project: project ? normalize(project) : null }, { status: creating ? 201 : 200 });
}

function normalize(row: Row) {
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
    employeeCount: nullableNumber(row.employeeCount),
    financialYear: nullableNumber(row.financialYear),
    annualRevenue: nullableNumber(row.annualRevenue),
    previousRevenue: nullableNumber(row.previousRevenue),
    netIncome: nullableNumber(row.netIncome),
    cashBalance: nullableNumber(row.cashBalance),
    existingDebt: nullableNumber(row.existingDebt),
    annualOperatingExpenses: nullableNumber(row.annualOperatingExpenses),
    managementTeam: jsonValue(row.managementTeam, []),
    useOfFunds: jsonValue(row.useOfFunds, []),
    milestones: jsonValue(row.milestones, []),
    financialForecasts: jsonValue(row.financialForecasts, []),
    documentChecklist: jsonValue(row.documentChecklist, {}),
    declarationAccepted: row.declarationAccepted === 1 || row.declarationAccepted === "1",
    company: {
      id: row.companyId,
      legalName: row.companyLegalName,
      tradeName: row.companyTradeName,
      legalForm: row.companyLegalForm,
      country: row.companyCountry,
      activity: row.companyActivity,
      verificationStatus: row.companyVerificationStatus,
    },
  };
}

function nullableNumber(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function jsonValue<T>(value: string | number | null | undefined, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
