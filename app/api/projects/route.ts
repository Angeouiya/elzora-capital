import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const company = await prisma.company.findUnique({
      where: { userId: session.user.id },
      include: { projects: { orderBy: { createdAt: "desc" } } },
    });
    if (!company) return NextResponse.json([]);
    return NextResponse.json(company.projects);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const company = await prisma.company.findUnique({ where: { userId: session.user.id } });
    if (!company) return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 400 });

    const body = await req.json();
    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        title: body.title,
        description: body.description,
        sector: body.sector,
        country: body.country || "CI",
        city: body.city,
        totalAmount: body.totalAmount,
        ownContribution: body.ownContribution,
        requestedAmount: body.requestedAmount,
        budget: body.budget,
        usageDescription: body.usageDescription,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
