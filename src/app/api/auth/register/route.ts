import { NextRequest, NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/countries";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { hashPassword } from "@/lib/password";
import { LEGAL_VERSIONS } from "@/lib/legal";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const firstName = String(body.firstName || "").trim().slice(0, 80);
  const lastName = String(body.lastName || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const password = String(body.password || "");
  const country = String(body.country || "").toUpperCase();
  const language = body.language === "en" ? "en" : "fr";
  const acceptedTerms = body.acceptedTerms === true;
  const acceptedRisks = body.acceptedRisks === true;

  if (!EMAIL_PATTERN.test(email) || !firstName || !lastName || !phone) {
    return NextResponse.json({ code: "INVALID_CONTACT" }, { status: 400 });
  }
  if (password.length < 10 || password.length > 200) {
    return NextResponse.json({ code: "INVALID_PASSWORD" }, { status: 400 });
  }
  if (!COUNTRIES.some((entry) => entry.code === country)) {
    return NextResponse.json({ code: "UNSUPPORTED_COUNTRY" }, { status: 400 });
  }
  if (!acceptedTerms || !acceptedRisks) {
    return NextResponse.json({ code: "REQUIRED_CONSENTS" }, { status: 400 });
  }

  try {
    const database = getD1();
    const exists = await database.prepare(`SELECT id FROM User WHERE email = ? LIMIT 1`).bind(email).first();
    if (exists) return NextResponse.json({ code: "EMAIL_EXISTS" }, { status: 409 });

    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const now = isoNow();
    const ipAddress = requestIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const passwordHash = await hashPassword(password);
    await database.batch([
      database
        .prepare(
          `INSERT INTO User
            (id, email, phone, passwordHash, firstName, lastName, country, language, consentMarketing,
             kycStatus, twoFactorEnabled, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'incomplete', 0, ?, ?)`
        )
        .bind(
          userId,
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          country,
          language,
          body.consentMarketing === true ? 1 : 0,
          now,
          now
        ),
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
      database
        .prepare(
          `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'user_registered', 'user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          userId,
          userId,
          JSON.stringify({
            acceptedTerms: now,
            acceptedRisks: now,
            termsVersion: LEGAL_VERSIONS.terms,
            privacyVersion: LEGAL_VERSIONS.privacy,
            riskNoticeVersion: LEGAL_VERSIONS.risk,
            accountKind: body.kind,
          }),
          ipAddress,
          now
        ),
    ]);

    const response = NextResponse.json(
      { user: { id: userId, email, firstName, lastName, country, language, kycStatus: "incomplete" } },
      { status: 201 }
    );
    response.cookies.set("x-nexora-token", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("auth_register_failed", error);
    return NextResponse.json({ code: "REGISTER_UNAVAILABLE" }, { status: 503 });
  }
}
