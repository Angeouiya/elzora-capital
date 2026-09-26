import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";

interface ConfirmableProjectRow extends Record<string, unknown> {
  id: string;
  companyId: string;
  title: string;
  status: string;
  mandate: string;
  instrumentType: string;
  fundingGoal: number;
  companyContribution: number;
  minInvestment: number;
  maxInvestment: number | null;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  fundingPurpose: string | null;
  useOfFunds: string | null;
  milestones: string | null;
  financialForecasts: string | null;
  forecastAssumptions: string | null;
  analysisNote: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: "Confirmation invalide" }, { status: 400 });
  }
  if (body.acceptFinalTerms !== true) {
    return NextResponse.json(
      { error: "Confirmez explicitement les conditions harmonisées." },
      { status: 422 }
    );
  }

  const { id } = await params;
  const database = getD1();
  const project = await database
    .prepare(
      `SELECT p.*, m.mandate
       FROM Project p
       JOIN CompanyMember m ON m.companyId = p.companyId
       WHERE p.id = ? AND m.userId = ?
       LIMIT 1`
    )
    .bind(id, session.userId)
    .first<ConfirmableProjectRow>();

  if (!project) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }
  if (!new Set(["sign", "manage"]).has(project.mandate)) {
    return NextResponse.json(
      { error: "Un signataire habilité de l’entreprise doit confirmer l’offre." },
      { status: 403 }
    );
  }
  if (project.status === "offer_confirmed") {
    const existing = await database
      .prepare(`SELECT termsHash, confirmedAt FROM ProjectOfferConfirmation WHERE projectId = ? LIMIT 1`)
      .bind(project.id)
      .first<{ termsHash: string; confirmedAt: string }>();
    return NextResponse.json({
      ok: true,
      status: "offer_confirmed",
      termsHash: existing?.termsHash || null,
      confirmedAt: existing?.confirmedAt || null,
      idempotent: true,
    });
  }
  if (project.status !== "offer_prepared") {
    return NextResponse.json(
      { error: "Les conditions finales ne sont pas encore prêtes à être confirmées." },
      { status: 409 }
    );
  }

  const now = isoNow();
  const termsSnapshot = JSON.stringify({
    version: 1,
    currency: "XOF",
    projectId: project.id,
    companyId: project.companyId,
    title: project.title,
    instrumentType: project.instrumentType,
    fundingGoal: Number(project.fundingGoal),
    companyContribution: Number(project.companyContribution),
    minInvestment: Number(project.minInvestment),
    maxInvestment: project.maxInvestment == null ? null : Number(project.maxInvestment),
    annualRate: project.annualRate == null ? null : Number(project.annualRate),
    ratePeriod: project.ratePeriod,
    durationMonths: project.durationMonths == null ? null : Number(project.durationMonths),
    repaymentType: project.repaymentType,
    equityOfferedPct: project.equityOfferedPct == null ? null : Number(project.equityOfferedPct),
    valuationPre: project.valuationPre == null ? null : Number(project.valuationPre),
    fundingPurpose: project.fundingPurpose,
    useOfFunds: jsonValue(project.useOfFunds, []),
    milestones: jsonValue(project.milestones, []),
    financialForecasts: jsonValue(project.financialForecasts, []),
    forecastAssumptions: project.forecastAssumptions,
    analysisNote: project.analysisNote,
  });
  const termsHash = await sha256Text(termsSnapshot);
  const confirmationId = crypto.randomUUID();

  try {
    const results = await database.batch([
      database
        .prepare(
          `INSERT INTO ProjectOfferConfirmation
             (id, projectId, companyId, confirmedBy, termsSnapshot, termsHash,
              confirmedAt, ipAddress, userAgent, createdAt)
           SELECT ?, p.id, p.companyId, ?, ?, ?, ?, ?, ?, ?
           FROM Project p
           WHERE p.id = ? AND p.companyId = ? AND p.status = 'offer_prepared'`
        )
        .bind(
          confirmationId,
          session.userId,
          termsSnapshot,
          termsHash,
          now,
          requestIp(req),
          req.headers.get("user-agent")?.slice(0, 512) || null,
          now,
          project.id,
          project.companyId
        ),
      database
        .prepare(
          `UPDATE Project
           SET status = 'offer_confirmed', updatedAt = ?
           WHERE id = ? AND status = 'offer_prepared'
             AND EXISTS (SELECT 1 FROM ProjectOfferConfirmation WHERE id = ?)`
        )
        .bind(now, project.id, confirmationId),
      database
        .prepare(
          `INSERT INTO ProjectEvent
             (id, projectId, eventType, description, actor, createdAt)
           SELECT ?, ?, 'offer_confirmed', ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM ProjectOfferConfirmation WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          project.id,
          "Conditions harmonisées confirmées par l’entreprise",
          session.userId,
          now,
          confirmationId
        ),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'project_offer_confirmed_by_company', 'project', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM ProjectOfferConfirmation WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          project.id,
          JSON.stringify({
            companyId: project.companyId,
            from: "offer_prepared",
            to: "offer_confirmed",
            termsHash,
          }),
          requestIp(req),
          now,
          confirmationId
        ),
      database
        .prepare(
          `INSERT INTO Notification
             (id, userId, type, title, message, read, actionUrl, createdAt)
           SELECT ?, ?, 'decision', 'Accord enregistré', ?, 0, 'company_dashboard', ?
           WHERE EXISTS (SELECT 1 FROM ProjectOfferConfirmation WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          `Votre accord sur les conditions finales de « ${project.title} » est enregistré. L’équipe termine le contrôle avant publication.`,
          now,
          confirmationId
        ),
    ]);
    if ((results[0].meta.changes || 0) !== 1 || (results[1].meta.changes || 0) !== 1) {
      return NextResponse.json({ error: "Le dossier a changé. Actualisez puis réessayez." }, { status: 409 });
    }
  } catch (error) {
    console.error("project_offer_confirmation_failed", error);
    return NextResponse.json(
      { error: "La confirmation n’a pas pu être enregistrée." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "offer_confirmed",
    termsHash,
    confirmedAt: now,
    idempotent: false,
  });
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
