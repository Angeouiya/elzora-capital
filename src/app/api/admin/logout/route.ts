import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { readTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = readTokenFromRequest(req, "x-nexora-admin-token");
  if (token) {
    const database = getD1();
    const session = await database
      .prepare(`SELECT adminId FROM AdminSession WHERE id = ? LIMIT 1`)
      .bind(token)
      .first<{ adminId: string }>();
    if (session) {
      const now = isoNow();
      await database.batch([
        database
          .prepare(`UPDATE AdminSession SET revoked = 1, lastActiveAt = ? WHERE id = ?`)
          .bind(now, token),
        database
          .prepare(
            `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
             VALUES (?, 'admin', ?, 'admin_logout', 'admin_session', ?, '{}', ?, ?)`
          )
          .bind(crypto.randomUUID(), session.adminId, token, requestIp(req), now),
      ]);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("x-nexora-admin-token", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
