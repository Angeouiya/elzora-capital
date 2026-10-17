import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { isTransactionalEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken,
  hashResetRateLimitKey,
  isResetEmailValid,
  normalizeResetEmail,
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/password-reset";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  language: string;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function accepted(locale: "fr" | "en") {
  return NextResponse.json(
    {
      ok: true,
      message: locale === "en"
        ? "If an account matches this address, a secure link will be sent shortly."
        : "Si un compte correspond à cette adresse, un lien sécurisé sera envoyé dans quelques instants.",
    },
    { status: 202, headers: noStore }
  );
}

export async function POST(req: NextRequest) {
  if (!isTransactionalEmailConfigured()) {
    return NextResponse.json({ error: "PASSWORD_EMAIL_UNAVAILABLE" }, { status: 503, headers: noStore });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: noStore });
  }

  const locale = body.locale === "en" ? "en" : "fr";
  const accountRequest = body.mode === "account";
  let accountUserId: string | null = null;
  if (accountRequest) {
    try {
      accountUserId = (await requireUser(req)).userId;
    } catch {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: noStore });
    }
  }

  try {
    const database = getD1();
    const accountUser = accountUserId
      ? await database.prepare(`SELECT id, email, firstName, language FROM User WHERE id = ? LIMIT 1`)
        .bind(accountUserId).first<UserRow>()
      : null;
    if (accountRequest && !accountUser) {
      return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404, headers: noStore });
    }
    const email = normalizeResetEmail(accountRequest ? accountUser?.email : body.email);
    if (!isResetEmailValid(email)) {
      return accountRequest
        ? NextResponse.json({ error: "ACCOUNT_EMAIL_INVALID" }, { status: 400, headers: noStore })
        : accepted(locale);
    }
    const now = isoNow();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const cleanupBefore = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const ip = requestIp(req);
    const [emailHash, ipHash] = await Promise.all([
      hashResetRateLimitKey(email, "email"),
      hashResetRateLimitKey(ip, "ip"),
    ]);

    await database.batch([
      database.prepare(`DELETE FROM PasswordResetAttempt WHERE createdAt < ?`).bind(cleanupBefore),
      database.prepare(`DELETE FROM PasswordResetToken WHERE expiresAt < ?`).bind(cleanupBefore),
    ]);

    const [emailAttempts, ipAttempts] = await Promise.all([
      database
        .prepare(`SELECT COUNT(*) AS count FROM PasswordResetAttempt WHERE emailHash = ? AND createdAt >= ?`)
        .bind(emailHash, hourAgo)
        .first<{ count: number }>(),
      database
        .prepare(`SELECT COUNT(*) AS count FROM PasswordResetAttempt WHERE ipHash = ? AND createdAt >= ?`)
        .bind(ipHash, hourAgo)
        .first<{ count: number }>(),
    ]);
    if (Number(emailAttempts?.count || 0) >= 3 || Number(ipAttempts?.count || 0) >= 10) {
      return accountRequest
        ? NextResponse.json({ error: "RESET_RATE_LIMITED" }, { status: 429, headers: noStore })
        : accepted(locale);
    }

    const attemptId = crypto.randomUUID();
    await database
      .prepare(
        `INSERT INTO PasswordResetAttempt (id, emailHash, ipHash, delivered, createdAt)
         VALUES (?, ?, ?, 0, ?)`
      )
      .bind(attemptId, emailHash, ipHash, now)
      .run();

    const user = accountUser || await database
      .prepare(`SELECT id, email, firstName, language FROM User WHERE email = ? LIMIT 1`)
      .bind(email)
      .first<UserRow>();
    if (!user) return accepted(locale);

    const tokenId = crypto.randomUUID();
    const token = createPasswordResetToken();
    const tokenHash = await hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();
    const preferredLocale: "fr" | "en" = user.language === "en" ? "en" : locale;
    const resetUrl = buildPasswordResetUrl(token, preferredLocale);

    await database.batch([
      database
        .prepare(
          `INSERT INTO PasswordResetToken
             (id, userId, tokenHash, createdAt, expiresAt, usedAt, consumeKey, requestedIpHash)
           VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`
        )
        .bind(tokenId, user.id, tokenHash, now, expiresAt, ipHash),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'password_reset_requested', 'user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          user.id,
          JSON.stringify({ expiresAt, channel: "email" }),
          ip,
          now
        ),
    ]);

    try {
      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        locale: preferredLocale,
        resetUrl,
        idempotencyKey: tokenId,
      });
    } catch (error) {
      console.error("password_reset_email_failed", error);
      await database
        .prepare(`UPDATE PasswordResetToken SET usedAt = ? WHERE id = ? AND usedAt IS NULL`)
        .bind(isoNow(), tokenId)
        .run();
      return accountRequest
        ? NextResponse.json({ error: "PASSWORD_EMAIL_UNAVAILABLE" }, { status: 503, headers: noStore })
        : accepted(locale);
    }

    try {
      await database.batch([
        database
          .prepare(`UPDATE PasswordResetAttempt SET delivered = 1 WHERE id = ?`)
          .bind(attemptId),
        database
          .prepare(`UPDATE PasswordResetToken SET usedAt = ? WHERE userId = ? AND id != ? AND usedAt IS NULL AND createdAt < ?`)
          .bind(isoNow(), user.id, tokenId, now),
      ]);
    } catch (error) {
      // The email was accepted by the provider: keep its link usable even if audit cleanup fails.
      console.error("password_reset_delivery_record_failed", error);
    }

    return accountRequest
      ? NextResponse.json({ ok: true, emailAccepted: true }, { status: 202, headers: noStore })
      : accepted(locale);
  } catch (error) {
    console.error("password_reset_request_failed", error);
    return NextResponse.json({ error: "PASSWORD_RESET_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}

