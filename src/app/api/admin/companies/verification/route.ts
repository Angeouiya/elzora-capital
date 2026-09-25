import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  canDecideCompanyVerification,
  canReadCompanyVerification,
} from "@/lib/company-verification";

interface CompanyCaseRow extends Record<string, unknown> {
  id: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  country: string;
  address: string;
  registrationNo: string;
  taxId: string | null;
  activity: string;
  foundedYear: number | null;
  verificationStatus: string;
  verificationSubmittedAt: string | null;
  verificationReason: string | null;
  verifiedAt: string | null;
  registrationConfirmed: number | null;
  ownershipConfirmed: number | null;
  actingForCompany: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decidedBy: string | null;
  decisionReason: string | null;
}

interface OwnerRow extends Record<string, unknown> {
  id: string;
  companyId: string;
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
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canReadCompanyVerification(admin)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  }

  const companyId = req.nextUrl.searchParams.get("companyId")?.trim();
  if (!companyId) return NextResponse.json({ error: "Entreprise requise" }, { status: 400, headers: noStore });
  const database = getD1();
  const company = await database
    .prepare(
      `SELECT c.id, c.legalName, c.tradeName, c.legalForm, c.country, c.address,
              c.registrationNo, c.taxId, c.activity, c.foundedYear,
              c.verificationStatus, c.verificationSubmittedAt, c.verificationReason,
              c.verifiedAt, vp.registrationConfirmed, vp.ownershipConfirmed,
              vp.actingForCompany, vp.submittedAt, vp.reviewedAt, vp.reviewedBy,
              vp.decidedBy, vp.decisionReason
       FROM Company c
       LEFT JOIN CompanyVerificationProfile vp ON vp.companyId = c.id
       WHERE c.id = ? LIMIT 1`
    )
    .bind(companyId)
    .first<CompanyCaseRow>();
  if (!company) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404, headers: noStore });

  const [owners, representatives] = await Promise.all([
    database
      .prepare(
        `SELECT id, companyId, fullName, birthDate, nationality, residenceCountry,
                ownershipPct, controlsByOtherMeans, politicallyExposed
         FROM CompanyBeneficialOwner WHERE companyId = ? ORDER BY createdAt ASC`
      )
      .bind(companyId)
      .all<OwnerRow>(),
    database
      .prepare(
        `SELECT u.id, u.firstName, u.lastName, u.email, m.role, m.mandate
         FROM CompanyMember m JOIN User u ON u.id = m.userId
         WHERE m.companyId = ? ORDER BY m.createdAt ASC`
      )
      .bind(companyId)
      .all<Record<string, unknown>>(),
  ]);

  return NextResponse.json(
    {
      canDecide: canDecideCompanyVerification(admin),
      company: {
        ...company,
        registrationConfirmed: Boolean(company.registrationConfirmed),
        ownershipConfirmed: Boolean(company.ownershipConfirmed),
        actingForCompany: Boolean(company.actingForCompany),
        owners: owners.results.map((owner) => ({
          ...owner,
          ownershipPct: Number(owner.ownershipPct),
          controlsByOtherMeans: Boolean(owner.controlsByOtherMeans),
          politicallyExposed: Boolean(owner.politicallyExposed),
        })),
        representatives: representatives.results,
      },
    },
    { headers: noStore }
  );
}

