import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Approbation du DOSSIER uniquement.
 * L'offre financière est structurée ensuite dans /api/admin/offers puis confirmée par l'entreprise.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id }, include: { company: true, offer: true } });
    if (!existing) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    if (existing.offer) return NextResponse.json({ error: "Une offre existe déjà pour ce dossier." }, { status: 409 });
    if (!new Set(["SUBMITTED", "UNDER_REVIEW"]).has(existing.status)) {
      return NextResponse.json({ error: "Le dossier n'est pas dans un état approbable." }, { status: 409 });
    }

    const project = await prisma.project.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
    await prisma.notification.create({
      data: { userId: existing.company.userId, type: "DECISION", title: "Dossier approuvé", message: "Votre dossier est approuvé. Notre équipe va maintenant structurer les conditions finales de l'offre avant votre confirmation." },
    });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "PROJECT_APPROVED", entity: "Project", entityId: id, details: "Dossier approuvé sans publication automatique" },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
