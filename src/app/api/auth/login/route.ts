import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { verifyPassword } from "@/lib/password";

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  try {
    const database = getD1();
    const user = await database
      .prepare(`SELECT id, email, passwordHash, firstName, lastName FROM User WHERE email = ? LIMIT 1`)
      .bind(email)
      .first<UserRow>();
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    const now = isoNow();
    const ipAddress = requestIp(req);
    await database.batch([
      database
        .prepare(
          `INSERT INTO UserSession (id, userId, deviceInfo, ipAddress, createdAt, lastActiveAt, revoked)
           VALUES (?, ?, ?, ?, ?, ?, 0)`
        )
        .bind(sessionId, user.id, req.headers.get("user-agent") || "unknown", ipAddress, now, now),
      database.prepare(`UPDATE User SET lastLoginAt = ?, updatedAt = ? WHERE id = ?`).bind(now, now, user.id),
      database
        .prepare(
          `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'user_login', 'user', ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), user.id, user.id, JSON.stringify({ email }), ipAddress, now),
    ]);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
    response.cookies.set("x-nexora-token", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("auth_login_failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible" }, { status: 503 });
  }
}
