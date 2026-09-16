import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePaymentReference } from "@/lib/calculations";

const RESERVATION_MINUTES = 30;

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { offer: { include: { project: { include: { company: true } } } }, payments: true },
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
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.kycStatus !== "VERIFIED") {
      return NextResponse.json({ error: "Votre vérification doit être finalisée avant une souscription financière." }, { status: 403 });
    }

    const body = await req.json();
    const offerId = typeof body.offerId === "string" ? body.offerId : "";
    const amount = Math.round(Number(body.amount));
    const method = body.method === "MOBILE_MONEY" ? "MOBILE_MONEY" : "TRANSFER";
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== "PUBLISHED") return NextResponse.json({ error: "Offre non disponible" }, { status: 400 });
    if (!Number.isFinite(amount) || amount < offer.minTicket || amount > offer.maxTicket) return NextResponse.json({ error: "Montant hors limites" }, { status: 400 });

    const expiry = new Date(Date.now() - RESERVATION_MINUTES * 60_000);
    const stale = await prisma.investment.findMany({ where: { offerId, status: "PENDING", createdAt: { lt: expiry } }, select: { id: true } });
    if (stale.length) {
      const staleIds = stale.map((row) => row.id);
      await prisma.payment.updateMany({ where: { investmentId: { in: staleIds }, status: "PENDING" }, data: { status: "CANCELLED" } });
      await prisma.investment.updateMany({ where: { id: { in: staleIds } }, data: { status: "CANCELLED" } });
    }

    const activeReservations = await prisma.investment.aggregate({
      where: { offerId, status: "PENDING", createdAt: { gte: expiry } },
      _sum: { amount: true },
    });
    const remainingForReservation = Math.max(0, offer.targetAmount - offer.collectedAmount - (activeReservations._sum.amount ?? 0));
    if (amount > remainingForReservation) {
      return NextResponse.json({ error: `Montant indisponible. Capacité temporairement réservable : ${remainingForReservation} FCFA.` }, { status: 409 });
    }

    const investment = await prisma.investment.create({ data: { userId: session.user.id, offerId, amount, status: "PENDING" } });
    const payment = await prisma.payment.create({
      data: { investmentId: investment.id, reference: generatePaymentReference("PAY"), amount, method, status: "PENDING" },
    });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "INVESTMENT_RESERVED", entity: "Investment", entityId: investment.id, details: `Réservation ${RESERVATION_MINUTES} min · ${amount} FCFA` } });
    return NextResponse.json({ ...investment, payment, reservationExpiresAt: new Date(investment.createdAt.getTime() + RESERVATION_MINUTES * 60_000) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
