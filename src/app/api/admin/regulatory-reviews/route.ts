import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  isDistributionScope,
  isIndependentReviewComplete,
  isMarketAuthorityPath,
  isRegulatoryClearanceComplete,
  isReviewCheckStatus,
  isReviewDecision,
  missingRegulatoryRequirements,
  type RegulatoryReviewInput,
} from "@/lib/regulatory-review";

interface ReviewRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  distributionScope: RegulatoryReviewInput["distributionScope"];
  marketAuthorityPath: RegulatoryReviewInput["marketAuthorityPath"];
  corporateActsStatus: RegulatoryReviewInput["corporateActsStatus"];
  paymentSafeguardingStatus: RegulatoryReviewInput["paymentSafeguardingStatus"];
  beneficialOwnersStatus: RegulatoryReviewInput["beneficialOwnersStatus"];
  riskDisclosureStatus: RegulatoryReviewInput["riskDisclosureStatus"];
  corporateApprovalRef: string | null;
  paymentProviderName: string | null;
  paymentProviderApprovalRef: string | null;
  fundSafeguardingRef: string | null;
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

const WRITE_ROLES = new Set(["compliance", "legal", "validator", "superadmin"]);

export async function GET(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim();
  const database = getD1();
  if (projectId) {
    const review = await getReview(database, projectId);
    return NextResponse.json(
      { review: review ? mapReview(review) : null, editable: WRITE_ROLES.has(admin.role) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const result = await database
    .prepare(`SELECT * FROM RegulatoryReview ORDER BY updatedAt DESC`)
    .all<ReviewRow>();
  return NextResponse.json(
    {
      reviews: result.results.map(mapReview),
      editable: WRITE_ROLES.has(admin.role),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function PUT(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!WRITE_ROLES.has(admin.role)) {
    return NextResponse.json(
      { error: "Votre rôle ne permet pas de valider le cadre de publication." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Informations illisibles." }, { status: 400 });
  }

  const projectId = shortText(body.projectId, 180);
  const parsed = parseReview(body);
  if (!projectId || !parsed) {
    return NextResponse.json(
      { error: "Veuillez compléter les choix proposés sans modifier leurs valeurs." },
      { status: 400 }
    );
  }
  if (parsed.decision === "blocked" && !parsed.restrictions?.trim()) {
    return NextResponse.json(
      { error: "Expliquez le point bloquant avant d’enregistrer cette décision." },
      { status: 400 }
    );
  }
  if (parsed.decision === "cleared" && !isRegulatoryClearanceComplete(parsed)) {
    return NextResponse.json(
      {
        error: "La publication reste bloquée tant que tous les contrôles ne sont pas confirmés.",
        missing: missingRegulatoryRequirements(parsed),
      },
      { status: 409 }
    );
  }

  const database = getD1();
  const project = await database
    .prepare(`SELECT id, title FROM Project WHERE id = ? LIMIT 1`)
    .bind(projectId)
    .first<{ id: string; title: string }>();
  if (!project) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const existing = await getReview(database, projectId);
  if (
    parsed.decision === "cleared" &&
    (!existing || existing.preparedBy === admin.adminId)
  ) {
    return NextResponse.json(
      {
        error: existing
          ? "La confirmation finale doit être effectuée par une seconde personne habilitée."
          : "Enregistrez d’abord l’étude. Une seconde personne habilitée pourra ensuite la confirmer.",
        code: "INDEPENDENT_REVIEW_REQUIRED",
      },
      { status: 409 }
    );
  }
  const now = isoNow();
  const reviewId = existing?.id || crypto.randomUUID();
  const preparedBy =
    parsed.decision === "pending" ? admin.adminId : existing?.preparedBy || admin.adminId;
  const reviewedBy = parsed.decision === "pending" ? null : admin.adminId;
  const reviewedAt = parsed.decision === "pending" ? null : now;

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO RegulatoryReview
           (id, projectId, distributionScope, marketAuthorityPath,
            corporateActsStatus, paymentSafeguardingStatus,
            beneficialOwnersStatus, riskDisclosureStatus, corporateApprovalRef,
            paymentProviderName, paymentProviderApprovalRef, fundSafeguardingRef,
            countryOpinionRef, authorityReference, restrictions, decision,
            preparedBy, reviewedBy, reviewedAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(projectId) DO UPDATE SET
             distributionScope = excluded.distributionScope,
             marketAuthorityPath = excluded.marketAuthorityPath,
             corporateActsStatus = excluded.corporateActsStatus,
             paymentSafeguardingStatus = excluded.paymentSafeguardingStatus,
             beneficialOwnersStatus = excluded.beneficialOwnersStatus,
             riskDisclosureStatus = excluded.riskDisclosureStatus,
             corporateApprovalRef = excluded.corporateApprovalRef,
             paymentProviderName = excluded.paymentProviderName,
             paymentProviderApprovalRef = excluded.paymentProviderApprovalRef,
             fundSafeguardingRef = excluded.fundSafeguardingRef,
             countryOpinionRef = excluded.countryOpinionRef,
             authorityReference = excluded.authorityReference,
             restrictions = excluded.restrictions,
             decision = excluded.decision,
             preparedBy = excluded.preparedBy,
             reviewedBy = excluded.reviewedBy,
             reviewedAt = excluded.reviewedAt,
             updatedAt = excluded.updatedAt`
        )
        .bind(
          reviewId,
          projectId,
          parsed.distributionScope,
          parsed.marketAuthorityPath,
          parsed.corporateActsStatus,
          parsed.paymentSafeguardingStatus,
          parsed.beneficialOwnersStatus,
          parsed.riskDisclosureStatus,
          parsed.corporateApprovalRef,
          parsed.paymentProviderName,
          parsed.paymentProviderApprovalRef,
          parsed.fundSafeguardingRef,
          parsed.countryOpinionRef || null,
          parsed.authorityReference || null,
          parsed.restrictions || null,
          parsed.decision,
          preparedBy,
          reviewedBy,
          reviewedAt,
          existing?.createdAt || now,
          now
        ),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'admin', ?, ?, 'regulatory_review', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          admin.adminId,
          `regulatory_review_${parsed.decision}`,
          reviewId,
          JSON.stringify({ projectId, ...parsed }),
          requestIp(req),
          now
        ),
      database
        .prepare(
          `INSERT INTO ProjectEvent
           (id, projectId, eventType, description, actor, createdAt)
           VALUES (?, ?, 'regulatory_review', ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          projectId,
          reviewEventDescription(parsed.decision),
          admin.adminId,
          now
        ),
    ]);
  } catch (error) {
    console.error("regulatory_review_write_failed", error);
    return NextResponse.json(
      { error: "La revue n’a pas pu être enregistrée. Vérifiez les éléments fournis." },
      { status: 409 }
    );
  }

  const review = await getReview(database, projectId);
  return NextResponse.json({ review: review ? mapReview(review) : null });
}

function parseReview(body: Record<string, unknown>): RegulatoryReviewInput | null {
  const distributionScope = body.distributionScope;
  const marketAuthorityPath = body.marketAuthorityPath;
  const corporateActsStatus = body.corporateActsStatus;
  const paymentSafeguardingStatus = body.paymentSafeguardingStatus;
  const beneficialOwnersStatus = body.beneficialOwnersStatus;
  const riskDisclosureStatus = body.riskDisclosureStatus;
  const decision = body.decision;
  if (
    !isDistributionScope(distributionScope) ||
    !isMarketAuthorityPath(marketAuthorityPath) ||
    !isReviewCheckStatus(corporateActsStatus) ||
    !isReviewCheckStatus(paymentSafeguardingStatus) ||
    !isReviewCheckStatus(beneficialOwnersStatus) ||
    !isReviewCheckStatus(riskDisclosureStatus) ||
    !isReviewDecision(decision)
  ) {
    return null;
  }
  return {
    distributionScope,
    marketAuthorityPath,
    corporateActsStatus,
    paymentSafeguardingStatus,
    beneficialOwnersStatus,
    riskDisclosureStatus,
    corporateApprovalRef: shortText(body.corporateApprovalRef, 240) || "",
    paymentProviderName: shortText(body.paymentProviderName, 240) || "",
    paymentProviderApprovalRef:
      shortText(body.paymentProviderApprovalRef, 240) || "",
    fundSafeguardingRef: shortText(body.fundSafeguardingRef, 240) || "",
    countryOpinionRef: shortText(body.countryOpinionRef, 240) || "",
    authorityReference: shortText(body.authorityReference, 240),
    restrictions: shortText(body.restrictions, 3000),
    decision,
  };
}

async function getReview(database: D1Database, projectId: string) {
  return database
    .prepare(`SELECT * FROM RegulatoryReview WHERE projectId = ? LIMIT 1`)
    .bind(projectId)
    .first<ReviewRow>();
}

function mapReview(row: ReviewRow) {
  const input: RegulatoryReviewInput = {
    distributionScope: row.distributionScope,
    marketAuthorityPath: row.marketAuthorityPath,
    corporateActsStatus: row.corporateActsStatus,
    paymentSafeguardingStatus: row.paymentSafeguardingStatus,
    beneficialOwnersStatus: row.beneficialOwnersStatus,
    riskDisclosureStatus: row.riskDisclosureStatus,
    corporateApprovalRef: row.corporateApprovalRef || "",
    paymentProviderName: row.paymentProviderName || "",
    paymentProviderApprovalRef: row.paymentProviderApprovalRef || "",
    fundSafeguardingRef: row.fundSafeguardingRef || "",
    countryOpinionRef: row.countryOpinionRef || "",
    authorityReference: row.authorityReference,
    restrictions: row.restrictions,
    decision: row.decision,
  };
  return {
    ...row,
    complete:
      isRegulatoryClearanceComplete(input) && isIndependentReviewComplete(row),
    missing: [
      ...missingRegulatoryRequirements(input),
      ...(isIndependentReviewComplete(row)
        ? []
        : ["confirmation par une seconde personne habilitée"]),
    ],
  };
}

function shortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function reviewEventDescription(decision: RegulatoryReviewInput["decision"]) {
  if (decision === "cleared") return "Cadre de publication confirmé";
  if (decision === "blocked") return "Publication suspendue après revue";
  return "Revue du cadre de publication mise à jour";
}
