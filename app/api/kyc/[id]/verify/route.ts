import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status, note } = body; // status: VERIFIED | REJECTED

    const doc = await prisma.kYCDocument.update({
      where: { id },
      data: {
        status,
        note: note || null,
        verifiedAt: new Date(),
      },
      include: { user: true },
    });

    // Mettre à jour le statut KYC global de l'utilisateur
    const allDocs = await prisma.kYCDocument.findMany({ where: { userId: doc.userId } });
    const allVerified = allDocs.every((d: { status: string }) => d.status === "VERIFIED");
    const anyRejected = allDocs.some((d: { status: string }) => d.status === "REJECTED");

    await prisma.user.update({
      where: { id: doc.userId },
      data: {
        kycStatus: anyRejected ? "REJECTED" : allVerified ? "VERIFIED" : "IN_PROGRESS",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `KYC_${status}`,
        entity: "KYCDocument",
        entityId: id,
      },
    });

    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
