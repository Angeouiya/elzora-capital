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
    const project = await prisma.project.update({
      where: { id },
      data: { status: "REJECTED", rejectionReason: body.reason || null },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PROJECT_REJECTED",
        entity: "Project",
        entityId: id,
        details: body.reason,
      },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
