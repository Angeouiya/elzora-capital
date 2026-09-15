import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const disbursements = await prisma.disbursement.findMany({
      include: { offer: { include: { project: { include: { company: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(disbursements);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const disbursement = await prisma.disbursement.create({
      data: {
        offerId: body.offerId,
        amount: body.amount,
        tranche: body.tranche || 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DISBURSEMENT_CREATED",
        entity: "Disbursement",
        entityId: disbursement.id,
      },
    });

    return NextResponse.json(disbursement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
