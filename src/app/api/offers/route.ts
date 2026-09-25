import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserSession } from "@/lib/auth";

type OfferRow = Record<string, string | number | null>;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const country = searchParams.get("country");
  const instrument = searchParams.get("instrument");

  const session = await getUserSession(req).catch(() => null);
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
      AND (
        (o.visibility = 'public' AND (
          o.isDemo = 1 OR EXISTS (
          SELECT 1 FROM RegulatoryReview r
          WHERE r.projectId = o.projectId
            AND r.decision = 'cleared'
            AND r.distributionScope = 'public_offering'
            AND r.marketAuthorityPath = 'visa_obtained'
            AND r.corporateActsStatus = 'confirmed'
            AND r.paymentSafeguardingStatus = 'confirmed'
            AND r.beneficialOwnersStatus = 'confirmed'
            AND r.riskDisclosureStatus = 'confirmed'
            AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
            AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
            AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
            AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
            AND r.countryOpinionRef IS NOT NULL
            AND TRIM(r.countryOpinionRef) <> ''
            AND r.authorityReference IS NOT NULL
            AND TRIM(r.authorityReference) <> ''
            AND r.reviewedBy IS NOT NULL
            AND r.reviewedBy <> r.preparedBy
            AND r.reviewedAt IS NOT NULL
          )
        )) OR
        (o.visibility = 'restricted' AND o.isDemo = 0 AND EXISTS (
          SELECT 1 FROM RegulatoryReview r
          WHERE r.projectId = o.projectId
            AND r.decision = 'cleared'
            AND r.distributionScope = 'restricted_private'
            AND r.marketAuthorityPath IN ('private_route_confirmed', 'authority_clearance')
            AND r.corporateActsStatus = 'confirmed'
            AND r.paymentSafeguardingStatus = 'confirmed'
            AND r.beneficialOwnersStatus = 'confirmed'
            AND r.riskDisclosureStatus = 'confirmed'
            AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
            AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
            AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
            AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
            AND r.countryOpinionRef IS NOT NULL
            AND TRIM(r.countryOpinionRef) <> ''
            AND r.reviewedBy IS NOT NULL
            AND r.reviewedBy <> r.preparedBy
            AND r.reviewedAt IS NOT NULL
        ) AND EXISTS (
          SELECT 1 FROM PrivateOfferInvitation i
          WHERE i.offerId = o.id
            AND i.userId = ?
            AND i.status = 'accepted'
        ))
      )
      AND datetime(o.closingDate) > datetime('now')
    ORDER BY o.publishedAt DESC
  `).bind(session?.userId || null).all<OfferRow>();

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
    isDemo: Number(row.isDemo) === 1,
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
