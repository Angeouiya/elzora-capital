import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sector = searchParams.get("sector");
    const status = searchParams.get("status") || "PUBLISHED";
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sector) where.project = { sector };
    if (search) {
      where.OR = [
        { project: { title: { contains: search } } },
        { project: { description: { contains: search } } },
      ];
    }

    const offers = await prisma.offer.findMany({
      where,
      include: { project: { include: { company: true } } },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json(offers);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
