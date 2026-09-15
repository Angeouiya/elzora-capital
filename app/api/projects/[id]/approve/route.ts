import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateRepaymentSchedule } from "@/lib/calculations";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const project = await prisma.project.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
      include: { company: true },
    });

    // Créer l'offre automatiquement
    const offer = await prisma.offer.create({
      data: {
        projectId: id,
        targetAmount: project.requestedAmount,
        rate: 800,
        duration: 24,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    // Générer l'échéancier
    const schedule = generateRepaymentSchedule(
      project.requestedAmount,
      800,
      "TOTAL",
      24
    );
    await prisma.repayment.createMany({
      data: schedule.map((s) => ({
        offerId: offer.id,
        scheduleDate: s.date,
        capitalAmount: s.capital,
        interestAmount: s.interest,
        feeAmount: s.fee,
      })),
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "PROJECT_APPROVED", entity: "Project", entityId: id },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
