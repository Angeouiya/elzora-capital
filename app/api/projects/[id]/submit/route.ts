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

    const { id } = await params;
    const project = await prisma.project.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "PROJECT_SUBMITTED", entity: "Project", entityId: id },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
