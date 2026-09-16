import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateNetReceived } from "@/lib/calculations";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const where = session.user.role === "ADMIN" ? {} : { offer: { project: { company: { userId: session.user.id } } } };
    const disbursements = await prisma.disbursement.findMany({ where, include: { offer: { include: { project: { include: { company: true } } } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(disbursements);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role === "ADMIN") return NextResponse.json({ error: "La demande de décaissement doit provenir de l'entreprise bénéficiaire." }, { status: 403 });
    const body = await req.json();
    const offerId = typeof body.offerId === "string" ? body.offerId : "";
    const amount = Math.round(Number(body.amount));
    if (!offerId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Demande invalide" }, { status: 400 });
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { project: { include: { company: true } }, disbursements: true } });
    if (!offer) return NextResponse.json({ error: "Financement introuvable" }, { status: 404 });
    if (offer.project.company.userId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (offer.status !== "CLOSED_SUCCESS") return NextResponse.json({ error: "Un décaissement n'est possible qu'après une collecte réussie et clôturée." }, { status: 409 });
    const { netReceived } = calculateNetReceived(offer.collectedAmount);
    const committed = offer.disbursements.filter(d => !["REJECTED", "CANCELLED"].includes(d.status)).reduce((sum, d) => sum + d.amount, 0);
    if (amount > netReceived - committed) return NextResponse.json({ error: `Montant supérieur au net encore décaisseable (${Math.max(0, netReceived - committed)} FCFA).` }, { status: 409 });
    const tranche = offer.disbursements.length + 1;
    const disbursement = await prisma.disbursement.create({ data: { offerId, amount, tranche, status: "PENDING" } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "DISBURSEMENT_REQUESTED", entity: "Disbursement", entityId: disbursement.id, details: `Tranche ${tranche} · ${amount} FCFA` } });
    return NextResponse.json(disbursement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
