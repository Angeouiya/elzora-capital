import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generatePaymentReference } from "@/lib/calculations";

/** L'entreprise initie/déclare le règlement. Cela ne marque jamais l'échéance comme payée. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const repayment = await prisma.repayment.findUnique({
      where: { id },
      include: { offer: { include: { project: { include: { company: true } } } } },
    });
    if (!repayment) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
    if (repayment.offer.project.company.userId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (repayment.status === "PAID") return NextResponse.json(repayment);
    if (repayment.status === "VERIFICATION") return NextResponse.json(repayment);
    if (!["DUE", "LATE", "PARTIAL", "UPCOMING"].includes(repayment.status)) return NextResponse.json({ error: "Cette échéance ne peut pas être déclarée maintenant." }, { status: 409 });

    const reference = repayment.reference || generatePaymentReference("RMB");
    const updated = await prisma.repayment.update({ where: { id }, data: { status: "VERIFICATION", reference } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "REPAYMENT_SUBMITTED_FOR_VERIFICATION", entity: "Repayment", entityId: id, details: reference } });
    return NextResponse.json({ ...updated, instructions: "Mode démonstration : le règlement doit être rapproché côté serveur avant confirmation." });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
