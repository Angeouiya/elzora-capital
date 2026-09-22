import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ admin: null }, { headers: PRIVATE_HEADERS });
    }

    return NextResponse.json(
      {
        admin: {
          id: session.adminId,
          email: session.email,
          firstName: session.firstName,
          lastName: session.lastName,
          role: session.role,
        },
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (error) {
    console.error("admin_session_restore_failed", error);
    return NextResponse.json(
      { admin: null },
      { status: 503, headers: PRIVATE_HEADERS }
    );
  }
}
