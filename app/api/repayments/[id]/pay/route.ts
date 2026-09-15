import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePaymentReference } from "@/lib/calculations";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;
    const repayment = await prisma.repayment.findUnique({ where: { id } });
    if (!repayment) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });

    const totalDue = repayment.capitalAmount + repayment.interestAmount + repayment.feeAmount;
    const updated = await prisma.repayment.update({
      where: { id },
      data: {
        status: "PAID",
        paidAmount: totalDue,
        paidAt: new Date(),
        reference: generatePaymentReference("RMB"),
      },
    });

    // Marquer les distributions correspondantes comme AVAILABLE
    await prisma.distribution.updateMany({
      where: { repaymentId: id },
      data: { status: "AVAILABLE" },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REPAYMENT_PAID",
        entity: "Repayment",
        entityId: id,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
