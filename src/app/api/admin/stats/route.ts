import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1 } from "@/lib/d1";

interface OfferRow extends Record<string, unknown> {
  id: string;
  status: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment: number | null;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  raisedAmount: number;
  committedAmount: number;
  backersCount: number;
  publishedAt: string;
  closingDate: string;
  visibility: string;
  projectId: string;
  projectTitle: string;
  projectSector: string;
  projectCountry: string;
  instrumentType: string;
  companyLegalName: string;
  companyTradeName: string | null;
}

interface ProjectRow extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  sector: string;
  country: string;
  fundingGoal: number;
  instrumentType: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  companyLegalName: string;
  companyTradeName: string | null;
  companyVerificationStatus: string;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  kycStatus: string;
  createdAt: string;
}

interface CompanyRow extends Record<string, unknown> {
  id: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  country: string;
  activity: string;
  verificationStatus: string;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const [offerResult, projectResult, userResult, companyResult, investmentTotal, repaidTotal] =
    await Promise.all([
      database
        .prepare(
          `SELECT o.id, o.status, o.fundingGoal, o.minInvestment, o.maxInvestment,
                  o.annualRate, o.ratePeriod, o.durationMonths, o.repaymentType,
                  o.equityOfferedPct, o.valuationPre, o.upfrontCommissionPct,
                  o.annualFollowUpPct, o.raisedAmount, o.committedAmount,
                  o.backersCount, o.publishedAt, o.closingDate, o.visibility,
                  p.id AS projectId, p.title AS projectTitle,
                  p.sector AS projectSector, p.country AS projectCountry,
                  p.instrumentType,
                  c.legalName AS companyLegalName,
                  c.tradeName AS companyTradeName
           FROM Offer o
           JOIN Project p ON p.id = o.projectId
           JOIN Company c ON c.id = p.companyId
           ORDER BY o.publishedAt DESC`
        )
        .all<OfferRow>(),
      database
        .prepare(
          `SELECT p.id, p.title, p.status, p.sector, p.country, p.fundingGoal,
                  p.instrumentType, p.createdAt, p.updatedAt, p.companyId,
                  c.legalName AS companyLegalName,
                  c.tradeName AS companyTradeName,
                  c.verificationStatus AS companyVerificationStatus
           FROM Project p
           JOIN Company c ON c.id = p.companyId
           ORDER BY p.updatedAt DESC`
        )
        .all<ProjectRow>(),
      database
        .prepare(
          `SELECT id, email, firstName, lastName, country, kycStatus, createdAt
           FROM User ORDER BY createdAt DESC`
        )
        .all<UserRow>(),
      database
        .prepare(
          `SELECT id, legalName, tradeName, legalForm, country, activity,
                  verificationStatus, createdAt
           FROM Company ORDER BY createdAt DESC`
        )
        .all<CompanyRow>(),
      database
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM Investment WHERE status = 'confirmed'`
        )
        .first<{ total: number }>(),
      database
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM Distribution WHERE status IN ('available', 'withdrawal_requested', 'withdrawn')`
        )
        .first<{ total: number }>(),
    ]);

  const offers = offerResult.results.map((row) => ({
    id: row.id,
    status: row.status,
    fundingGoal: Number(row.fundingGoal),
    minInvestment: Number(row.minInvestment),
    maxInvestment: row.maxInvestment == null ? null : Number(row.maxInvestment),
    annualRate: row.annualRate,
    ratePeriod: row.ratePeriod,
    durationMonths: row.durationMonths,
    repaymentType: row.repaymentType,
    equityOfferedPct: row.equityOfferedPct,
    valuationPre: row.valuationPre == null ? null : Number(row.valuationPre),
    upfrontCommissionPct: Number(row.upfrontCommissionPct),
    annualFollowUpPct: Number(row.annualFollowUpPct),
    raisedAmount: Number(row.raisedAmount),
    committedAmount: Number(row.committedAmount),
    backersCount: Number(row.backersCount),
    publishedAt: row.publishedAt,
    closingDate: row.closingDate,
    visibility: row.visibility,
    project: {
      id: row.projectId,
      title: row.projectTitle,
      sector: row.projectSector,
      country: row.projectCountry,
      instrumentType: row.instrumentType,
      company: {
        legalName: row.companyLegalName,
        tradeName: row.companyTradeName,
      },
    },
  }));

  const projects = projectResult.results.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    sector: row.sector,
    country: row.country,
    fundingGoal: Number(row.fundingGoal),
    instrumentType: row.instrumentType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    company: {
      id: row.companyId,
      legalName: row.companyLegalName,
      tradeName: row.companyTradeName,
      verificationStatus: row.companyVerificationStatus,
    },
  }));
  const totalRaised = offers.reduce((sum, offer) => sum + offer.raisedAmount, 0);

  return NextResponse.json(
    {
      stats: {
        totalRaised,
        totalInvestments: Number(investmentTotal?.total || 0),
        totalRepaid: Number(repaidTotal?.total || 0),
        openOffers: offers.filter((offer) => offer.status === "open").length,
        totalProjects: projects.length,
        pendingProjects: projects.filter((project) =>
          ["submitted", "under_review", "complement_requested"].includes(project.status)
        ).length,
        totalCompanies: companyResult.results.length,
        totalUsers: userResult.results.length,
        totalInvestors: userResult.results.length,
      },
      offers,
      projects,
      users: userResult.results,
      companies: companyResult.results,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
