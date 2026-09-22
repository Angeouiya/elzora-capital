import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { getD1, isoNow, requestIp } from "@/lib/d1";

interface CompanyRow extends Record<string, unknown> {
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
  createdAt: string;
  updatedAt: string;
  membershipRole: string;
  membershipMandate: string;
}

const LEGAL_FORMS = new Set(["EI", "SARL", "SAS", "SA", "SNC", "SCS", "GIE", "COOPERATIVE"]);

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const result = await getD1()
    .prepare(
      `SELECT c.*, m.role AS membershipRole, m.mandate AS membershipMandate
       FROM CompanyMember m JOIN Company c ON c.id = m.companyId
       WHERE m.userId = ? ORDER BY c.legalName ASC`
    )
    .bind(session.userId)
    .all<CompanyRow>();

  return NextResponse.json({ companies: result.results }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const legalName = clean(body.legalName, 160);
  const tradeName = clean(body.tradeName, 120) || null;
  const legalForm = clean(body.legalForm, 30).toUpperCase();
  const country = clean(body.country, 2).toUpperCase();
  const address = clean(body.address, 240);
  const registrationNo = clean(body.registrationNo, 80).toUpperCase();
  const taxId = clean(body.taxId, 80).toUpperCase() || null;
  const activity = clean(body.activity, 240);
  const foundedYear = optionalYear(body.foundedYear);

  if (!legalName || !address || !registrationNo || !activity) {
    return NextResponse.json({ error: "Complétez toutes les informations obligatoires" }, { status: 400 });
  }
  if (!LEGAL_FORMS.has(legalForm)) {
    return NextResponse.json({ error: "Forme juridique non prise en charge" }, { status: 400 });
  }
  if (!COUNTRIES.some((entry) => entry.code === country)) {
    return NextResponse.json({ error: "Pays non pris en charge" }, { status: 400 });
  }
  if (foundedYear === undefined) {
    return NextResponse.json({ error: "Année de création invalide" }, { status: 400 });
  }

  const database = getD1();
  const duplicate = await database
    .prepare(`SELECT id FROM Company WHERE country = ? AND registrationNo = ? LIMIT 1`)
    .bind(country, registrationNo)
    .first<{ id: string }>();
  if (duplicate) {
    return NextResponse.json(
      { error: "Cette entreprise est déjà enregistrée", code: "COMPANY_ALREADY_EXISTS" },
      { status: 409 }
    );
  }

  const companyId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const now = isoNow();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO Company
             (id, legalName, tradeName, legalForm, country, address, registrationNo,
              taxId, activity, foundedYear, verificationStatus, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        )
        .bind(
          companyId,
          legalName,
          tradeName,
          legalForm,
          country,
          address,
          registrationNo,
          taxId,
          activity,
          foundedYear ?? null,
          now,
          now
        ),
      database
        .prepare(
          `INSERT INTO CompanyMember (id, userId, companyId, role, mandate, createdAt)
           VALUES (?, ?, ?, 'legal_representative', 'manage', ?)`
        )
        .bind(membershipId, session.userId, companyId, now),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'company_registered', 'company', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          companyId,
          JSON.stringify({ legalName, country, registrationNo }),
          requestIp(req),
          now
        ),
      database
        .prepare(
          `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'verification', 'Entreprise enregistrée', ?, 0, 'company_dashboard', ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          `Le profil de « ${tradeName || legalName} » est enregistré et attend sa vérification.`,
          now
        ),
    ]);
  } catch (error) {
    const raced = await database
      .prepare(`SELECT id FROM Company WHERE country = ? AND registrationNo = ? LIMIT 1`)
      .bind(country, registrationNo)
      .first<{ id: string }>();
    if (raced) {
      return NextResponse.json({ error: "Cette entreprise est déjà enregistrée" }, { status: 409 });
    }
    console.error("company_registration_failed", error);
    return NextResponse.json({ error: "Enregistrement temporairement indisponible" }, { status: 503 });
  }

  const company = await database
    .prepare(`SELECT * FROM Company WHERE id = ? LIMIT 1`)
    .bind(companyId)
    .first<CompanyRow>();
  return NextResponse.json(
    {
      company,
      membership: { id: membershipId, role: "legal_representative", mandate: "manage" },
      message: "Entreprise enregistrée. La vérification doit être finalisée avant toute soumission.",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function optionalYear(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const year = Number(value);
  const currentYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < 1800 || year > currentYear) return undefined;
  return year;
}
