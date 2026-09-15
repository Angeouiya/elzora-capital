import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (session.user.role === "ADMIN") {
      const companies = await prisma.company.findMany({
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(companies);
    }

    const company = await prisma.company.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json(company ? [company] : []);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const existing = await prisma.company.findUnique({ where: { userId: session.user.id } });
    if (existing) return NextResponse.json({ error: "Entreprise déjà existante" }, { status: 400 });

    const company = await prisma.company.create({
      data: {
        userId: session.user.id,
        name: body.name,
        legalForm: body.legalForm || "SARL",
        country: body.country || "CI",
        registrationNumber: body.registrationNumber,
        taxId: body.taxId,
        sector: body.sector || "Services",
        address: body.address,
        description: body.description,
      },
    });
    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
