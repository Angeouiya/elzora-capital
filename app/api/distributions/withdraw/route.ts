import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Réserve les distributions pour versement externe. Ne les marque pas comme versées. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const body = await req.json();
    const distributionIds = Array.isArray(body.distributionIds) ? body.distributionIds.filter((id:unknown):id is string=>typeof id==="string") : [];
    if (!distributionIds.length) return NextResponse.json({ error: "Aucune distribution sélectionnée" }, { status: 400 });
    const rows = await prisma.distribution.findMany({ where: { id: { in: distributionIds }, investment: { userId: session.user.id }, status: "AVAILABLE" } });
    if (!rows.length) return NextResponse.json({ error: "Aucun montant disponible sélectionné" }, { status: 409 });
    await prisma.distribution.updateMany({ where: { id: { in: rows.map(r=>r.id) }, status: "AVAILABLE" }, data: { status: "WITHDRAWAL_PENDING" } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "WITHDRAWAL_REQUESTED", entity: "Distribution", details: `${rows.length} distributions réservées pour versement externe` } });
    return NextResponse.json({ pending: rows.length, amount: rows.reduce((s,r)=>s+r.capitalAmount+r.interestAmount,0), status: "WITHDRAWAL_PENDING", demo: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
