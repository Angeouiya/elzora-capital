import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { ser } from "@/lib/serialize";

// ============================================================================
// GET /api/auth/me
// ----------------------------------------------------------------------------
// Retourne l'utilisateur courant (depuis la session cookie) ou null.
// ============================================================================
export async function GET(req: Request) {
  const session = await getUserSession(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      language: true,
      kycStatus: true,
    },
  });
  if (!user) {
    return NextResponse.json({ user: null });
  }
  // Récupère les sociétés dont l'utilisateur est membre
  const memberships = await db.companyMember.findMany({
    where: { userId: user.id },
    include: {
      company: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          legalForm: true,
          country: true,
          activity: true,
          verificationStatus: true,
        },
      },
    },
  });
  return NextResponse.json({
    user: ser(user),
    memberships: ser(memberships),
  });
}
