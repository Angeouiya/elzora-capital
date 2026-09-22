import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { canDecideKyc, canReadKyc } from "@/lib/kyc";

interface KycCaseRow extends Record<string, unknown> {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  identityType: string | null;
  identityNumberLast4: string | null;
  documentCountry: string | null;
  expiresAt: string | null;
  residentialAddress: string | null;
  city: string | null;
  occupation: string | null;
  sourceOfFunds: string | null;
  politicallyExposed: number | null;
  actingForSelf: number | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decidedBy: string | null;
  decisionReason: string | null;
}

interface KycDocumentRow extends Record<string, unknown> {
  id: string;
  userId: string;
  kind: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canReadKyc(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });

  const userId = new URL(req.url).searchParams.get("userId");
  const database = getD1();
  const cases = await database
    .prepare(
      `SELECT u.id AS userId, u.email, u.firstName, u.lastName, u.country,
              u.kycStatus, u.kycSubmittedAt, u.kycVerifiedAt,
              k.identityType, k.identityNumberLast4, k.documentCountry, k.expiresAt,
              k.residentialAddress, k.city, k.occupation, k.sourceOfFunds,
              k.politicallyExposed, k.actingForSelf, k.reviewedAt, k.reviewedBy,
              k.decidedBy, k.decisionReason
       FROM User u
       LEFT JOIN KycProfile k ON k.userId = u.id
       WHERE (? IS NULL OR u.id = ?)
         AND (k.userId IS NOT NULL OR u.kycStatus != 'incomplete')
       ORDER BY CASE u.kycStatus WHEN 'pending' THEN 0 WHEN 'review' THEN 1 ELSE 2 END,
                u.kycSubmittedAt DESC
       LIMIT 100`
    )
    .bind(userId, userId)
    .all<KycCaseRow>();
  const ids = cases.results.map((item) => item.userId);
  let documents: KycDocumentRow[] = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    documents = (
      await database
        .prepare(
          `SELECT id, userId, kind, fileName, contentType, size, uploadedAt
           FROM KycDocument WHERE status = 'active' AND userId IN (${placeholders})
           ORDER BY uploadedAt DESC`
        )
        .bind(...ids)
        .all<KycDocumentRow>()
    ).results;
  }

  return NextResponse.json(
    {
      canDecide: canDecideKyc(admin),
      cases: cases.results.map((item) => ({
        ...item,
        identityNumber: item.identityNumberLast4 ? `•••• ${item.identityNumberLast4}` : null,
        identityNumberLast4: undefined,
        politicallyExposed: Boolean(item.politicallyExposed),
        actingForSelf: Boolean(item.actingForSelf),
        documents: documents.filter((document) => document.userId === item.userId),
      })),
    },
    { headers: noStore }
  );
}

export async function PATCH(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canDecideKyc(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });

  const body = (await req.json().catch(() => null)) as { userId?: string; action?: string; reason?: string } | null;
  const userId = body?.userId?.trim();
  const action = body?.action?.trim();
  const reason = body?.reason?.trim() ?? "";
  if (!userId || !["review", "approve", "reject", "refresh"].includes(action ?? "")) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400, headers: noStore });
  }
  if (["reject", "refresh"].includes(action!) && reason.length < 8) {
    return NextResponse.json({ error: "Précisez un motif d’au moins 8 caractères" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const current = await database
    .prepare(
      `SELECT u.kycStatus, k.reviewedBy FROM User u
       JOIN KycProfile k ON k.userId = u.id WHERE u.id = ? LIMIT 1`
    )
    .bind(userId)
    .first<{ kycStatus: string; reviewedBy: string | null }>();
  if (!current) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404, headers: noStore });

  if (action === "review" && current.kycStatus !== "pending") {
    return NextResponse.json({ error: "Ce dossier ne peut plus être pris en revue" }, { status: 409, headers: noStore });
  }
  if (action !== "review" && current.kycStatus !== "review") {
    return NextResponse.json({ error: "Le dossier doit d’abord être placé en revue" }, { status: 409, headers: noStore });
  }
  if (action !== "review" && current.reviewedBy === admin.adminId) {
    return NextResponse.json(
      { error: "Le contrôle à quatre yeux exige une décision par un second responsable habilité." },
      { status: 409, headers: noStore }
    );
  }

  const now = isoNow();
  const nextStatus = action === "review" ? "review" : action === "approve" ? "verified" : action === "reject" ? "rejected" : "refresh";
  const title = action === "approve" ? "Identité vérifiée" : action === "review" ? "Dossier en cours d’examen" : "Action requise sur votre dossier";
  const message =
    action === "approve"
      ? "Votre identité est vérifiée. Vous pouvez désormais investir et demander vos versements."
      : action === "review"
        ? "Votre dossier est en cours d’examen approfondi."
        : `Veuillez mettre à jour votre dossier : ${reason}`;

  const statements = action === "review"
    ? [
        database.prepare(`UPDATE User SET kycStatus = 'review', updatedAt = ? WHERE id = ?`).bind(now, userId),
        database
          .prepare(`UPDATE KycProfile SET reviewedAt = ?, reviewedBy = ?, decisionReason = NULL, updatedAt = ? WHERE userId = ?`)
          .bind(now, admin.adminId, now, userId),
      ]
    : [
        database
          .prepare(
            `UPDATE User SET kycStatus = ?, kycVerifiedAt = ?, kycRejectionReason = ?, updatedAt = ? WHERE id = ?`
          )
          .bind(nextStatus, action === "approve" ? now : null, action === "approve" ? null : reason, now, userId),
        database
          .prepare(`UPDATE KycProfile SET decidedBy = ?, decisionReason = ?, updatedAt = ? WHERE userId = ?`)
          .bind(admin.adminId, action === "approve" ? reason || "Conforme" : reason, now, userId),
        database.prepare(`UPDATE KycDocument SET reviewedAt = ? WHERE userId = ? AND status = 'active'`).bind(now, userId),
      ];

  statements.push(
    database
      .prepare(
        `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'admin', ?, ?, 'User', ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), admin.adminId, `kyc.${action}`, userId, JSON.stringify({ from: current.kycStatus, to: nextStatus, reason: reason || null }), requestIp(req), now),
    database
      .prepare(
        `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
         VALUES (?, ?, 'verification', ?, ?, 0, 'portfolio', ?)`
      )
      .bind(crypto.randomUUID(), userId, title, message, now)
  );
  await database.batch(statements);
  return NextResponse.json({ ok: true, status: nextStatus }, { headers: noStore });
}
