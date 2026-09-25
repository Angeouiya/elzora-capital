import { NextResponse } from "next/server";
import { getD1 } from "@/lib/d1";
import { getUserSession } from "@/lib/auth";

type Row = Record<string, string | number | null>;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getUserSession(req).catch(() => null);
  const database = getD1();
  const offer = await database
    .prepare(
      `SELECT
         o.*,
         p.title AS projectTitle, p.description AS projectDescription,
         p.longDescription AS projectLongDescription, p.sector AS projectSector,
         p.country AS projectCountry, p.city AS projectCity, p.imageUrl AS projectImageUrl,
         p.instrumentType AS projectInstrumentType, p.companyId AS projectCompanyId,
         p.fundingGoal AS projectFundingGoal, p.companyContribution,
         p.minInvestment AS projectMinInvestment, p.risksIdentified,
         p.repaymentSource, p.budgetDetail,
         c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
         c.legalForm AS companyLegalForm, c.country AS companyCountry,
         c.activity AS companyActivity, c.foundedYear AS companyFoundedYear,
         c.verificationStatus AS companyVerificationStatus
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       JOIN Company c ON c.id = p.companyId
       WHERE o.id = ? AND (
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
       LIMIT 1`
    )
    .bind(id, session?.userId || null)
    .first<Row>();

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const [documents, timeline, investments] = await Promise.all([
    database
      .prepare(
        `SELECT id, projectId, type, fileName, fileUrl, uploadedAt
         FROM ProjectDocument
         WHERE projectId = ? AND isPublic = 1
         ORDER BY uploadedAt DESC`
      )
      .bind(offer.projectId)
      .all<Row>(),
    database
      .prepare(
        `SELECT id, projectId, eventType, description, actor, createdAt
         FROM ProjectEvent WHERE projectId = ? ORDER BY createdAt DESC LIMIT 10`
      )
      .bind(offer.projectId)
      .all<Row>(),
    database
      .prepare(
        `SELECT id, offerId, investorType, amount, sharePct, status,
                signedAt, paymentConfirmedAt, createdAt
         FROM Investment
         WHERE offerId = ? AND status = 'confirmed'
         ORDER BY createdAt DESC LIMIT 20`
      )
      .bind(id)
      .all<Row>(),
  ]);

  return NextResponse.json({
    offer: {
      id: offer.id,
      projectId: offer.projectId,
      version: Number(offer.version),
      fundingGoal: Number(offer.fundingGoal),
      minInvestment: Number(offer.minInvestment),
      maxInvestment: nullableNumber(offer.maxInvestment),
      annualRate: nullableNumber(offer.annualRate),
      ratePeriod: offer.ratePeriod,
      durationMonths: nullableNumber(offer.durationMonths),
      repaymentType: offer.repaymentType,
      equityOfferedPct: nullableNumber(offer.equityOfferedPct),
      valuationPre: nullableNumber(offer.valuationPre),
      upfrontCommissionPct: Number(offer.upfrontCommissionPct),
      annualFollowUpPct: Number(offer.annualFollowUpPct),
      raisedAmount: Number(offer.raisedAmount),
      committedAmount: Number(offer.committedAmount),
      backersCount: Number(offer.backersCount),
      publishedAt: offer.publishedAt,
      closingDate: offer.closingDate,
      visibility: offer.visibility,
      isDemo: Number(offer.isDemo) === 1,
      status: offer.status,
      createdAt: offer.createdAt,
      project: {
        id: offer.projectId,
        companyId: offer.projectCompanyId,
        title: offer.projectTitle,
        description: offer.projectDescription,
        longDescription: offer.projectLongDescription,
        sector: offer.projectSector,
        country: offer.projectCountry,
        city: offer.projectCity,
        imageUrl: offer.projectImageUrl,
        instrumentType: offer.projectInstrumentType,
        fundingGoal: Number(offer.projectFundingGoal),
        companyContribution: Number(offer.companyContribution),
        minInvestment: Number(offer.projectMinInvestment),
        risksIdentified: offer.risksIdentified,
        repaymentSource: offer.repaymentSource,
        budgetDetail: offer.budgetDetail,
        documents: documents.results,
        timeline: timeline.results,
        company: {
          id: offer.projectCompanyId,
          legalName: offer.companyLegalName,
          tradeName: offer.companyTradeName,
          legalForm: offer.companyLegalForm,
          country: offer.companyCountry,
          activity: offer.companyActivity,
          foundedYear: nullableNumber(offer.companyFoundedYear),
          verificationStatus: offer.companyVerificationStatus,
        },
      },
      investments: investments.results.map((investment) => ({
        ...investment,
        amount: Number(investment.amount),
        sharePct: Number(investment.sharePct),
      })),
    },
  });
}

function nullableNumber(value: string | number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}
