import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        project: { include: { company: true } },
        repayments: { orderBy: { scheduleDate: "asc" } },
        _count: { select: { investments: true } },
      },
    });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    return NextResponse.json(offer);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
