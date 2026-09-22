import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  KYC_IDENTITY_TYPES,
  KYC_SOURCES_OF_FUNDS,
  cleanIdentityNumber,
  getKycBucket,
  hashIdentityNumber,
  hasValidMagic,
  isKycSubmissionStatus,
  safeFileName,
  sha256Hex,
  validateKycFile,
  type KycDocumentKind,
} from "@/lib/kyc";

interface UserKycRow extends Record<string, unknown> {
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycRejectionReason: string | null;
}

interface KycProfileRow extends Record<string, unknown> {
  identityType: string;
  identityNumberLast4: string;
  documentCountry: string;
  expiresAt: string | null;
  residentialAddress: string;
  city: string;
  occupation: string;
  sourceOfFunds: string;
  politicallyExposed: number;
  actingForSelf: number;
  submittedAt: string | null;
  decisionReason: string | null;
}

interface KycDocumentRow extends Record<string, unknown> {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

const noStore = { "Cache-Control": "private, no-store" };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function file(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const database = getD1();
  const [user, profile, documents] = await Promise.all([
    database
      .prepare(`SELECT kycStatus, kycSubmittedAt, kycVerifiedAt, kycRejectionReason FROM User WHERE id = ? LIMIT 1`)
      .bind(session.userId)
      .first<UserKycRow>(),
    database
      .prepare(
        `SELECT identityType, identityNumberLast4, documentCountry, expiresAt,
                residentialAddress, city, occupation, sourceOfFunds,
                politicallyExposed, actingForSelf, decisionReason
         FROM KycProfile WHERE userId = ? LIMIT 1`
      )
      .bind(session.userId)
      .first<KycProfileRow>(),
    database
      .prepare(
        `SELECT id, kind, fileName, contentType, size, uploadedAt
         FROM KycDocument WHERE userId = ? AND status = 'active' ORDER BY uploadedAt DESC`
      )
      .bind(session.userId)
      .all<KycDocumentRow>(),
  ]);

  return NextResponse.json(
    {
      status: user?.kycStatus ?? "incomplete",
      submittedAt: user?.kycSubmittedAt ?? null,
      verifiedAt: user?.kycVerifiedAt ?? null,
      reason: user?.kycRejectionReason ?? profile?.decisionReason ?? null,
      profile: profile
        ? {
            ...profile,
            identityNumber: `•••• ${profile.identityNumberLast4}`,
            politicallyExposed: Boolean(profile.politicallyExposed),
            actingForSelf: Boolean(profile.actingForSelf),
            identityNumberLast4: undefined,
          }
        : null,
      documents: documents.results,
    },
    { headers: noStore }
  );
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const bucket = getKycBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "Le coffre documentaire est en cours d’activation. Réessayez prochainement." },
      { status: 503, headers: noStore }
    );
  }

  const database = getD1();
  const user = await database
    .prepare(`SELECT kycStatus FROM User WHERE id = ? LIMIT 1`)
    .bind(session.userId)
    .first<UserKycRow>();
  if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 404, headers: noStore });
  if (!isKycSubmissionStatus(user.kycStatus)) {
    return NextResponse.json(
      { error: user.kycStatus === "verified" ? "Votre identité est déjà vérifiée." : "Votre dossier est déjà en cours d’examen." },
      { status: 409, headers: noStore }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire illisible" }, { status: 400, headers: noStore });
  }

  const identityType = text(form, "identityType");
  const identityNumber = cleanIdentityNumber(text(form, "identityNumber"));
  const documentCountry = text(form, "documentCountry").toUpperCase();
  const expiresAt = text(form, "expiresAt") || null;
  const residentialAddress = text(form, "residentialAddress");
  const city = text(form, "city");
  const occupation = text(form, "occupation");
  const sourceOfFunds = text(form, "sourceOfFunds");
  const politicallyExposed = text(form, "politicallyExposed") === "true";
  const actingForSelf = text(form, "actingForSelf") === "true";
  const consent = text(form, "consent") === "true";

  if (!KYC_IDENTITY_TYPES.includes(identityType as (typeof KYC_IDENTITY_TYPES)[number])) {
    return NextResponse.json({ error: "Type de pièce invalide" }, { status: 400, headers: noStore });
  }
  if (identityNumber.length < 4 || identityNumber.length > 64) {
    return NextResponse.json({ error: "Numéro de pièce invalide" }, { status: 400, headers: noStore });
  }
  if (!/^[A-Z]{2}$/.test(documentCountry) || !residentialAddress || !city || !occupation) {
    return NextResponse.json({ error: "Complétez vos informations personnelles" }, { status: 400, headers: noStore });
  }
  if (!KYC_SOURCES_OF_FUNDS.includes(sourceOfFunds as (typeof KYC_SOURCES_OF_FUNDS)[number])) {
    return NextResponse.json({ error: "Origine des fonds invalide" }, { status: 400, headers: noStore });
  }
  if (!actingForSelf || !consent) {
    return NextResponse.json({ error: "Les déclarations obligatoires doivent être acceptées" }, { status: 400, headers: noStore });
  }

  const submittedFiles: Array<{ kind: KycDocumentKind; value: File | null }> = [
    { kind: "identity_front", value: file(form, "identityFront") },
    { kind: "identity_back", value: file(form, "identityBack") },
    { kind: "proof_address", value: file(form, "proofAddress") },
  ];
  if (!submittedFiles[0].value || !submittedFiles[2].value || (identityType !== "passport" && !submittedFiles[1].value)) {
    return NextResponse.json({ error: "Ajoutez tous les justificatifs requis" }, { status: 400, headers: noStore });
  }

  const prepared: Array<{
    id: string;
    kind: KycDocumentKind;
    storageKey: string;
    fileName: string;
    contentType: string;
    size: number;
    checksum: string;
    buffer: ArrayBuffer;
  }> = [];
  for (const entry of submittedFiles) {
    if (!entry.value) continue;
    const validationError = validateKycFile(entry.value);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400, headers: noStore });
    const buffer = await entry.value.arrayBuffer();
    if (!hasValidMagic(new Uint8Array(buffer.slice(0, 16)), entry.value.type)) {
      return NextResponse.json({ error: `Le contenu de ${entry.value.name} ne correspond pas à son format.` }, { status: 400, headers: noStore });
    }
    const id = crypto.randomUUID();
    prepared.push({
      id,
      kind: entry.kind,
      storageKey: `kyc/${session.userId}/${id}-${safeFileName(entry.value.name)}`,
      fileName: safeFileName(entry.value.name),
      contentType: entry.value.type,
      size: entry.value.size,
      checksum: await sha256Hex(buffer),
      buffer,
    });
  }

  const uploadedKeys: string[] = [];
  try {
    for (const document of prepared) {
      await bucket.put(document.storageKey, document.buffer, {
        httpMetadata: { contentType: document.contentType },
        customMetadata: { userId: session.userId, kind: document.kind, checksum: document.checksum },
      });
      uploadedKeys.push(document.storageKey);
    }

    const now = isoNow();
    const profileId = crypto.randomUUID();
    const statements = [
      database.prepare(`UPDATE KycDocument SET status = 'superseded' WHERE userId = ? AND status = 'active'`).bind(session.userId),
      database
        .prepare(
          `INSERT INTO KycProfile
             (id, userId, identityType, identityNumberHash, identityNumberLast4,
              documentCountry, expiresAt, residentialAddress, city, occupation,
              sourceOfFunds, politicallyExposed, actingForSelf, consentAt,
              reviewedAt, reviewedBy, decidedBy, decisionReason, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, NULL, NULL, NULL, ?, ?)
           ON CONFLICT(userId) DO UPDATE SET
             identityType = excluded.identityType,
             identityNumberHash = excluded.identityNumberHash,
             identityNumberLast4 = excluded.identityNumberLast4,
             documentCountry = excluded.documentCountry,
             expiresAt = excluded.expiresAt,
             residentialAddress = excluded.residentialAddress,
             city = excluded.city,
             occupation = excluded.occupation,
             sourceOfFunds = excluded.sourceOfFunds,
             politicallyExposed = excluded.politicallyExposed,
             actingForSelf = 1,
             consentAt = excluded.consentAt,
             reviewedAt = NULL,
             reviewedBy = NULL,
             decidedBy = NULL,
             decisionReason = NULL,
             updatedAt = excluded.updatedAt`
        )
        .bind(
          profileId,
          session.userId,
          identityType,
          await hashIdentityNumber(session.userId, identityNumber),
          identityNumber.slice(-4),
          documentCountry,
          expiresAt,
          residentialAddress,
          city,
          occupation,
          sourceOfFunds,
          politicallyExposed ? 1 : 0,
          now,
          now,
          now
        ),
      ...prepared.map((document) =>
        database
          .prepare(
            `INSERT INTO KycDocument
               (id, userId, kind, storageKey, fileName, contentType, size, checksum, status, uploadedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
          )
          .bind(
            document.id,
            session.userId,
            document.kind,
            document.storageKey,
            document.fileName,
            document.contentType,
            document.size,
            document.checksum,
            now
          )
      ),
      database
        .prepare(
          `UPDATE User SET kycStatus = 'pending', kycSubmittedAt = ?, kycVerifiedAt = NULL,
                           kycRejectionReason = NULL, updatedAt = ? WHERE id = ?`
        )
        .bind(now, now, session.userId),
      database
        .prepare(
          `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'kyc.submitted', 'User', ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), session.userId, session.userId, JSON.stringify({ documentCount: prepared.length }), requestIp(req), now),
      database
        .prepare(
          `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'verification', 'Dossier d’identité reçu',
                   'Votre dossier est transmis à notre équipe conformité. Vous serez informé de la décision.', 0, 'portfolio', ?)`
        )
        .bind(crypto.randomUUID(), session.userId, now),
    ];
    await database.batch(statements);
    return NextResponse.json({ ok: true, status: "pending" }, { status: 201, headers: noStore });
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => bucket.delete(key).catch(() => undefined)));
    console.error("KYC submission failed", error);
    return NextResponse.json({ error: "Le dossier n’a pas pu être enregistré" }, { status: 500, headers: noStore });
  }
}
