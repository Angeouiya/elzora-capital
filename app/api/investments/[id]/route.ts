import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const investment = await prisma.investment.findUnique({
      where: { id },
      include: {
        offer: { include: { project: { include: { company: true } } } },
        payments: true,
        distributions: true,
      },
    });
    if (!investment) return NextResponse.json({ error: "Investissement introuvable" }, { status: 404 });
    return NextResponse.json(investment);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