export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  if (!canDecideCompanyVerification(admin)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403, headers: noStore });
  }

  const body = (await req.json().catch(() => null)) as { companyId?: string; action?: string; reason?: string } | null;
  const companyId = body?.companyId?.trim();
  const action = body?.action?.trim();
  const reason = body?.reason?.trim() ?? "";
  if (!companyId || !["review", "approve", "reject", "refresh"].includes(action ?? "")) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400, headers: noStore });
  }
  if (["reject", "refresh"].includes(action!) && reason.length < 8) {
    return NextResponse.json({ error: "Précisez un motif d’au moins 8 caractères" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const current = await database
    .prepare(
      `SELECT c.verificationStatus, c.legalName, c.tradeName, vp.reviewedBy,
              vp.registrationConfirmed, vp.ownershipConfirmed, vp.actingForCompany,
              (SELECT COUNT(*) FROM CompanyBeneficialOwner bo WHERE bo.companyId = c.id) AS ownerCount
       FROM Company c
       LEFT JOIN CompanyVerificationProfile vp ON vp.companyId = c.id
       WHERE c.id = ? LIMIT 1`
    )
    .bind(companyId)
    .first<{
      verificationStatus: string;
      legalName: string;
      tradeName: string | null;
      reviewedBy: string | null;
      registrationConfirmed: number | null;
      ownershipConfirmed: number | null;
      actingForCompany: number | null;
      ownerCount: number;
    }>();
  if (!current) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404, headers: noStore });
  if (action === "review" && current.verificationStatus !== "pending") {
    return NextResponse.json({ error: "Ce dossier ne peut plus être pris en revue" }, { status: 409, headers: noStore });
  }
  if (action !== "review" && current.verificationStatus !== "review") {
    return NextResponse.json({ error: "Le dossier doit d’abord être placé en revue" }, { status: 409, headers: noStore });
  }
  if (action !== "review" && current.reviewedBy === admin.adminId) {
    return NextResponse.json(
      { error: "La décision finale doit être rendue par un second responsable habilité." },
      { status: 409, headers: noStore }
    );
  }
  if (
    action === "approve" &&
    (!current.registrationConfirmed || !current.ownershipConfirmed || !current.actingForCompany || Number(current.ownerCount) < 1)
  ) {
    return NextResponse.json({ error: "La déclaration de propriété est incomplète." }, { status: 409, headers: noStore });
  }

  const now = isoNow();
  const nextStatus = action === "review" ? "review" : action === "approve" ? "verified" : action === "reject" ? "rejected" : "refresh";
  const companyName = current.tradeName || current.legalName;
  const title = action === "approve" ? "Entreprise vérifiée" : action === "review" ? "Vérification en cours" : "Mise à jour demandée";
  const message = action === "approve"
    ? `« ${companyName} » est vérifiée. Vous pouvez désormais transmettre un dossier de financement.`
    : action === "review"
      ? `La déclaration de « ${companyName} » est en cours d’examen.`
      : `Mettez à jour la déclaration de « ${companyName} » : ${reason}`;
  const memberRows = await database
    .prepare(`SELECT userId FROM CompanyMember WHERE companyId = ?`)
    .bind(companyId)
    .all<{ userId: string }>();

  const statements = action === "review"
    ? [
        database.prepare(`UPDATE Company SET verificationStatus = 'review', updatedAt = ? WHERE id = ?`).bind(now, companyId),
        database
          .prepare(`UPDATE CompanyVerificationProfile SET reviewedAt = ?, reviewedBy = ?, decisionReason = NULL, updatedAt = ? WHERE companyId = ?`)
          .bind(now, admin.adminId, now, companyId),
      ]
    : [
        database
          .prepare(
            `UPDATE Company SET verificationStatus = ?, verifiedAt = ?, verificationReason = ?, updatedAt = ? WHERE id = ?`
          )
          .bind(nextStatus, action === "approve" ? now : null, action === "approve" ? null : reason, now, companyId),
        database
          .prepare(`UPDATE CompanyVerificationProfile SET decidedBy = ?, decisionReason = ?, updatedAt = ? WHERE companyId = ?`)
          .bind(admin.adminId, action === "approve" ? reason || "Conforme" : reason, now, companyId),
      ];

  statements.push(
    database
      .prepare(
        `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'admin', ?, ?, 'Company', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        `company_verification.${action}`,
        companyId,
        JSON.stringify({ from: current.verificationStatus, to: nextStatus, reason: reason || null }),
        requestIp(req),
        now
      ),
    ...memberRows.results.map((member) =>
      database
        .prepare(
          `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'verification', ?, ?, 0, 'company_dashboard', ?)`
        )
        .bind(crypto.randomUUID(), member.userId, title, message, now)
    )
  );
  await database.batch(statements);
  return NextResponse.json({ ok: true, status: nextStatus }, { headers: noStore });
}
