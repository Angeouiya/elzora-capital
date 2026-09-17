import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";

export async function GET(req: Request) {
  const offers = await db.offer.findMany({
    include: { project: { include: { company: true } } },
    orderBy: { publishedAt: "desc" },
  });
  const projects = await db.project.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  const investments = await db.investment.findMany({
    include: { project: { include: { company: true } } },
  });
  const companies = await db.company.findMany();
  const users = await db.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, country: true, kycStatus: true, createdAt: true },
  });

  const totalRaised = offers.reduce((a, o) => a + Number(o.raisedAmount), 0);
  const totalInvestments = investments.reduce((a, i) => a + Number(i.amount), 0);
  const openOffers = offers.filter((o) => o.status === "open").length;
  const pendingProjects = projects.filter(
    (p) => ["submitted", "under_review", "complement_requested"].includes(p.status)
  ).length;

  return NextResponse.json(
    ser({
      stats: {
        totalRaised,
        totalInvestments,
        openOffers,
        totalProjects: projects.length,
        pendingProjects,
        totalCompanies: companies.length,
        totalUsers: users.length,
        totalInvestors: users.length,
      },
      offers,
      projects,
      users,
      companies,
    })
  );
}
