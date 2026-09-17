import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

// ============================================================================
// POST /api/auth/logout
// ----------------------------------------------------------------------------
// Révoque la session courante (marquée `revoked=true`) + efface le cookie.
// ============================================================================
export async function POST(req: Request) {
  const session = await getUserSession(req);
  if (session) {
    // Marquer la session comme révoquée
    await db.userSession
      .updateMany({
        where: { userId: session.userId },
        data: { revoked: true },
      })
      .catch(() => {});
    await db.auditLog
      .create({
        data: {
          actorType: "user",
          actorId: session.userId,
          action: "user_logout",
          entityType: "user",
          entityId: session.userId,
          metadata: "{}",
        },
      })
      .catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("x-nexora-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
