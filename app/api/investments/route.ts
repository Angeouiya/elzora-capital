import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePaymentReference } from "@/lib/calculations";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: {
        offer: { include: { project: { include: { company: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(investments);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { offerId, amount, method } = body;

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== "PUBLISHED")
      return NextResponse.json({ error: "Offre non disponible" }, { status: 400 });
    if (amount < offer.minTicket || amount > offer.maxTicket)
      return NextResponse.json({ error: "Montant hors limites" }, { status: 400 });

    const investment = await prisma.investment.create({
      data: { userId: session.user.id, offerId, amount },
    });

    // Moyen de paiement choisi à la souscription (valeur par défaut : virement)
    const paymentMethod = method === "MOBILE_MONEY" ? "MOBILE_MONEY" : "TRANSFER";

    await prisma.payment.create({
      data: {
        investmentId: investment.id,
        reference: generatePaymentReference("PAY"),
        amount,
        method: paymentMethod,
        status: "PENDING",
      },
    });

    await prisma.offer.update({
      where: { id: offerId },
      data: {
        collectedAmount: { increment: amount },
        investorCount: { increment: 1 },
      },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
