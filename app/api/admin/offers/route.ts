import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectProposal, proposalToOfferFields, validateFinancialProposal, writeProjectBudget } from "@/lib/finance-proposal";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const projects = await prisma.project.findMany({
      where: { status: { in: ["APPROVED", "OFFER_PREPARED", "OFFER_CONFIRMED", "PUBLISHED"] } },
      include: { company: true, offer: { include: { _count: { select: { investments: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const body = await req.json();
    const project = await prisma.project.findUnique({ where: { id: body.projectId }, include: { company: true, offer: true } });
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    if (project.offer) return NextResponse.json({ error: "Une offre existe déjà pour ce dossier." }, { status: 409 });
    if (project.status !== "APPROVED") return NextResponse.json({ error: "Le dossier doit être approuvé avant structuration." }, { status: 409 });

    const proposed = getProjectProposal(project);
    const finalTerms = { ...proposed, ...(body.terms ?? {}) };
    const errors = validateFinancialProposal(finalTerms, project.requestedAmount);
    if (errors.length) return NextResponse.json({ error: "Conditions invalides", details: errors }, { status: 400 });

    const offer = await prisma.offer.create({
      data: { projectId: project.id, ...proposalToOfferFields(finalTerms, project.requestedAmount), status: "DRAFT" },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "OFFER_PREPARED", budget: writeProjectBudget(project.budget, { finalTerms: finalTerms as unknown as Record<string, unknown> }) },
    });
    await prisma.notification.create({
      data: { userId: project.company.userId, type: "PUBLICATION", title: "Conditions finales à confirmer", message: "Notre équipe a préparé les conditions de votre offre. Consultez-les dans votre espace entreprise et confirmez-les avant publication." },
    });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "OFFER_DRAFT_CREATED", entity: "Offer", entityId: offer.id, details: JSON.stringify(finalTerms) },
    });
    return NextResponse.json(offer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
