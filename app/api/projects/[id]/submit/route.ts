import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getProjectProposal, validateFinancialProposal } from "@/lib/finance-proposal";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id }, include: { company: true } });
    if (!existing) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    if (existing.company.userId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (!new Set(["DRAFT", "COMPLEMENT_REQUESTED"]).has(existing.status)) {
      return NextResponse.json({ error: "Ce dossier a déjà été transmis." }, { status: 409 });
    }

    const proposal = getProjectProposal(existing);
    const errors = validateFinancialProposal(proposal, existing.requestedAmount);
    if (!existing.title.trim() || !existing.description.trim() || existing.totalAmount <= 0) errors.push("Le dossier projet est incomplet.");
    if (errors.length) return NextResponse.json({ error: "Dossier incomplet", details: errors }, { status: 400 });

    const nextStatus = existing.status === "COMPLEMENT_REQUESTED" ? "UNDER_REVIEW" : "SUBMITTED";
    const project = await prisma.project.update({
      where: { id },
      data: { status: nextStatus, submittedAt: new Date() },
    });
    await prisma.notification.create({
      data: { userId: session.user.id, type: "DECISION", title: "Dossier transmis", message: "Votre dossier a été transmis à l'équipe d'analyse. Vous serez informé de chaque changement d'état." },
    });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "PROJECT_SUBMITTED", entity: "Project", entityId: id },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
