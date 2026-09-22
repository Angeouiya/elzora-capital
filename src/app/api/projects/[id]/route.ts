import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1 } from "@/lib/d1";

type Row = Record<string, string | number | null>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const database = getD1();
  const project = await database
    .prepare(
      `SELECT p.*,
              c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              c.legalForm AS companyLegalForm, c.country AS companyCountry,
              c.activity AS companyActivity, c.verificationStatus AS companyVerificationStatus,
              o.id AS offerId, o.fundingGoal AS offerFundingGoal,
              o.raisedAmount AS offerRaisedAmount, o.committedAmount AS offerCommittedAmount,
              o.backersCount AS offerBackersCount, o.status AS offerStatus,
              o.closingDate AS offerClosingDate, o.publishedAt AS offerPublishedAt
       FROM Project p
       JOIN Company c ON c.id = p.companyId
       LEFT JOIN Offer o ON o.projectId = p.id
       WHERE p.id = ? LIMIT 1`
    )
    .bind(id)
    .first<Row>();
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const membership = await database
    .prepare(`SELECT id FROM CompanyMember WHERE userId = ? AND companyId = ? LIMIT 1`)
    .bind(session.userId, project.companyId)
    .first<{ id: string }>();
  if (!membership) return NextResponse.json({ error: "Accès refusé à ce projet" }, { status: 403 });

  const [timeline, documents] = await Promise.all([
    database
      .prepare(
        `SELECT id, projectId, eventType, description, actor, createdAt
         FROM ProjectEvent WHERE projectId = ? ORDER BY createdAt DESC LIMIT 50`
      )
      .bind(id)
      .all<Row>(),
    database
      .prepare(
        `SELECT id, projectId, type, fileName, fileUrl, uploadedAt
         FROM ProjectDocument WHERE projectId = ? ORDER BY uploadedAt DESC`
      )
      .bind(id)
      .all<Row>(),
  ]);

  return NextResponse.json(
    {
      project: {
        ...project,
        fundingGoal: Number(project.fundingGoal),
        companyContribution: Number(project.companyContribution),
        annualRate: nullableNumber(project.annualRate),
        durationMonths: nullableNumber(project.durationMonths),
        equityOfferedPct: nullableNumber(project.equityOfferedPct),
        valuationPre: nullableNumber(project.valuationPre),
        minInvestment: Number(project.minInvestment),
        maxInvestment: nullableNumber(project.maxInvestment),
        company: {
          id: project.companyId,
          legalName: project.companyLegalName,
          tradeName: project.companyTradeName,
          legalForm: project.companyLegalForm,
          country: project.companyCountry,
          activity: project.companyActivity,
          verificationStatus: project.companyVerificationStatus,
        },
        offer: project.offerId
          ? {
              id: project.offerId,
              fundingGoal: Number(project.offerFundingGoal),
              raisedAmount: Number(project.offerRaisedAmount),
              committedAmount: Number(project.offerCommittedAmount),
              backersCount: Number(project.offerBackersCount),
              status: project.offerStatus,
              closingDate: project.offerClosingDate,
              publishedAt: project.offerPublishedAt,
            }
          : null,
        timeline: timeline.results,
        documents: documents.results,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

function nullableNumber(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}
