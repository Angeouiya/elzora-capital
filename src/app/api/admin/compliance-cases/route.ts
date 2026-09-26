import { NextResponse } from "next/server";
import { requireAdmin, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";

const noStore = { "Cache-Control": "private, no-store" };

interface ComplianceCaseRow extends Record<string, unknown> {
  id: string;
  userId: string;
  offerId: string;
  method: string;
  amount: number;
  severity: string;
  riskScore: number;
  reasons: string;
  status: string;
  reviewedBy: string | null;
  decidedBy: string | null;
  note: string | null;
  decisionReason: string | null;
  externalReportRef: string | null;
  approvalExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  offerTitle: string;
  reviewerName: string | null;
  deciderName: string | null;
}

function canRead(admin: SessionAdmin) {
  return ["superadmin", "compliance", "auditor"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("compliance:read") || admin.permissions.includes("compliance:decide");
}

function canDecide(admin: SessionAdmin) {
  return ["superadmin", "compliance"].includes(admin.role) || admin.permissions.includes("all") || admin.permissions.includes("compliance:decide");
}

export async function GET(req: Request) {
  let admin: SessionAdmin;
  try { admin = await requireAdmin(req); } catch { return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore }); }
  if (!canRead(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });

  const status = new URL(req.url).searchParams.get("status") || "active";
  const database = getD1();
  const rows = await database
    .prepare(
      `SELECT c.*, u.firstName, u.lastName, u.email, u.country, p.title AS offerTitle,
              TRIM(COALESCE(ar.firstName, '') || ' ' || COALESCE(ar.lastName, '')) AS reviewerName,
              TRIM(COALESCE(ad.firstName, '') || ' ' || COALESCE(ad.lastName, '')) AS deciderName
       FROM ComplianceCase c
       JOIN User u ON u.id = c.userId
       JOIN Offer o ON o.id = c.offerId
       JOIN Project p ON p.id = o.projectId
       LEFT JOIN AdminUser ar ON ar.id = c.reviewedBy
       LEFT JOIN AdminUser ad ON ad.id = c.decidedBy
       WHERE (? = 'all' OR (? = 'active' AND c.status IN ('open','reviewing')) OR c.status = ?)
       ORDER BY CASE c.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
                c.riskScore DESC, c.createdAt ASC
       LIMIT 200`
    )
    .bind(status, status, status)
    .all<ComplianceCaseRow>();

  return NextResponse.json({
    canDecide: canDecide(admin),
    adminId: admin.adminId,
    cases: rows.results.map((item) => ({
      ...item,
      amount: Number(item.amount),
      riskScore: Number(item.riskScore),
      reasons: parseReasons(item.reasons),
      externalReportRef: item.status === "reported" ? item.externalReportRef : null,
    })),
  }, { headers: noStore });
}

export async function PATCH(req: Request) {
  let admin: SessionAdmin;
  try { admin = await requireAdmin(req); } catch { return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore }); }
  if (!canDecide(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });

  const body = await req.json().catch(() => null) as { caseId?: string; action?: string; reason?: string; reportReference?: string } | null;
  const caseId = body?.caseId?.trim();
  const action = body?.action?.trim();
  const reason = body?.reason?.trim() || "";
  const reportReference = body?.reportReference?.trim() || "";
  if (!caseId || !action || !["review", "approve", "reject", "report"].includes(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400, headers: noStore });
  }
  if (action !== "review" && reason.length < 8) {
    return NextResponse.json({ error: "Précisez une justification d'au moins 8 caractères." }, { status: 400, headers: noStore });
  }
  if (action === "report" && reportReference.length < 4) {
    return NextResponse.json({ error: "Ajoutez la référence interne ou externe du signalement." }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const current = await database
    .prepare(`SELECT id, userId, status, reviewedBy FROM ComplianceCase WHERE id = ? LIMIT 1`)
    .bind(caseId)
    .first<{ id: string; userId: string; status: string; reviewedBy: string | null }>();
  if (!current) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404, headers: noStore });
  if (action === "review" && current.status !== "open") return NextResponse.json({ error: "Ce dossier est déjà pris en charge." }, { status: 409, headers: noStore });
  if (action !== "review" && current.status !== "reviewing") return NextResponse.json({ error: "Le dossier doit d'abord être pris en examen." }, { status: 409, headers: noStore });
  if (action !== "review" && current.reviewedBy === admin.adminId) {
    return NextResponse.json({ error: "Une seconde personne habilitée doit prendre la décision finale." }, { status: 409, headers: noStore });
  }

  const now = isoNow();
  const approvalExpiresAt = action === "approve" ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null;
  const nextStatus = action === "review" ? "reviewing" : action === "approve" ? "approved" : action === "reject" ? "rejected" : "reported";
  const result = action === "review"
    ? await database.prepare(`UPDATE ComplianceCase SET status = 'reviewing', reviewedBy = ?, note = ?, updatedAt = ? WHERE id = ? AND status = 'open'`).bind(admin.adminId, reason || null, now, caseId).run()
    : await database.prepare(
        `UPDATE ComplianceCase SET status = ?, decidedBy = ?, decisionReason = ?, externalReportRef = ?,
                reportedAt = ?, approvalExpiresAt = ?, resolvedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'reviewing' AND reviewedBy <> ?`
      ).bind(nextStatus, admin.adminId, reason, action === "report" ? reportReference : null,
        action === "report" ? now : null, approvalExpiresAt, now, now, caseId, admin.adminId).run();
  if (Number(result.meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Le dossier a changé. Actualisez la liste." }, { status: 409, headers: noStore });
  }

  const statements = [
    database.prepare(
      `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       VALUES (?, 'admin', ?, ?, 'ComplianceCase', ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), admin.adminId, `compliance.${action}`, caseId,
      JSON.stringify({ from: current.status, to: nextStatus, reason: reason || null, reportReference: action === "report" ? reportReference : null }), requestIp(req), now),
  ];
  if (action === "approve" || action === "reject") {
    statements.push(
      database.prepare(
        `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
         VALUES (?, ?, 'verification', ?, ?, 0, 'investor_dashboard', ?)`
      ).bind(
        crypto.randomUUID(), current.userId,
        action === "approve" ? "Paiement autorisé" : "Paiement non autorisé",
        action === "approve"
          ? "Vous pouvez reprendre la même souscription dans les 72 heures. Le montant et le moyen de paiement doivent rester identiques."
          : "Cette demande ne peut pas être poursuivie. Aucun montant n'a été débité.",
        now
      )
    );
  }
  await database.batch(statements);
  return NextResponse.json({ ok: true, status: nextStatus, approvalExpiresAt }, { headers: noStore });
}

function parseReasons(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch { return []; }
}
