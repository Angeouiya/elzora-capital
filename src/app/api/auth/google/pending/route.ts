import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { COUNTRIES } from "@/lib/countries";
import { GOOGLE_OAUTH_COOKIES } from "@/lib/google-oauth";
import { LEGAL_VERSIONS } from "@/lib/legal";

interface PendingRow {
  id: string;
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  expiresAt: string;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
  const pending = await loadPending(req);
  if (!pending) return NextResponse.json({ error: "GOOGLE_SESSION_EXPIRED" }, { status: 401, headers: noStore });
  return NextResponse.json(
    {
      account: {
        email: pending.email,
        firstName: pending.firstName,
        lastName: pending.lastName,
        locale: pending.locale === "en" ? "en" : "fr",
      },
    },
    { headers: noStore }
  );
}

export async function POST(req: NextRequest) {
  const pending = await loadPending(req);
  if (!pending) return NextResponse.json({ error: "GOOGLE_SESSION_EXPIRED" }, { status: 401, headers: noStore });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400, headers: noStore });
  }

  const firstName = String(body.firstName || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const lastName = String(body.lastName || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const country = String(body.country || "").trim().toUpperCase();
  const language = body.language === "en" ? "en" : "fr";
  const kind = body.kind === "company" ? "company" : "individual";
  if (!firstName || !lastName || !/^[+()\d\s.-]{7,40}$/.test(phone)) {
    return NextResponse.json({ error: "INVALID_CONTACT" }, { status: 400, headers: noStore });
  }
  if (!COUNTRIES.some((entry) => entry.code === country)) {
    return NextResponse.json({ error: "UNSUPPORTED_COUNTRY" }, { status: 400, headers: noStore });
  }
  if (body.acceptedTerms !== true || body.acceptedRisks !== true) {
    return NextResponse.json({ error: "REQUIRED_CONSENTS" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const existing = await database.prepare(`SELECT id FROM User WHERE email = ? LIMIT 1`).bind(pending.email).first();
  if (existing) {
    return NextResponse.json({ error: "ACCOUNT_EXISTS_RESTART" }, { status: 409, headers: noStore });
  }

  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const now = isoNow();
  const ipAddress = requestIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO User
             (id, email, phone, passwordHash, firstName, lastName, country, language, consentMarketing,
              kycStatus, twoFactorEnabled, lastLoginAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'incomplete', 0, ?, ?, ?)`
        )
        .bind(
          userId,
          pending.email,
          phone,
          `external_identity_only:google:${crypto.randomUUID()}`,
          firstName,
          lastName,
          country,
          language,
          body.consentMarketing === true ? 1 : 0,
          now,
          now,
          now
        ),
      database
        .prepare(
          `INSERT INTO ExternalIdentity (id, userId, provider, subject, email, createdAt, lastLoginAt)
           VALUES (?, ?, 'google', ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), userId, pending.subject, pending.email, now, now),
      database
        .prepare(
          `INSERT INTO UserSession (id, userId, deviceInfo, ipAddress, createdAt, lastActiveAt, revoked)
           VALUES (?, ?, ?, ?, ?, ?, 0)`
        )
        .bind(sessionId, userId, userAgent, ipAddress, now, now),
      ...([
        ["terms", LEGAL_VERSIONS.terms],
        ["privacy", LEGAL_VERSIONS.privacy],
        ["risk", LEGAL_VERSIONS.risk],
      ] as const).map(([documentType, version]) =>
        database
          .prepare(
            `INSERT INTO LegalAcceptance
               (id, userId, documentType, version, acceptedAt, ipAddress, userAgent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(crypto.randomUUID(), userId, documentType, version, now, ipAddress, userAgent)
      ),
      database.prepare(`UPDATE ExternalAuthPending SET usedAt = ? WHERE id = ? AND usedAt IS NULL`).bind(now, pending.id),
      database
        .prepare(
          `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'user_registered_google', 'user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          userId,
          userId,
          JSON.stringify({
            provider: "google",
            accountKind: kind,
            termsVersion: LEGAL_VERSIONS.terms,
            privacyVersion: LEGAL_VERSIONS.privacy,
            riskNoticeVersion: LEGAL_VERSIONS.risk,
          }),
          ipAddress,
          now
        ),
    ]);
  } catch (error) {
    console.error("google_registration_failed", error);
    return NextResponse.json({ error: "REGISTER_UNAVAILABLE" }, { status: 503, headers: noStore });
  }

  const response = NextResponse.json(
    { user: { id: userId, email: pending.email, firstName, lastName, country, language } },
    { status: 201, headers: noStore }
  );
  response.cookies.set("x-nexora-token", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set(GOOGLE_OAUTH_COOKIES.pending, "", { path: "/", maxAge: 0 });
  return response;
}

async function loadPending(req: NextRequest): Promise<PendingRow | null> {
  const id = req.cookies.get(GOOGLE_OAUTH_COOKIES.pending)?.value || "";
  if (!id) return null;
  return getD1()
    .prepare(
      `SELECT id, subject, email, firstName, lastName, locale, expiresAt
       FROM ExternalAuthPending
       WHERE id = ? AND provider = 'google' AND usedAt IS NULL AND expiresAt > ? LIMIT 1`
    )
    .bind(id, isoNow())
    .first<PendingRow>();
}
