import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const [users, companies, projects, offers, investments, payments, disbursements, repayments, distributions, audit] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, role: true, kycStatus: true, twoFactor: true, country: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.company.findMany({ select: { id: true, name: true, sector: true, country: true, status: true, userId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.project.findMany({ include: { company: { select: { id: true, name: true, userId: true } }, offer: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.offer.findMany({ include: { project: { include: { company: { select: { name: true, userId: true } } } }, _count: { select: { investments: true } } }, orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.investment.findMany({ include: { offer: { include: { project: { include: { company: { select: { name: true } } } } } }, user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
      prisma.disbursement.findMany({ include: { offer: { include: { project: { include: { company: { select: { name: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.repayment.findMany({ include: { offer: { include: { project: { include: { company: { select: { name: true } } } } } } }, orderBy: { scheduleDate: "asc" }, take: 400 }),
      prisma.distribution.findMany({ orderBy: { createdAt: "desc" }, take: 400 }),
      prisma.auditLog.findMany({ include: { user: { select: { email: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
    ]);

    return NextResponse.json({ users, companies, projects, offers, investments, payments, disbursements, repayments, distributions, audit, generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
