import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type OfferRow = Record<string, string | number | null>;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const country = searchParams.get("country");
  const instrument = searchParams.get("instrument");

  const { env } = getCloudflareContext();
  const result = await env.DB.prepare(`
    SELECT
      o.*,
      p.title AS projectTitle,
      p.description AS projectDescription,
      p.longDescription AS projectLongDescription,
      p.sector AS projectSector,
      p.country AS projectCountry,
      p.city AS projectCity,
      p.imageUrl AS projectImageUrl,
      p.instrumentType AS projectInstrumentType,
      p.companyId AS projectCompanyId,
      c.legalName AS companyLegalName,
      c.tradeName AS companyTradeName,
      c.legalForm AS companyLegalForm,
      c.country AS companyCountry,
      c.activity AS companyActivity
    FROM Offer o
    INNER JOIN Project p ON p.id = o.projectId
    INNER JOIN Company c ON c.id = p.companyId
    WHERE o.status = 'open'
    ORDER BY o.publishedAt DESC
  `).all<OfferRow>();

  const offers = result.results.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    version: Number(row.version),
    fundingGoal: Number(row.fundingGoal),
    minInvestment: Number(row.minInvestment),
    maxInvestment: row.maxInvestment == null ? null : Number(row.maxInvestment),
    annualRate: row.annualRate == null ? null : Number(row.annualRate),
    ratePeriod: row.ratePeriod,
    durationMonths: row.durationMonths == null ? null : Number(row.durationMonths),
    repaymentType: row.repaymentType,
    equityOfferedPct:
      row.equityOfferedPct == null ? null : Number(row.equityOfferedPct),
    valuationPre: row.valuationPre == null ? null : Number(row.valuationPre),
    upfrontCommissionPct: Number(row.upfrontCommissionPct),
    annualFollowUpPct: Number(row.annualFollowUpPct),
    raisedAmount: Number(row.raisedAmount),
    committedAmount: Number(row.committedAmount),
    backersCount: Number(row.backersCount),
    publishedAt: row.publishedAt,
    closingDate: row.closingDate,
    visibility: row.visibility,
    status: row.status,
    createdAt: row.createdAt,
    project: {
      id: row.projectId,
      companyId: row.projectCompanyId,
      title: row.projectTitle,
      description: row.projectDescription,
      longDescription: row.projectLongDescription,
      sector: row.projectSector,
      country: row.projectCountry,
      city: row.projectCity,
      imageUrl: row.projectImageUrl,
      instrumentType: row.projectInstrumentType,
      company: {
        id: row.projectCompanyId,
        legalName: row.companyLegalName,
        tradeName: row.companyTradeName,
        legalForm: row.companyLegalForm,
        country: row.companyCountry,
        activity: row.companyActivity,
      },
    },
  }));

  let filtered = offers;
  if (sector && sector !== "all")
    filtered = filtered.filter((o) => o.project.sector === sector);
  if (country && country !== "all")
    filtered = filtered.filter((o) => o.project.country === country);
  if (instrument && instrument !== "all")
    filtered = filtered.filter((o) => o.project.instrumentType === instrument);

  return NextResponse.json({ offers: filtered });
}
