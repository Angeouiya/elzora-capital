import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { canReadKyc, getKycBucket } from "@/lib/kyc";

interface DocumentRow extends Record<string, unknown> {
  id: string;
  userId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
}

export async function GET(req: Request, context: { params: Promise<{ documentId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canReadKyc(admin)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { documentId } = await context.params;
  const database = getD1();
  const document = await database
    .prepare(
      `SELECT id, userId, storageKey, fileName, contentType
       FROM KycDocument WHERE id = ? AND status = 'active' LIMIT 1`
    )
    .bind(documentId)
    .first<DocumentRow>();
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const bucket = getKycBucket();
  if (!bucket) return NextResponse.json({ error: "Coffre documentaire indisponible" }, { status: 503 });
  const object = await bucket.get(document.storageKey);
  if (!object) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const now = isoNow();
  await database
    .prepare(
      `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       VALUES (?, 'admin', ?, 'kyc.document_viewed', 'KycDocument', ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), admin.adminId, document.id, JSON.stringify({ userId: document.userId }), requestIp(req), now)
    .run();

  return new Response(object.body, {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${document.fileName.replace(/[\r\n\"]/g, "-")}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
