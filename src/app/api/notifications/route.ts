import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1 } from "@/lib/d1";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  if (body.all === true) {
    const result = await database
      .prepare(`UPDATE Notification SET read = 1 WHERE userId = ? AND read = 0`)
      .bind(session.userId)
      .run();
    return NextResponse.json(
      { ok: true, updated: Number(result.meta.changes || 0) },
      { headers: noStore }
    );
  }

  const notificationId = String(body.notificationId || "").trim();
  if (!notificationId || notificationId.length > 100) {
    return NextResponse.json(
      { error: "Notification invalide" },
      { status: 400, headers: noStore }
    );
  }

  const result = await database
    .prepare(`UPDATE Notification SET read = 1 WHERE id = ? AND userId = ?`)
    .bind(notificationId, session.userId)
    .run();
  if (Number(result.meta.changes || 0) !== 1) {
    return NextResponse.json(
      { error: "Notification introuvable" },
      { status: 404, headers: noStore }
    );
  }

  return NextResponse.json({ ok: true, updated: 1 }, { headers: noStore });
}
