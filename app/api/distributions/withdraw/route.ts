import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { distributionIds } = body as { distributionIds: string[] };

    if (!distributionIds?.length)
      return NextResponse.json({ error: "Aucune distribution sélectionnée" }, { status: 400 });

    const updated = await prisma.distribution.updateMany({
      where: {
        id: { in: distributionIds },
        investment: { userId: session.user.id },
        status: "AVAILABLE",
      },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "WITHDRAWAL_REQUESTED",
        entity: "Distribution",
        details: `${updated.count} distributions`,
      },
    });

    return NextResponse.json({ withdrawn: updated.count });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
