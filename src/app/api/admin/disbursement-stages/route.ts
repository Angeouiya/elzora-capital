import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { parseStagePlan, stageFinancials } from "@/lib/staged-disbursement";

const noStore = { "Cache-Control": "private, no-store" };
const canRead = (admin: SessionAdmin) => ["finance", "validator", "analyst", "auditor", "superadmin"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("disbursement:read");
const canPlan = (admin: SessionAdmin) => ["finance", "superadmin"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("disbursement:prepare");
const canReview = (admin: SessionAdmin) => ["validator", "analyst", "superadmin"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("disbursement:qa");

interface FundedProject {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  submittedBy: string;
  status: string;
  raisedAmount: number;
  offerStatus: string;
  isDemo: number;
  verificationStatus: string;
  verifiedBankAccount: string | null;
  bankAccountVerifiedAt: string | null;
  stageCount: number;
  disbursementCount: number;
}

interface StageRow {
  id: string;
  projectId: string;
  trancheNo: number;
  title: string;
  grossAmount: number;
  previousGross: number;
  upfrontCommissionPct: number;
  targetDate: string;
  qualityCriteria: string;
  status: string;
  plannedBy: string;
  progressNote: string | null;
  evidenceDocumentId: string | null;
  evidenceFileName: string | null;
  submittedAt: string | null;
  qaBy: string | null;
  qaAt: string | null;
  qaNote: string | null;
  updatedAt: string;
  projectTitle: string;
  companyName: string;
  companyId: string;
  submittedBy: string;
  transferId: string | null;
  transferStatus: string | null;
  transferPreparedBy: string | null;
  transferExecutedAt: string | null;
}

const stagesSql = `SELECT s.id, s.projectId, s.trancheNo, s.title, s.grossAmount,
  o.upfrontCommissionPct,
  COALESCE((SELECT SUM(prior.grossAmount) FROM DisbursementStage prior
    WHERE prior.projectId = s.projectId AND prior.trancheNo < s.trancheNo), 0) AS previousGross,
  s.targetDate, s.qualityCriteria, s.status, s.plannedBy, s.progressNote,
  s.evidenceDocumentId, d.fileName AS evidenceFileName, s.submittedAt,
  s.qaBy, s.qaAt, s.qaNote, s.updatedAt, p.title AS projectTitle,
  c.legalName AS companyName, p.companyId, p.submittedBy,
  x.id AS transferId, x.status AS transferStatus,
  x.preparedBy AS transferPreparedBy, x.executedAt AS transferExecutedAt
  FROM DisbursementStage s
  JOIN Project p ON p.id = s.projectId
  JOIN Offer o ON o.projectId = p.id
  JOIN Company c ON c.id = p.companyId
  LEFT JOIN ProjectDocument d ON d.id = s.evidenceDocumentId
  LEFT JOIN Disbursement x ON x.projectId = s.projectId AND x.trancheNo = s.trancheNo`;

export async function GET(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(req); } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canRead(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  const database = getD1();
  const [stageResult, projectResult] = await Promise.all([
    database.prepare(`${stagesSql} ORDER BY s.updatedAt DESC, s.trancheNo ASC LIMIT 200`).all<StageRow>(),
    database.prepare(`SELECT p.id, p.title, p.companyId, c.legalName AS companyName,
      p.submittedBy, p.status, o.raisedAmount, o.status AS offerStatus, o.isDemo,
      c.verificationStatus, c.verifiedBankAccount, c.bankAccountVerifiedAt,
      (SELECT COUNT(*) FROM DisbursementStage s WHERE s.projectId = p.id) AS stageCount,
      (SELECT COUNT(*) FROM Disbursement d WHERE d.projectId = p.id) AS disbursementCount
      FROM Project p JOIN Company c ON c.id = p.companyId
      JOIN Offer o ON o.projectId = p.id
      WHERE p.status IN ('funded', 'repaying') AND o.status = 'funded'
      ORDER BY p.fundedAt DESC LIMIT 100`).all<FundedProject>(),
  ]);
  return NextResponse.json({
    stages: stageResult.results.map((row) => ({
      ...row,
      grossAmount: Number(row.grossAmount),
      ...stageFinancials(Number(row.grossAmount), Number(row.previousGross), Number(row.upfrontCommissionPct)),
    })),
    eligibleProjects: projectResult.results.filter((row) =>
      !row.isDemo && row.verificationStatus === "verified" && row.verifiedBankAccount &&
      row.bankAccountVerifiedAt && Number(row.raisedAmount) > 0 &&
      Number(row.stageCount) === 0 && Number(row.disbursementCount) === 0
    ).map((row) => ({ id: row.id, title: row.title, companyName: row.companyName, raisedAmount: Number(row.raisedAmount) })),
    permissions: {
      plan: canPlan(admin),
      review: canReview(admin),
      approve: ["finance", "validator", "superadmin"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("disbursement:approve"),
    },
    currentAdminId: admin.adminId,
  }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(req); } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canPlan(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Demande invalide" }, { status: 400, headers: noStore });
  }
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "Choisissez un projet." }, { status: 400, headers: noStore });
  const database = getD1();
  const project = await database.prepare(`SELECT p.id, p.title, p.status, p.submittedBy,
    o.raisedAmount, o.status AS offerStatus, o.isDemo,
    c.verificationStatus, c.verifiedBankAccount, c.bankAccountVerifiedAt,
    (SELECT COUNT(*) FROM DisbursementStage s WHERE s.projectId = p.id) AS stageCount,
    (SELECT COUNT(*) FROM Disbursement d WHERE d.projectId = p.id) AS disbursementCount
    FROM Project p JOIN Offer o ON o.projectId = p.id
    JOIN Company c ON c.id = p.companyId WHERE p.id = ? LIMIT 1`)
    .bind(projectId).first<FundedProject>();
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404, headers: noStore });
  if (!["funded", "repaying"].includes(project.status) || project.offerStatus !== "funded" || project.isDemo ||
    project.verificationStatus !== "verified" || !project.verifiedBankAccount || !project.bankAccountVerifiedAt) {
    return NextResponse.json({ error: "Ce financement ou le compte de l’entreprise n’est pas encore validé." }, { status: 409, headers: noStore });
  }
  if (Number(project.stageCount) || Number(project.disbursementCount)) {
    return NextResponse.json({ error: "Un calendrier ou un versement existe déjà pour ce projet." }, { status: 409, headers: noStore });
  }
  const parsed = parseStagePlan(body.stages, Number(project.raisedAmount));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  const now = isoNow();
  try {
    await database.batch([
      ...parsed.stages.map((stage, index) => database.prepare(`INSERT INTO DisbursementStage
        (id, projectId, trancheNo, title, grossAmount, targetDate, qualityCriteria,
         status, plannedBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?)`)
        .bind(crypto.randomUUID(), projectId, index + 1, stage.title, stage.grossAmount,
          stage.targetDate, stage.qualityCriteria, admin.adminId, now, now)),
      database.prepare(`INSERT INTO AuditLog
        (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
        VALUES (?, 'admin', ?, 'disbursement_plan_created', 'project', ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), admin.adminId, projectId,
          JSON.stringify({ stages: parsed.stages }), requestIp(req), now),
      database.prepare(`INSERT INTO ProjectEvent (id, projectId, eventType, description, actor, createdAt)
        VALUES (?, ?, 'disbursement_plan', ?, ?, ?)`)
        .bind(crypto.randomUUID(), projectId,
          `Calendrier de ${parsed.stages.length} versements préparé. Chaque étape exige un contrôle qualité.`,
          admin.adminId, now),
      database.prepare(`INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
        VALUES (?, ?, 'payment', 'Calendrier de versement', ?, 0, 'company_dashboard', ?)`)
        .bind(crypto.randomUUID(), project.submittedBy,
          `Le calendrier de versement du projet « ${project.title} » est disponible. Déposez le justificatif de la première étape.`, now),
    ]);
  } catch (error) {
    console.error("disbursement_plan_failed", error);
    return NextResponse.json({ error: "Le calendrier n’a pas pu être enregistré. Actualisez la page." }, { status: 409, headers: noStore });
  }
  return NextResponse.json({ ok: true, count: parsed.stages.length }, { status: 201, headers: noStore });
}

export async function PATCH(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(req); } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canReview(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Demande invalide" }, { status: 400, headers: noStore });
  }
  const id = String(body.stageId ?? "").trim();
  const action = String(body.action ?? "");
  const note = String(body.note ?? "").trim().replace(/\s+/g, " ");
  if (!id || !["qa_pass", "request_changes"].includes(action) || note.length < 20 || note.length > 2000) {
    return NextResponse.json({ error: "Une décision et un commentaire précis de 20 caractères minimum sont requis." }, { status: 400, headers: noStore });
  }
  const database = getD1();
  const stage = await database.prepare(`${stagesSql} WHERE s.id = ? LIMIT 1`).bind(id).first<StageRow>();
  if (!stage) return NextResponse.json({ error: "Étape introuvable" }, { status: 404, headers: noStore });
  if (stage.status !== "evidence_submitted" || !stage.evidenceDocumentId || !stage.progressNote) {
    return NextResponse.json({ error: "Le compte rendu et sa pièce justificative sont requis avant la revue." }, { status: 409, headers: noStore });
  }
  if (stage.plannedBy === admin.adminId) {
    return NextResponse.json({ error: "La personne qui a préparé le calendrier ne peut pas valider son propre contrôle qualité." }, { status: 403, headers: noStore });
  }
  const nextStatus = action === "qa_pass" ? "qa_passed" : "changes_requested";
  const now = isoNow();
  const actionLabel = action === "qa_pass" ? "Contrôle qualité validé" : "Corrections demandées";
  const statements = [
    database.prepare(`UPDATE DisbursementStage SET status = ?, qaBy = ?, qaAt = ?, qaNote = ?, updatedAt = ?
      WHERE id = ? AND status = 'evidence_submitted' AND evidenceDocumentId IS NOT NULL`)
      .bind(nextStatus, admin.adminId, now, note, now, id),
    database.prepare(`INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
      SELECT ?, 'admin', ?, ?, 'disbursement_stage', ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM DisbursementStage WHERE id = ? AND qaBy = ? AND qaAt = ? AND status = ?)`)
      .bind(crypto.randomUUID(), admin.adminId, action === "qa_pass" ? "stage_qa_passed" : "stage_changes_requested",
        id, JSON.stringify({ projectId: stage.projectId, trancheNo: stage.trancheNo, note }), requestIp(req), now,
        id, admin.adminId, now, nextStatus),
    database.prepare(`INSERT INTO ProjectEvent (id, projectId, eventType, description, actor, createdAt)
      SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS
      (SELECT 1 FROM DisbursementStage WHERE id = ? AND qaBy = ? AND qaAt = ? AND status = ?)`)
      .bind(crypto.randomUUID(), stage.projectId, action === "qa_pass" ? "stage_qa_passed" : "stage_changes_requested",
        `${actionLabel} pour l’étape ${stage.trancheNo} : ${stage.title}.`, admin.adminId, now,
        id, admin.adminId, now, nextStatus),
    database.prepare(`INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
      SELECT ?, ?, 'payment', ?, ?, 0, 'company_dashboard', ? WHERE EXISTS
      (SELECT 1 FROM DisbursementStage WHERE id = ? AND qaBy = ? AND qaAt = ? AND status = ?)`)
      .bind(crypto.randomUUID(), stage.submittedBy, actionLabel,
        `Projet « ${stage.projectTitle} », étape ${stage.trancheNo} : ${note}`, now,
        id, admin.adminId, now, nextStatus),
  ];
  const result = await database.batch(statements);
  if (result[0].meta.changes !== 1) return NextResponse.json({ error: "Cette étape vient de changer. Actualisez la page." }, { status: 409, headers: noStore });
  return NextResponse.json({ ok: true, status: nextStatus }, { headers: noStore });
}
