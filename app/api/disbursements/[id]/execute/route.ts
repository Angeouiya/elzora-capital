import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateAdvancedRepaymentSchedule } from "@/lib/calculations";
import { getFinalTerms } from "@/lib/finance-proposal";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const current = await prisma.disbursement.findUnique({
      where: { id },
      include: {
        offer: {
          include: {
            project: true,
            repayments: true,
          },
        },
      },
    });
    if (!current) return NextResponse.json({ error: "Décaissement introuvable" }, { status: 404 });
    if (current.status === "EXECUTED") return NextResponse.json(current);
    if (current.status !== "APPROVED") {
      return NextResponse.json({ error: "Le décaissement doit d'abord être approuvé." }, { status: 409 });
    }
    if (current.approvedBy === session.user.id) {
      return NextResponse.json(
        { error: "Le validateur ne peut pas exécuter seul le décaissement qu'il vient d'approuver. Un second compte interne est requis." },
        { status: 409 }
      );
    }
    if (current.offer.status !== "CLOSED_SUCCESS") {
      return NextResponse.json({ error: "Le décaissement exige une collecte clôturée avec succès." }, { status: 409 });
    }

    const executedAt = new Date();
    const updated = await prisma.disbursement.update({
      where: { id },
      data: { status: "EXECUTED", executedAt },
    });

    let scheduleCreated = false;
    if (
      current.offer.type === "DEBT" &&
      current.offer.repayments.length === 0 &&
      current.offer.collectedAmount > 0
    ) {
      const terms = getFinalTerms(current.offer.project);
      const schedule = generateAdvancedRepaymentSchedule({
        principal: current.offer.collectedAmount,
        rateBps: current.offer.rate,
        ratePeriod: current.offer.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL",
        durationMonths: current.offer.duration,
        paymentFrequency: terms.paymentFrequency,
        repaymentMode: terms.repaymentMode,
        graceMonths: terms.graceMonths,
        interestBase: terms.interestBase,
        startDate: executedAt,
      });
      await prisma.repayment.createMany({
        data: schedule.map((row) => ({
          offerId: current.offerId,
          scheduleDate: row.date,
          capitalAmount: row.capital,
          interestAmount: row.interest,
          feeAmount: row.fee,
        })),
      });
      scheduleCreated = true;
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DISBURSEMENT_EXECUTED_DEMO",
        entity: "Disbursement",
        entityId: id,
        details: scheduleCreated
          ? `Exécution de démonstration · échéancier contractuel initialisé sur ${current.offer.collectedAmount} FCFA confirmés`
          : "Exécution de démonstration — aucun transfert réel sans partenaire habilité",
      },
    });

    return NextResponse.json({ ...updated, demo: true, scheduleCreated });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
