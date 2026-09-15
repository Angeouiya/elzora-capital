import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const [
      userCount,
      investorCount,
      enterpriseCount,
      offerCount,
      publishedOffers,
      totalCollected,
      projectCount,
      pendingProjects,
      investmentCount,
      totalInvested,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "INVESTOR" } }),
      prisma.user.count({ where: { role: "ENTERPRISE" } }),
      prisma.offer.count(),
      prisma.offer.count({ where: { status: "PUBLISHED" } }),
      prisma.offer.aggregate({ _sum: { collectedAmount: true } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "SUBMITTED" } }),
      prisma.investment.count(),
      prisma.investment.aggregate({ _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      users: { total: userCount, investors: investorCount, enterprises: enterpriseCount },
      offers: { total: offerCount, published: publishedOffers, collected: totalCollected._sum.collectedAmount || 0 },
      projects: { total: projectCount, pending: pendingProjects },
      investments: { count: investmentCount, total: totalInvested._sum.amount || 0 },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
