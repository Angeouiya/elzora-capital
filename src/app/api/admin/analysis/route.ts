import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { canActorTransition, canTransition } from "@/lib/workflow";
import {
  isRegulatoryClearanceComplete,
  missingRegulatoryRequirements,
  type RegulatoryReviewInput,
} from "@/lib/regulatory-review";

interface AnalysisProjectRow extends Record<string, unknown> {
  id: string;
  companyId: string;
  submittedBy: string;
  title: string;
  description: string;
  longDescription: string;
  sector: string;
  country: string;
  city: string;
  instrumentType: string;
  fundingGoal: number;
  companyContribution: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  fundedAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  analysisNote: string | null;
  createdAt: string;
  updatedAt: string;
  companyLegalName: string;
  companyTradeName: string | null;
  companyLegalForm: string;
  companyVerificationStatus: string;
  companyCountry: string;
}

interface EventRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  eventType: string;
  description: string;
  actor: string;
  createdAt: string;
}

interface OfferRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  status: string;
  publishedAt: string;
  closingDate: string;
  raisedAmount: number;
  fundingGoal: number;
}

interface RegulatoryReviewRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  distributionScope: RegulatoryReviewInput["distributionScope"];
  marketAuthorityPath: RegulatoryReviewInput["marketAuthorityPath"];
  corporateActsStatus: RegulatoryReviewInput["corporateActsStatus"];
  paymentSafeguardingStatus: RegulatoryReviewInput["paymentSafeguardingStatus"];
  beneficialOwnersStatus: RegulatoryReviewInput["beneficialOwnersStatus"];
  riskDisclosureStatus: RegulatoryReviewInput["riskDisclosureStatus"];
  countryOpinionRef: string | null;
  authorityReference: string | null;
  restrictions: string | null;
  decision: RegulatoryReviewInput["decision"];
  preparedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const [projectResult, eventResult, offerResult, reviewResult] = await Promise.all([
    database
      .prepare(
        `SELECT p.id, p.companyId, p.submittedBy, p.title, p.description,
                p.longDescription, p.sector, p.country, p.city,
                p.instrumentType, p.fundingGoal, p.companyContribution,
                p.annualRate, p.ratePeriod, p.durationMonths, p.repaymentType,
                p.equityOfferedPct, p.valuationPre, p.minInvestment,
                p.maxInvestment, p.status, p.submittedAt, p.reviewedAt,
                p.publishedAt, p.fundedAt, p.closedAt, p.rejectionReason,
                p.analysisNote, p.createdAt, p.updatedAt,
                c.legalName AS companyLegalName,
                c.tradeName AS companyTradeName,
                c.legalForm AS companyLegalForm,
                c.verificationStatus AS companyVerificationStatus,
                c.country AS companyCountry
         FROM Project p
         JOIN Company c ON c.id = p.companyId
         ORDER BY p.updatedAt DESC`
      )
      .all<AnalysisProjectRow>(),
    database
      .prepare(
        `SELECT id, projectId, eventType, description, actor, createdAt
         FROM ProjectEvent ORDER BY createdAt DESC`
      )
      .all<EventRow>(),
    database
      .prepare(
        `SELECT id, projectId, status, publishedAt, closingDate,
                raisedAmount, fundingGoal
         FROM Offer`
      )
      .all<OfferRow>(),
    database
      .prepare(`SELECT * FROM RegulatoryReview ORDER BY updatedAt DESC`)
      .all<RegulatoryReviewRow>(),
  ]);

  const eventsByProject = new Map<string, EventRow[]>();
  for (const event of eventResult.results) {
    const events = eventsByProject.get(event.projectId) || [];
    if (events.length < 20) events.push(event);
    eventsByProject.set(event.projectId, events);
  }
  const offersByProject = new Map(offerResult.results.map((offer) => [offer.projectId, offer]));
  const reviewsByProject = new Map(
    reviewResult.results.map((review) => [review.projectId, review])
  );

  const projects = projectResult.results.map((row) => {
    const offer = offersByProject.get(row.id);
    const regulatoryReview = reviewsByProject.get(row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      longDescription: row.longDescription,
      sector: row.sector,
      country: row.country,
      city: row.city,
      instrumentType: row.instrumentType,
      fundingGoal: Number(row.fundingGoal),
      companyContribution: Number(row.companyContribution),
      annualRate: row.annualRate,
      ratePeriod: row.ratePeriod,
      durationMonths: row.durationMonths,
      repaymentType: row.repaymentType,
      equityOfferedPct: row.equityOfferedPct,
      valuationPre: row.valuationPre == null ? null : Number(row.valuationPre),
      minInvestment: Number(row.minInvestment),
      maxInvestment: row.maxInvestment == null ? null : Number(row.maxInvestment),
      status: row.status,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      publishedAt: row.publishedAt,
      fundedAt: row.fundedAt,
      closedAt: row.closedAt,
      rejectionReason: row.rejectionReason,
      analysisNote: row.analysisNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: {
        id: row.companyId,
        legalName: row.companyLegalName,
        tradeName: row.companyTradeName,
        legalForm: row.companyLegalForm,
        verificationStatus: row.companyVerificationStatus,
        country: row.companyCountry,
      },
      timeline: eventsByProject.get(row.id) || [],
      regulatoryReview: regulatoryReview ? mapRegulatoryReview(regulatoryReview) : null,
      offer: offer
        ? {
            id: offer.id,
            status: offer.status,
            publishedAt: offer.publishedAt,
            closingDate: offer.closingDate,
            raisedAmount: Number(offer.raisedAmount),
            fundingGoal: Number(offer.fundingGoal),
          }
        : null,
    };
  });

  const now = isoNow();
  await database
    .prepare(
      `INSERT INTO AuditLog
       (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       VALUES (?, 'admin', ?, 'admin_analysis_list_viewed', 'project', 'all', ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      admin.adminId,
      JSON.stringify({ count: projects.length }),
      requestIp(req),
      now
    )
    .run();

  return NextResponse.json(
    { projects },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const projectId = String(body.projectId || "").trim();
  const targetStatus = String(body.targetStatus || "").trim();
  const note = String(body.note || "").trim().slice(0, 3000);
  if (!projectId || !targetStatus) {
    return NextResponse.json(
      { error: "Projet et décision requis." },
      { status: 400 }
    );
  }
  if (["rejected", "complement_requested", "defaulted"].includes(targetStatus) && !note) {
    return NextResponse.json(
      { error: "Une note motivée est obligatoire pour cette décision." },
      { status: 400 }
    );
  }

  const database = getD1();
  const project = await database
    .prepare(
      `SELECT p.*, o.id AS offerId
       FROM Project p LEFT JOIN Offer o ON o.projectId = p.id
       WHERE p.id = ? LIMIT 1`
    )
    .bind(projectId)
    .first<AnalysisProjectRow & { offerId: string | null }>();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  if (!canActorTransition(project.status, targetStatus, admin.role)) {
    return NextResponse.json(
      { error: "Votre rôle ne permet pas cette décision." },
      { status: 403 }
    );
  }
  if (!canTransition(project.status, targetStatus)) {
    return NextResponse.json(
      { error: "Cette évolution n'est pas autorisée pour le statut actuel." },
      { status: 400 }
    );
  }

  if (["approved", "published"].includes(targetStatus)) {
    const review = await database
      .prepare(`SELECT * FROM RegulatoryReview WHERE projectId = ? LIMIT 1`)
      .bind(projectId)
      .first<RegulatoryReviewRow>();
    const reviewInput = review ? regulatoryReviewInput(review) : null;
    if (!isRegulatoryClearanceComplete(reviewInput)) {
      return NextResponse.json(
        {
          error:
            "La validation du cadre de publication doit être terminée avant cette décision.",
          missing: missingRegulatoryRequirements(reviewInput),
        },
        { status: 409 }
      );
    }
  }

  const now = isoNow();
  const updates = ["status = ?", "updatedAt = ?"];
  const values: unknown[] = [targetStatus, now];
  if (note) {
    updates.push("analysisNote = ?");
    values.push(note);
  }
  if (targetStatus === "rejected") {
    updates.push("rejectionReason = ?");
    values.push(note);
  }
  if (["approved", "rejected", "complement_requested"].includes(targetStatus) && !project.reviewedAt) {
    updates.push("reviewedAt = ?");
    values.push(now);
  }
  if (targetStatus === "published") {
    updates.push("publishedAt = ?");
    values.push(now);
  }
  if (targetStatus === "funded" && !project.fundedAt) {
    updates.push("fundedAt = ?");
    values.push(now);
  }
  if (targetStatus === "closed") {
    updates.push("closedAt = ?");
    values.push(now);
  }
  values.push(projectId);

  const statements: D1PreparedStatement[] = [
    database
      .prepare(`UPDATE Project SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values),
  ];

  let offerId = project.offerId;
  const offerCreated = targetStatus === "published" && !offerId;
  if (offerCreated) {
    offerId = crypto.randomUUID();
    const closingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    statements.push(
      database
        .prepare(
          `INSERT INTO Offer
           (id, projectId, version, fundingGoal, minInvestment, maxInvestment,
            annualRate, ratePeriod, durationMonths, repaymentType,
            equityOfferedPct, valuationPre, upfrontCommissionPct,
            annualFollowUpPct, raisedAmount, committedAmount, backersCount,
            publishedAt, closingDate, visibility, status, createdAt)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 6, 2, 0, 0, 0, ?, ?, 'public', 'open', ?)`
        )
        .bind(
          offerId,
          projectId,
          project.fundingGoal,
          project.minInvestment,
          project.maxInvestment,
          project.annualRate,
          project.ratePeriod,
          project.durationMonths,
          project.repaymentType,
          project.equityOfferedPct,
          project.valuationPre,
          now,
          closingDate,
          now
        )
    );
  }

  const description = `${note ? `${note} — ` : ""}Transition ${project.status} → ${targetStatus}`;
  statements.push(
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), projectId, targetStatus, description, admin.adminId, now),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'admin', ?, ?, 'project', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        `project_${targetStatus}`,
        projectId,
        JSON.stringify({ from: project.status, to: targetStatus, note, offerCreated }),
        requestIp(req),
        now
      )
  );

  const notifications: Record<string, { title: string; message: string }> = {
    under_review: {
      title: "Dossier en cours d'analyse",
      message: `Votre dossier « ${project.title} » est en cours d'analyse.`,
    },
    complement_requested: {
      title: "Complément demandé",
      message: `Des compléments sont demandés sur « ${project.title} » : ${note}`,
    },
    approved: {
      title: "Dossier approuvé",
      message: `Votre dossier « ${project.title} » a été approuvé.`,
    },
    rejected: {
      title: "Dossier refusé",
      message: `Votre dossier « ${project.title} » a été refusé : ${note}`,
    },
    published: {
      title: "Offre publiée",
      message: `L'offre « ${project.title} » est désormais ouverte aux souscriptions.`,
    },
    funded: {
      title: "Financement atteint",
      message: `Le financement de « ${project.title} » est atteint.`,
    },
  };
  const notification = notifications[targetStatus];
  if (notification) {
    statements.push(
      database
        .prepare(
          `INSERT INTO Notification
           (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'decision', ?, ?, 0, 'company_dashboard', ?)`
        )
        .bind(
          crypto.randomUUID(),
          project.submittedBy,
          notification.title,
          notification.message,
          now
        )
    );
  }

  await database.batch(statements);
  return NextResponse.json({
    project: { id: projectId, status: targetStatus, updatedAt: now },
    offer: offerId ? { id: offerId, status: "open" } : null,
  });
}

function regulatoryReviewInput(row: RegulatoryReviewRow): RegulatoryReviewInput {
  return {
    distributionScope: row.distributionScope,
    marketAuthorityPath: row.marketAuthorityPath,
    corporateActsStatus: row.corporateActsStatus,
    paymentSafeguardingStatus: row.paymentSafeguardingStatus,
    beneficialOwnersStatus: row.beneficialOwnersStatus,
    riskDisclosureStatus: row.riskDisclosureStatus,
    countryOpinionRef: row.countryOpinionRef || "",
    authorityReference: row.authorityReference,
    restrictions: row.restrictions,
    decision: row.decision,
  };
}

function mapRegulatoryReview(row: RegulatoryReviewRow) {
  const input = regulatoryReviewInput(row);
  return {
    ...row,
    complete: isRegulatoryClearanceComplete(input),
    missing: missingRegulatoryRequirements(input),
  };
}
