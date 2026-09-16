import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const PUBLIC_STATUSES = new Set(["PUBLISHED", "CLOSED_SUCCESS", "CLOSED_FAIL"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sector = searchParams.get("sector");
    const requestedStatus = searchParams.get("status");
    const search = searchParams.get("search");
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const status = isAdmin && requestedStatus ? requestedStatus : requestedStatus && PUBLIC_STATUSES.has(requestedStatus) ? requestedStatus : "PUBLISHED";
    const where: Record<string, unknown> = { status };
    if (sector) where.project = { sector };
    if (search) where.OR = [{ project: { title: { contains: search } } }, { project: { description: { contains: search } } }, { project: { company: { name: { contains: search } } } }];
    const offers = await prisma.offer.findMany({ where, include: { project: { include: { company: true } } }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] });
    return NextResponse.json(offers);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
