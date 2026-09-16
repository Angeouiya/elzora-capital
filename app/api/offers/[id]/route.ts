import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const PUBLIC_STATUSES = new Set(["PUBLISHED", "CLOSED_SUCCESS", "CLOSED_FAIL"]);

export async function GET(_req: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const offer = await prisma.offer.findUnique({ where: { id }, include: { project: { include: { company: true } }, repayments: { orderBy: { scheduleDate: "asc" } }, _count: { select: { investments: true } } } });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    if (!PUBLIC_STATUSES.has(offer.status)) {
      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";
      const isOwner = !!session?.user?.id && offer.project.company.userId === session.user.id;
      if (!isAdmin && !isOwner) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    return NextResponse.json(offer);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
