import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const distributions = await prisma.distribution.findMany({
      where: { investment: { userId: session.user.id } },
      include: {
        repayment: { include: { offer: { include: { project: true } } } },
        investment: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(distributions);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
