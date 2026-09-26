import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getKycBucket } from "@/lib/kyc";
import { isD1ProjectFile, readD1ProjectFile } from "@/lib/project-file-storage";
import {
  canManageProjectDocuments,
  canVisitorAccessProjectDocument,
  isEditableProjectStatus,
  isPublicProjectDocumentKind,
} from "@/lib/project-documents";

interface DocumentAccessRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  companyId: string;
  projectStatus: string;
  type: string;
  storageKey: string | null;
  fileName: string;
  fileUrl: string;
  contentType: string | null;
  size: number | null;
  isPublic: number;
  offerId: string | null;
  offerVisibility: string | null;
}

async function getDocument(database: D1Database, documentId: string) {
  return database
    .prepare(
      `SELECT d.id, d.projectId, d.type, d.storageKey, d.fileName, d.fileUrl,
              d.contentType, d.size, d.isPublic,
              p.companyId, p.status AS projectStatus,
              o.id AS offerId, o.visibility AS offerVisibility
       FROM ProjectDocument d
       JOIN Project p ON p.id = d.projectId
       LEFT JOIN Offer o ON o.projectId = p.id
       WHERE d.id = ? LIMIT 1`
    )
    .bind(documentId)
    .first<DocumentAccessRow>();
}

export async function GET(req: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  const database = getD1();
  const document = await getDocument(database, documentId);
  if (!document || !document.storageKey || !document.contentType) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const distributionFile =
    Boolean(document.isPublic) &&
    (["cover", "gallery"].includes(document.type) || isPublicProjectDocumentKind(document.type));
  const publicDistribution = canVisitorAccessProjectDocument({
    kind: document.type,
    isPublic: document.isPublic,
    projectStatus: document.projectStatus,
    offerVisibility: document.offerVisibility,
  });
  const downloadRequested = new URL(req.url).searchParams.get("download") === "1";
  let actorType = "public";
  let actorId = "anonymous";
  if (publicDistribution) {
    if (downloadRequested) {
      try {
        const session = await requireUser(req);
        actorType = "user";
        actorId = session.userId;
      } catch {
        // Public offer documents remain accessible without an account.
      }
    }
  } else {
    let allowed = false;
    try {
      const session = await requireUser(req);
      const membership = await database
        .prepare(`SELECT id FROM CompanyMember WHERE companyId = ? AND userId = ? LIMIT 1`)
        .bind(document.companyId, session.userId)
        .first<{ id: string }>();
      allowed = Boolean(membership);
      if (!allowed && distributionFile && document.offerVisibility === "restricted" && document.offerId) {
        const invitation = await database
          .prepare(
            `SELECT id FROM PrivateOfferInvitation
             WHERE offerId = ? AND userId = ? AND status = 'accepted' LIMIT 1`
          )
          .bind(document.offerId, session.userId)
          .first<{ id: string }>();
        allowed = Boolean(invitation);
      }
      actorType = "user";
      actorId = session.userId;
    } catch {
      try {
        const admin = await requireAdmin(req);
        allowed = true;
        actorType = "admin";
        actorId = admin.adminId;
      } catch {
        allowed = false;
      }
    }
    if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const bucket = getKycBucket();
  let body: BodyInit;
  if (isD1ProjectFile(document.storageKey)) {
    const stored = await readD1ProjectFile(database, document.id);
    if (!stored) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    body = stored.buffer.slice(stored.byteOffset, stored.byteOffset + stored.byteLength) as ArrayBuffer;
  } else {
    if (!bucket) return NextResponse.json({ error: "Espace documentaire indisponible" }, { status: 503 });
    const object = await bucket.get(document.storageKey);
    if (!object) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    body = object.body;
  }

  if (!publicDistribution || downloadRequested) {
    const now = isoNow();
    await database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, ?, ?, ?, 'ProjectDocument', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        actorType,
        actorId,
        downloadRequested ? "project.document_downloaded" : "project.document_viewed",
        document.id,
        JSON.stringify({ projectId: document.projectId, type: document.type }),
        requestIp(req),
        now
      )
      .run();
  }

  const officeDocument = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
  ].includes(document.contentType);
  const disposition = downloadRequested || officeDocument ? "attachment" : "inline";
  return new Response(body, {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `${disposition}; filename="${document.fileName.replace(/[\r\n\"]/g, "-")}"`,
      "Cache-Control": publicDistribution ? "public, max-age=3600" : "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(req: Request, context: { params: Promise<{ documentId: string }> }) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { documentId } = await context.params;
  const database = getD1();
  const document = await getDocument(database, documentId);
  if (!document) return NextResponse.json({ error: "Pièce introuvable" }, { status: 404 });
  const membership = await database
    .prepare(`SELECT mandate FROM CompanyMember WHERE companyId = ? AND userId = ? LIMIT 1`)
    .bind(document.companyId, session.userId)
    .first<{ mandate: string }>();
  if (!membership || !canManageProjectDocuments(membership.mandate)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (!isEditableProjectStatus(document.projectStatus)) {
    return NextResponse.json({ error: "Ce dossier n'est plus modifiable" }, { status: 409 });
  }
  const bucket = getKycBucket();
  if (document.storageKey && !isD1ProjectFile(document.storageKey)) {
    if (!bucket) return NextResponse.json({ error: "Espace documentaire indisponible" }, { status: 503 });
    await bucket.delete(document.storageKey);
  }
  const now = isoNow();
  const statements: D1PreparedStatement[] = [
    database.prepare(`DELETE FROM ProjectDocument WHERE id = ?`).bind(document.id),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'project.document_deleted', 'ProjectDocument', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        document.id,
        JSON.stringify({ projectId: document.projectId, kind: document.type }),
        requestIp(req),
        now
      ),
  ];
  if (document.type === "cover") {
    statements.push(
      database
        .prepare(`UPDATE Project SET imageUrl = '/images/project-placeholder.svg', updatedAt = ? WHERE id = ?`)
        .bind(now, document.projectId)
    );
  }
  await database.batch(statements);
  return NextResponse.json({ ok: true });
}
