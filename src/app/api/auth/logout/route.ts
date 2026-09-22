import { NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getUserSession, readTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const token = readTokenFromRequest(req, "x-nexora-token");
  try {
    const session = await getUserSession(req);
    if (session && token) {
      const database = getD1();
      await database.batch([
        database.prepare(`UPDATE UserSession SET revoked = 1, lastActiveAt = ? WHERE id = ?`).bind(isoNow(), token),
        database
          .prepare(
            `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
             VALUES (?, 'user', ?, 'user_logout', 'user', ?, '{}', ?, ?)`
          )
          .bind(crypto.randomUUID(), session.userId, session.userId, requestIp(req), isoNow()),
      ]);
    }
  } catch (error) {
    console.error("auth_logout_failed", error);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("x-nexora-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
