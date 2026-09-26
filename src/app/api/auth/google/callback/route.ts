import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  constantTimeEqual,
  exchangeGoogleAuthorizationCode,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_COOKIES,
  GOOGLE_PENDING_MAX_AGE_SECONDS,
} from "@/lib/google-oauth";

interface IdentityRow {
  userId: string;
  email: string;
}

interface UserRow {
  id: string;
  email: string;
}

export async function GET(req: NextRequest) {
  const config = getGoogleOAuthConfig(req.url);
  const locale = req.cookies.get(GOOGLE_OAUTH_COOKIES.locale)?.value === "en" ? "en" : "fr";
  const oauthError = req.nextUrl.searchParams.get("error");
  if (!config) return oauthRedirect(req, null, "google_unavailable", locale);
  if (oauthError) return oauthRedirect(req, config.appOrigin, "google_cancelled", locale);

  const code = req.nextUrl.searchParams.get("code") || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const expectedState = req.cookies.get(GOOGLE_OAUTH_COOKIES.state)?.value || "";
  const expectedNonce = req.cookies.get(GOOGLE_OAUTH_COOKIES.nonce)?.value || "";
  const codeVerifier = req.cookies.get(GOOGLE_OAUTH_COOKIES.verifier)?.value || "";
  if (!code || !expectedState || !expectedNonce || !codeVerifier || !constantTimeEqual(returnedState, expectedState)) {
    return oauthRedirect(req, config.appOrigin, "google_invalid", locale);
  }

  try {
    const profile = await exchangeGoogleAuthorizationCode({
      config,
      code,
      codeVerifier,
      expectedNonce,
    });
    const database = getD1();
    const now = isoNow();
    const identity = await database
      .prepare(
        `SELECT i.userId, u.email
         FROM ExternalIdentity i JOIN User u ON u.id = i.userId
         WHERE i.provider = 'google' AND i.subject = ? LIMIT 1`
      )
      .bind(profile.subject)
      .first<IdentityRow>();

    const existingUser = identity
      ? { id: identity.userId, email: identity.email }
      : await database
          .prepare(`SELECT id, email FROM User WHERE email = ? LIMIT 1`)
          .bind(profile.email)
          .first<UserRow>();

    if (existingUser) {
      const sessionId = crypto.randomUUID();
      const statements = [
        identity
          ? database
              .prepare(`UPDATE ExternalIdentity SET email = ?, lastLoginAt = ? WHERE provider = 'google' AND subject = ?`)
              .bind(profile.email, now, profile.subject)
          : database
              .prepare(
                `INSERT INTO ExternalIdentity (id, userId, provider, subject, email, createdAt, lastLoginAt)
                 VALUES (?, ?, 'google', ?, ?, ?, ?)`
              )
              .bind(crypto.randomUUID(), existingUser.id, profile.subject, profile.email, now, now),
        database
          .prepare(
            `INSERT INTO UserSession (id, userId, deviceInfo, ipAddress, createdAt, lastActiveAt, revoked)
             VALUES (?, ?, ?, ?, ?, ?, 0)`
          )
          .bind(sessionId, existingUser.id, req.headers.get("user-agent") || "unknown", requestIp(req), now, now),
        database.prepare(`UPDATE User SET lastLoginAt = ?, updatedAt = ? WHERE id = ?`).bind(now, now, existingUser.id),
        database
          .prepare(
            `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
             VALUES (?, 'user', ?, 'user_login_google', 'user', ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            existingUser.id,
            existingUser.id,
            JSON.stringify({ provider: "google", identityLinked: !identity }),
            requestIp(req),
            now
          ),
      ];
      await database.batch(statements);

      const response = oauthRedirect(req, config.appOrigin, "google_success", locale);
      response.cookies.set("x-nexora-token", sessionId, sessionCookieOptions(config.appOrigin));
      return response;
    }

    const pendingId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + GOOGLE_PENDING_MAX_AGE_SECONDS * 1000).toISOString();
    await database.batch([
      database.prepare(`DELETE FROM ExternalAuthPending WHERE expiresAt <= ? OR usedAt IS NOT NULL`).bind(now),
      database
        .prepare(`DELETE FROM ExternalAuthPending WHERE provider = 'google' AND subject = ?`)
        .bind(profile.subject),
      database
        .prepare(
          `INSERT INTO ExternalAuthPending
             (id, provider, subject, email, firstName, lastName, locale, createdAt, expiresAt, usedAt)
           VALUES (?, 'google', ?, ?, ?, ?, ?, ?, ?, NULL)`
        )
        .bind(pendingId, profile.subject, profile.email, profile.firstName, profile.lastName, locale, now, expiresAt),
    ]);

    const response = oauthRedirect(req, config.appOrigin, "google_complete", locale);
    response.cookies.set(GOOGLE_OAUTH_COOKIES.pending, pendingId, {
      ...sessionCookieOptions(config.appOrigin),
      maxAge: GOOGLE_PENDING_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("google_oauth_callback_failed", error);
    return oauthRedirect(req, config.appOrigin, "google_failed", locale);
  }
}

function oauthRedirect(
  req: NextRequest,
  configuredOrigin: string | null,
  status: string,
  locale: "fr" | "en"
): NextResponse {
  const origin = configuredOrigin || new URL(req.url).origin;
  const destination = new URL("/", origin);
  destination.searchParams.set("auth", status);
  destination.searchParams.set("locale", locale);
  const response = NextResponse.redirect(destination);
  for (const cookieName of [
    GOOGLE_OAUTH_COOKIES.state,
    GOOGLE_OAUTH_COOKIES.nonce,
    GOOGLE_OAUTH_COOKIES.verifier,
    GOOGLE_OAUTH_COOKIES.locale,
  ]) {
    response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

function sessionCookieOptions(appOrigin: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: appOrigin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
