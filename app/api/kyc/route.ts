import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true, kycDocuments: { orderBy: { uploadedAt: "desc" } } },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const doc = await prisma.kYCDocument.create({
      data: {
        userId: session.user.id,
        type: body.type,
        fileName: body.fileName,
        fileSize: body.fileSize || null,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { kycStatus: "IN_PROGRESS" },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
