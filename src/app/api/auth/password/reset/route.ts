import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { hashPassword } from "@/lib/password";
import { isStrongPassword } from "@/lib/password-policy";
import { hashPasswordResetToken, PASSWORD_RESET_TOKEN_PATTERN } from "@/lib/password-reset";

interface ResetRow {
  id: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: noStore });
  }

  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  if (!PASSWORD_RESET_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "RESET_LINK_INVALID" }, { status: 400, headers: noStore });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "PASSWORD_TOO_WEAK" }, { status: 400, headers: noStore });
  }

  try {
    const database = getD1();
    const tokenHash = await hashPasswordResetToken(token);
    const reset = await database
      .prepare(
        `SELECT id, userId, expiresAt, usedAt
         FROM PasswordResetToken WHERE tokenHash = ? LIMIT 1`
      )
      .bind(tokenHash)
      .first<ResetRow>();
    if (!reset || reset.usedAt || Date.parse(reset.expiresAt) <= Date.now()) {
      return NextResponse.json({ error: "RESET_LINK_EXPIRED" }, { status: 410, headers: noStore });
    }

    const now = isoNow();
    const consumeKey = crypto.randomUUID();
    const claim = await database
      .prepare(
        `UPDATE PasswordResetToken
         SET usedAt = ?, consumeKey = ?
         WHERE id = ? AND usedAt IS NULL AND expiresAt > ?`
      )
      .bind(now, consumeKey, reset.id, now)
      .run();
    if ((claim.meta.changes || 0) !== 1) {
      return NextResponse.json({ error: "RESET_LINK_EXPIRED" }, { status: 410, headers: noStore });
    }

    const passwordHash = await hashPassword(password);
    const ip = requestIp(req);
    await database.batch([
      database
        .prepare(
          `UPDATE User SET passwordHash = ?, updatedAt = ?
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM PasswordResetToken WHERE id = ? AND consumeKey = ?
           )`
        )
        .bind(passwordHash, now, reset.userId, reset.id, consumeKey),
      database
        .prepare(`UPDATE UserSession SET revoked = 1, lastActiveAt = ? WHERE userId = ? AND revoked = 0`)
        .bind(now, reset.userId),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'password_reset_completed', 'user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          reset.userId,
          reset.userId,
          JSON.stringify({ sessionsRevoked: true, resetTokenId: reset.id }),
          ip,
          now
        ),
    ]);

    const response = NextResponse.json(
      { ok: true, message: "PASSWORD_RESET_COMPLETED" },
      { headers: noStore }
    );
    response.cookies.set("x-nexora-token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("password_reset_failed", error);
    return NextResponse.json({ error: "PASSWORD_RESET_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}

