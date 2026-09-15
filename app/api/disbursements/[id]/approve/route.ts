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
    if (session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const disbursement = await prisma.disbursement.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: session.user.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DISBURSEMENT_APPROVED",
        entity: "Disbursement",
        entityId: id,
      },
    });

    return NextResponse.json(disbursement);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
