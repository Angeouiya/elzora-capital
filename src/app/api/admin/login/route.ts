import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { verifyPassword } from "@/lib/password";

interface AdminRow {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  active: number;
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
    const admin = await database
      .prepare(
        `SELECT id, email, passwordHash, firstName, lastName, role, active
         FROM AdminUser WHERE email = ? LIMIT 1`
      )
      .bind(email)
      .first<AdminRow>();
    if (!admin || !Boolean(admin.active) || !(await verifyPassword(password, admin.passwordHash))) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const now = isoNow();
    const ipAddress = requestIp(req);
    const sessionId = crypto.randomUUID();
    await database.batch([
      database.prepare(`UPDATE AdminUser SET lastLoginAt = ? WHERE id = ?`).bind(now, admin.id),
      database
        .prepare(
          `INSERT INTO AdminSession
           (id, adminId, deviceInfo, ipAddress, createdAt, lastActiveAt, revoked)
           VALUES (?, ?, ?, ?, ?, ?, 0)`
        )
        .bind(
          sessionId,
          admin.id,
          req.headers.get("user-agent")?.slice(0, 300) || "unknown",
          ipAddress,
          now,
          now
        ),
      database
        .prepare(
          `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'admin', ?, 'admin_login', 'admin_user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          admin.id,
          admin.id,
          JSON.stringify({ email, role: admin.role }),
          ipAddress,
          now
        ),
    ]);

    const response = NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
      notice: "Accès administrateur journalisé.",
    });
    response.cookies.set("x-nexora-admin-token", sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    console.error("admin_login_failed", error);
    return NextResponse.json({ error: "Service temporairement indisponible" }, { status: 503 });
  }
}
