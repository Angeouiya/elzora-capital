import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  canSubmitCompanyVerification,
  validateCompanyVerificationInput,
} from "@/lib/company-verification";

interface MembershipRow extends Record<string, unknown> {
  companyId: string;
  mandate: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  country: string;
  address: string;
  registrationNo: string;
  taxId: string | null;
  verificationStatus: string;
  verificationSubmittedAt: string | null;
  verificationReason: string | null;
  verifiedAt: string | null;
  profileId: string | null;
  registrationConfirmed: number | null;
  ownershipConfirmed: number | null;
  actingForCompany: number | null;
  submittedAt: string | null;
}

interface OwnerRow extends Record<string, unknown> {
  id: string;
  fullName: string;
  birthDate: string;
  nationality: string;
  residenceCountry: string;
  ownershipPct: number;
  controlsByOtherMeans: number;
  politicallyExposed: number;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const companyId = req.nextUrl.searchParams.get("companyId")?.trim();
  if (!companyId) return NextResponse.json({ error: "Entreprise requise" }, { status: 400, headers: noStore });

  const membership = await findMembership(session.userId, companyId);
  if (!membership) return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });

  const owners = await getD1()
    .prepare(
      `SELECT id, fullName, birthDate, nationality, residenceCountry, ownershipPct,
              controlsByOtherMeans, politicallyExposed
       FROM CompanyBeneficialOwner WHERE companyId = ? ORDER BY createdAt ASC`
    )
    .bind(companyId)
    .all<OwnerRow>();

  return NextResponse.json(
    {
      company: normalizeMembership(membership),
      canSubmit: canSubmitCompanyVerification(membership.mandate),
      profile: membership.profileId
        ? {
            registrationConfirmed: Boolean(membership.registrationConfirmed),
            ownershipConfirmed: Boolean(membership.ownershipConfirmed),
            actingForCompany: Boolean(membership.actingForCompany),
            submittedAt: membership.submittedAt,
          }
        : null,
      owners: owners.results.map(normalizeOwner),
    },
    { headers: noStore }
  );
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const body = (await req.json().catch(() => null)) as (Record<string, unknown> & { companyId?: string }) | null;
  const companyId = body?.companyId?.trim();
  if (!companyId) return NextResponse.json({ error: "Entreprise requise" }, { status: 400, headers: noStore });

  const membership = await findMembership(session.userId, companyId);
  if (!membership || !canSubmitCompanyVerification(membership.mandate)) {
    return NextResponse.json({ error: "Vous n’êtes pas habilité à transmettre cette déclaration." }, { status: 403, headers: noStore });
  }
  const editable = ["incomplete", "rejected", "refresh"].includes(membership.verificationStatus) ||
    (membership.verificationStatus === "pending" && !membership.profileId);
  if (!editable) {
    return NextResponse.json(
      { error: membership.verificationStatus === "verified" ? "Cette entreprise est déjà vérifiée." : "Ce dossier est déjà en cours d’examen." },
      { status: 409, headers: noStore }
    );
  }

  const validation = validateCompanyVerificationInput(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.code === "DECLARATIONS_REQUIRED"
          ? "Confirmez les trois déclarations avant l’envoi."
          : "Renseignez chaque personne qui possède plus de 25 % ou contrôle l’entreprise.",
        code: validation.code,
      },
      { status: 422, headers: noStore }
    );
  }

  const database = getD1();
  const now = isoNow();
  const profileId = crypto.randomUUID();
  const statements = [
    database.prepare(`DELETE FROM CompanyBeneficialOwner WHERE companyId = ?`).bind(companyId),
    database
      .prepare(
        `INSERT INTO CompanyVerificationProfile
           (id, companyId, registrationConfirmed, ownershipConfirmed, actingForCompany,
            submittedAt, reviewedAt, reviewedBy, decidedBy, decisionReason, createdAt, updatedAt)
         VALUES (?, ?, 1, 1, 1, ?, NULL, NULL, NULL, NULL, ?, ?)
         ON CONFLICT(companyId) DO UPDATE SET
           registrationConfirmed = 1,
           ownershipConfirmed = 1,
           actingForCompany = 1,
           submittedAt = excluded.submittedAt,
           reviewedAt = NULL,
           reviewedBy = NULL,
           decidedBy = NULL,
           decisionReason = NULL,
           updatedAt = excluded.updatedAt`
      )
      .bind(profileId, companyId, now, now, now),
    ...validation.value.owners.map((owner) =>
      database
        .prepare(
          `INSERT INTO CompanyBeneficialOwner
             (id, companyId, fullName, birthDate, nationality, residenceCountry,
              ownershipPct, controlsByOtherMeans, politicallyExposed, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          companyId,
          owner.fullName,
          owner.birthDate,
          owner.nationality,
          owner.residenceCountry,
          owner.ownershipPct,
          owner.controlsByOtherMeans ? 1 : 0,
          owner.politicallyExposed ? 1 : 0,
          now,
          now
        )
    ),
    database
      .prepare(
        `UPDATE Company
         SET verificationStatus = 'pending', verificationSubmittedAt = ?,
             verificationReason = NULL, verifiedAt = NULL, updatedAt = ?
         WHERE id = ?`
      )
      .bind(now, now, companyId),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'company_verification.submitted', 'Company', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        companyId,
        JSON.stringify({
          ownerCount: validation.value.owners.length,
          politicallyExposedCount: validation.value.owners.filter((owner) => owner.politicallyExposed).length,
        }),
        requestIp(req),
        now
      ),
    database
      .prepare(
        `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
         VALUES (?, ?, 'verification', 'Déclaration de l’entreprise reçue', ?, 0, 'company_dashboard', ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        `La déclaration de « ${membership.tradeName || membership.legalName} » est transmise pour vérification.`,
        now
      ),
  ];

  await database.batch(statements);
  return NextResponse.json({ ok: true, status: "pending" }, { status: 201, headers: noStore });
}

async function findMembership(userId: string, companyId: string) {
  return getD1()
    .prepare(
      `SELECT c.id AS companyId, m.mandate, c.legalName, c.tradeName, c.legalForm,
              c.country, c.address, c.registrationNo, c.taxId, c.verificationStatus,
              c.verificationSubmittedAt, c.verificationReason, c.verifiedAt,
              vp.id AS profileId, vp.registrationConfirmed, vp.ownershipConfirmed,
              vp.actingForCompany, vp.submittedAt
       FROM CompanyMember m
       JOIN Company c ON c.id = m.companyId
       LEFT JOIN CompanyVerificationProfile vp ON vp.companyId = c.id
       WHERE m.userId = ? AND c.id = ? LIMIT 1`
    )
    .bind(userId, companyId)
    .first<MembershipRow>();
}

function normalizeMembership(row: MembershipRow) {
  return {
    id: row.companyId,
    legalName: row.legalName,
    tradeName: row.tradeName,
    legalForm: row.legalForm,
    country: row.country,
    address: row.address,
    registrationNo: row.registrationNo,
    taxId: row.taxId,
    verificationStatus: row.verificationStatus,
    verificationSubmittedAt: row.verificationSubmittedAt,
    verificationReason: row.verificationReason,
    verifiedAt: row.verifiedAt,
  };
}

function normalizeOwner(row: OwnerRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    birthDate: row.birthDate,
    nationality: row.nationality,
    residenceCountry: row.residenceCountry,
    ownershipPct: Number(row.ownershipPct),
    controlsByOtherMeans: Boolean(row.controlsByOtherMeans),
    politicallyExposed: Boolean(row.politicallyExposed),
  };
}
