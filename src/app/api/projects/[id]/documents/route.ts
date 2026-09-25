import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getKycBucket, safeFileName, sha256Hex } from "@/lib/kyc";
import {
  PROJECT_DOCUMENT_KINDS,
  canManageProjectDocuments,
  hasValidProjectFileMagic,
  isEditableProjectStatus,
  validateProjectFile,
  type ProjectDocumentKind,
} from "@/lib/project-documents";

interface ProjectAccessRow extends Record<string, unknown> {
  id: string;
  companyId: string;
  status: string;
  mandate: string;
}

interface DocumentRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  storageKey: string | null;
  contentType: string | null;
  size: number | null;
  isPublic: number;
  uploadedAt: string;
}

const noStore = { "Cache-Control": "private, no-store" };

async function projectAccess(database: D1Database, projectId: string, userId: string) {
  return database
    .prepare(
      `SELECT p.id, p.companyId, p.status, m.mandate
       FROM Project p
       JOIN CompanyMember m ON m.companyId = p.companyId
       WHERE p.id = ? AND m.userId = ? LIMIT 1`
    )
    .bind(projectId, userId)
    .first<ProjectAccessRow>();
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  const { id } = await context.params;
  const database = getD1();
  const access = await projectAccess(database, id, session.userId);
  if (!access) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  const result = await database
    .prepare(
      `SELECT id, projectId, type, fileName, fileUrl, storageKey, contentType,
              size, isPublic, uploadedAt
       FROM ProjectDocument WHERE projectId = ? ORDER BY uploadedAt DESC`
    )
    .bind(id)
    .all<DocumentRow>();
  return NextResponse.json(
    {
      documents: result.results.map((document) => ({
        ...document,
        size: document.size == null ? null : Number(document.size),
        isPublic: Boolean(document.isPublic),
      })),
    },
    { headers: noStore }
  );
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  const { id: projectId } = await context.params;
  const database = getD1();
  const access = await projectAccess(database, projectId, session.userId);
  if (!access) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  if (!canManageProjectDocuments(access.mandate)) {
    return NextResponse.json({ error: "Votre autorisation ne permet pas d'ajouter des pièces" }, { status: 403, headers: noStore });
  }
  if (!isEditableProjectStatus(access.status)) {
    return NextResponse.json({ error: "Ce dossier n'est plus modifiable" }, { status: 409, headers: noStore });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Fichier illisible" }, { status: 400, headers: noStore });
  }
  const kindValue = form.get("kind");
  const kind = typeof kindValue === "string" ? kindValue : "";
  if (!PROJECT_DOCUMENT_KINDS.includes(kind as ProjectDocumentKind)) {
    return NextResponse.json({ error: "Catégorie de pièce invalide" }, { status: 400, headers: noStore });
  }
  const fileValue = form.get("file");
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "Sélectionnez un fichier" }, { status: 400, headers: noStore });
  }
  const validationError = validateProjectFile(fileValue, kind as ProjectDocumentKind);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400, headers: noStore });

  const bucket = getKycBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "L'espace sécurisé des pièces est en cours d'activation." },
      { status: 503, headers: noStore }
    );
  }

  const buffer = await fileValue.arrayBuffer();
  if (!hasValidProjectFileMagic(new Uint8Array(buffer.slice(0, 16)), fileValue.type)) {
    return NextResponse.json(
      { error: "Le contenu du fichier ne correspond pas à son format." },
      { status: 400, headers: noStore }
    );
  }
  const documentId = crypto.randomUUID();
  const fileName = safeFileName(fileValue.name);
  const storageKey = `projects/${projectId}/${documentId}-${fileName}`;
  const checksum = await sha256Hex(buffer);
  const fileUrl = `/api/projects/documents/${documentId}`;
  const now = isoNow();

  const replaceExisting = kind !== "other";
  const previous = replaceExisting
    ? await database
        .prepare(`SELECT id, storageKey FROM ProjectDocument WHERE projectId = ? AND type = ?`)
        .bind(projectId, kind)
        .all<{ id: string; storageKey: string | null }>()
    : { results: [] as Array<{ id: string; storageKey: string | null }> };

  try {
    await bucket.put(storageKey, buffer, {
      httpMetadata: { contentType: fileValue.type },
      customMetadata: { projectId, kind, checksum },
    });
    const statements: D1PreparedStatement[] = [];
    if (replaceExisting) {
      statements.push(
        database.prepare(`DELETE FROM ProjectDocument WHERE projectId = ? AND type = ?`).bind(projectId, kind)
      );
    }
    statements.push(
      database
        .prepare(
          `INSERT INTO ProjectDocument
             (id, projectId, type, fileName, fileUrl, storageKey, contentType,
              size, checksum, isPublic, uploadedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          documentId,
          projectId,
          kind,
          fileName,
          fileUrl,
          storageKey,
          fileValue.type,
          fileValue.size,
          checksum,
          kind === "cover" ? 1 : 0,
          now
        ),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'project.document_uploaded', 'ProjectDocument', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          documentId,
          JSON.stringify({ projectId, kind, size: fileValue.size }),
          requestIp(req),
          now
        )
    );
    if (kind === "cover") {
      statements.push(
        database.prepare(`UPDATE Project SET imageUrl = ?, updatedAt = ? WHERE id = ?`).bind(fileUrl, now, projectId)
      );
    }
    await database.batch(statements);
  } catch (error) {
    await bucket.delete(storageKey).catch(() => undefined);
    console.error("project_document_upload_failed", error);
    return NextResponse.json({ error: "Le fichier n'a pas pu être enregistré" }, { status: 500, headers: noStore });
  }

  await Promise.all(
    previous.results
      .filter((document) => document.storageKey && document.storageKey !== storageKey)
      .map((document) => bucket.delete(document.storageKey!).catch(() => undefined))
  );

  return NextResponse.json(
    {
      document: {
        id: documentId,
        projectId,
        type: kind,
        fileName,
        fileUrl,
        contentType: fileValue.type,
        size: fileValue.size,
        isPublic: kind === "cover",
        uploadedAt: now,
      },
      coverUrl: kind === "cover" ? fileUrl : null,
    },
    { status: 201, headers: noStore }
  );
}
