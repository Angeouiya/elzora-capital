import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
      include: { investment: true },
    });

    // Mettre à jour l'investissement
    await prisma.investment.update({
      where: { id: payment.investmentId },
      data: { status: "CONFIRMED", paidAt: new Date() },
    });

    // Créer des distributions pour chaque remboursement de l'offre
    const repayments = await prisma.repayment.findMany({
      where: { offerId: payment.investment.offerId },
    });

    const offer = await prisma.offer.findUnique({ where: { id: payment.investment.offerId } });
    if (offer && offer.collectedAmount > 0) {
      for (const repayment of repayments) {
        const ratio = payment.amount / offer.collectedAmount;
        await prisma.distribution.create({
          data: {
            repaymentId: repayment.id,
            investmentId: payment.investmentId,
            capitalAmount: Math.round(repayment.capitalAmount * ratio),
            interestAmount: Math.round(repayment.interestAmount * ratio),
            status: "PENDING",
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PAYMENT_CONFIRMED",
        entity: "Payment",
        entityId: id,
      },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
