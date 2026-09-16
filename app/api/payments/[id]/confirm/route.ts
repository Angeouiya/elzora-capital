import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Confirmation de démonstration côté contrôle interne. En production : webhook/preuve serveur du PSP. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const { id } = await params;
    const existing = await prisma.payment.findUnique({ where: { id }, include: { investment: true } });
    if (!existing) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    if (existing.status === "CONFIRMED") return NextResponse.json(existing);
    if (existing.status !== "PENDING" || existing.investment.status === "CANCELLED") return NextResponse.json({ error: "Paiement non confirmable" }, { status: 409 });

    const offer = await prisma.offer.findUnique({ where: { id: existing.investment.offerId } });
    if (!offer || !["PUBLISHED", "SUSPENDED"].includes(offer.status)) return NextResponse.json({ error: "Collecte non ouverte à la confirmation" }, { status: 409 });
    if (offer.collectedAmount + existing.amount > offer.targetAmount) return NextResponse.json({ error: "La confirmation dépasserait le plafond de collecte." }, { status: 409 });

    const confirmedAt = new Date();
    const payment = await prisma.payment.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt }, include: { investment: true } });
    await prisma.investment.update({ where: { id: existing.investmentId }, data: { status: "CONFIRMED", paidAt: confirmedAt } });
    await prisma.offer.update({ where: { id: offer.id }, data: { collectedAmount: { increment: existing.amount }, investorCount: { increment: 1 } } });
    await prisma.notification.create({ data: { userId: existing.investment.userId, type: "PAYMENT", title: "Paiement confirmé", message: `Votre paiement de ${existing.amount.toLocaleString("fr-FR")} FCFA a été confirmé côté serveur.` } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "PAYMENT_CONFIRMED", entity: "Payment", entityId: id, details: `Confirmation serveur · ${existing.amount} FCFA` } });
    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
