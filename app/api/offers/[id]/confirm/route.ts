import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const offer = await prisma.offer.findUnique({ where: { id }, include: { project: { include: { company: true } } } });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    if (offer.project.company.userId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (offer.status !== "DRAFT" || offer.project.status !== "OFFER_PREPARED") return NextResponse.json({ error: "Ces conditions ne sont pas en attente de confirmation." }, { status: 409 });

    const project = await prisma.project.update({ where: { id: offer.projectId }, data: { status: "OFFER_CONFIRMED" } });
    await prisma.notification.create({ data: { userId: session.user.id, type: "PUBLICATION", title: "Conditions confirmées", message: "Vos conditions finales sont confirmées. L'équipe effectuera le dernier contrôle avant publication." } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "OFFER_TERMS_CONFIRMED_BY_COMPANY", entity: "Offer", entityId: offer.id } });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
