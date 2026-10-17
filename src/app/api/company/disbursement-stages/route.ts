import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";

const noStore = { "Cache-Control": "private, no-store" };

interface CompanyStage {
  id: string;
  projectId: string;
  projectTitle: string;
  trancheNo: number;
  title: string;
  grossAmount: number;
  targetDate: string;
  qualityCriteria: string;
  status: string;
  progressNote: string | null;
  evidenceDocumentId: string | null;
  evidenceFileName: string | null;
  submittedAt: string | null;
  qaAt: string | null;
  qaNote: string | null;
  transferStatus: string | null;
  transferExecutedAt: string | null;
  companyId: string;
  mandate: string;
}

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireUser(req); } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  const database = getD1();
  const result = await database.prepare(`SELECT s.id, s.projectId, p.title AS projectTitle,
    s.trancheNo, s.title, s.grossAmount, s.targetDate, s.qualityCriteria,
    s.status, s.progressNote, s.evidenceDocumentId,
    d.fileName AS evidenceFileName, s.submittedAt, s.qaAt, s.qaNote,
    x.status AS transferStatus, x.executedAt AS transferExecutedAt,
    p.companyId, m.mandate
    FROM DisbursementStage s JOIN Project p ON p.id = s.projectId
    JOIN CompanyMember m ON m.companyId = p.companyId AND m.userId = ?
    LEFT JOIN ProjectDocument d ON d.id = s.evidenceDocumentId
    LEFT JOIN Disbursement x ON x.projectId = s.projectId AND x.trancheNo = s.trancheNo
    ORDER BY p.updatedAt DESC, s.trancheNo ASC LIMIT 200`)
    .bind(session.userId).all<CompanyStage>();
  return NextResponse.json({ stages: result.results.map((row) => ({ ...row, grossAmount: Number(row.grossAmount) })) }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireUser(req); } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Demande invalide" }, { status: 400, headers: noStore });
  }
  const stageId = String(body.stageId ?? "").trim();
  const evidenceDocumentId = String(body.evidenceDocumentId ?? "").trim();
  const progressNote = String(body.progressNote ?? "").trim().replace(/\s+/g, " ");
  if (!stageId || !evidenceDocumentId || progressNote.length < 30 || progressNote.length > 3000) {
    return NextResponse.json({ error: "Ajoutez une pièce et un compte rendu détaillé de 30 caractères minimum." }, { status: 400, headers: noStore });
  }
  const database = getD1();
  const stage = await database.prepare(`SELECT s.id, s.projectId, s.trancheNo, s.title, s.status,
    p.title AS projectTitle, m.mandate
    FROM DisbursementStage s JOIN Project p ON p.id = s.projectId
    JOIN CompanyMember m ON m.companyId = p.companyId AND m.userId = ?
    WHERE s.id = ? LIMIT 1`).bind(session.userId, stageId)
    .first<Pick<CompanyStage, "id" | "projectId" | "trancheNo" | "title" | "status" | "projectTitle" | "mandate">>();
  if (!stage) return NextResponse.json({ error: "Étape introuvable" }, { status: 404, headers: noStore });
  if (!["submit", "sign", "manage"].includes(stage.mandate)) {
    return NextResponse.json({ error: "Votre mandat ne permet pas de transmettre un compte rendu." }, { status: 403, headers: noStore });
  }
  if (!["planned", "changes_requested"].includes(stage.status)) {
    return NextResponse.json({ error: "Cette étape n’attend pas de nouveau compte rendu." }, { status: 409, headers: noStore });
  }
  const document = await database.prepare(`SELECT id, uploadedAt FROM ProjectDocument
    WHERE id = ? AND projectId = ? AND type = 'milestone_evidence' AND isPublic = 0 LIMIT 1`)
    .bind(evidenceDocumentId, stage.projectId).first<{ id: string; uploadedAt: string }>();
  if (!document) return NextResponse.json({ error: "La pièce justificative est introuvable pour ce projet." }, { status: 400, headers: noStore });
  const previousUse = await database.prepare(`SELECT id FROM DisbursementStage WHERE evidenceDocumentId = ? AND id <> ? LIMIT 1`)
    .bind(evidenceDocumentId, stageId).first<{ id: string }>();
  if (previousUse) return NextResponse.json({ error: "Cette pièce est déjà liée à une autre étape." }, { status: 409, headers: noStore });
  const now = isoNow();
  const result = await database.batch([
    database.prepare(`UPDATE DisbursementStage SET status = 'evidence_submitted', progressNote = ?,
      evidenceDocumentId = ?, submittedBy = ?, submittedAt = ?, qaBy = NULL, qaAt = NULL,
      qaNote = NULL, updatedAt = ? WHERE id = ? AND status IN ('planned', 'changes_requested')`)
      .bind(progressNote, evidenceDocumentId, session.userId, now, now, stageId),
    database.prepare(`INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
      SELECT ?, 'user', ?, 'stage_evidence_submitted', 'disbursement_stage', ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM DisbursementStage WHERE id = ? AND submittedBy = ? AND submittedAt = ? AND status = 'evidence_submitted')`)
      .bind(crypto.randomUUID(), session.userId, stageId,
        JSON.stringify({ projectId: stage.projectId, trancheNo: stage.trancheNo, evidenceDocumentId }),
        requestIp(req), now, stageId, session.userId, now),
    database.prepare(`INSERT INTO ProjectEvent (id, projectId, eventType, description, actor, createdAt)
      SELECT ?, ?, 'stage_evidence_submitted', ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM DisbursementStage WHERE id = ? AND submittedBy = ? AND submittedAt = ? AND status = 'evidence_submitted')`)
      .bind(crypto.randomUUID(), stage.projectId,
        `Compte rendu transmis pour l’étape ${stage.trancheNo} : ${stage.title}.`, session.userId, now,
        stageId, session.userId, now),
  ]);
  if (result[0].meta.changes !== 1) return NextResponse.json({ error: "Cette étape vient de changer. Actualisez la page." }, { status: 409, headers: noStore });
  return NextResponse.json({ ok: true, status: "evidence_submitted" }, { headers: noStore });
}
