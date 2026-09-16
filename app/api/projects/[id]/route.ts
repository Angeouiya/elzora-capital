import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const EDITABLE_FIELDS = new Set([
  "title",
  "description",
  "sector",
  "country",
  "city",
  "totalAmount",
  "ownContribution",
  "requestedAmount",
  "budget",
  "usageDescription",
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true, offer: true },
    });
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = project.company.userId === session.user.id;
    if (!isAdmin && !isOwner) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id }, include: { company: true } });
    if (!existing) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    if (existing.company.userId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (!new Set(["DRAFT", "COMPLEMENT_REQUESTED"]).has(existing.status)) {
      return NextResponse.json({ error: "Ce dossier n'est plus modifiable directement." }, { status: 409 });
    }

    const body = await req.json();
    const data = Object.fromEntries(Object.entries(body).filter(([key]) => EDITABLE_FIELDS.has(key)));
    const project = await prisma.project.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "PROJECT_DRAFT_UPDATED", entity: "Project", entityId: id },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
