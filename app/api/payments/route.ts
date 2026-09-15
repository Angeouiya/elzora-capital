import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePaymentReference } from "@/lib/calculations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { investmentId, amount, method } = body;

    const investment = await prisma.investment.findUnique({ where: { id: investmentId } });
    if (!investment) return NextResponse.json({ error: "Investissement introuvable" }, { status: 404 });

    const payment = await prisma.payment.create({
      data: {
        investmentId,
        reference: generatePaymentReference("PAY"),
        amount: amount || investment.amount,
        method: method || "TRANSFER",
        status: "PENDING",
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
