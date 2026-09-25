export const REVIEW_CHECK_STATUSES = ["pending", "confirmed", "blocked"] as const;
export const DISTRIBUTION_SCOPES = ["pending", "restricted_private", "public_offering"] as const;
export const MARKET_AUTHORITY_PATHS = [
  "pending",
  "private_route_confirmed",
  "authority_clearance",
  "visa_obtained",
] as const;
export const REVIEW_DECISIONS = ["pending", "cleared", "blocked"] as const;

export type ReviewCheckStatus = (typeof REVIEW_CHECK_STATUSES)[number];
export type DistributionScope = (typeof DISTRIBUTION_SCOPES)[number];
export type MarketAuthorityPath = (typeof MARKET_AUTHORITY_PATHS)[number];
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export interface RegulatoryReviewInput {
  distributionScope: DistributionScope;
  marketAuthorityPath: MarketAuthorityPath;
  corporateActsStatus: ReviewCheckStatus;
  paymentSafeguardingStatus: ReviewCheckStatus;
  beneficialOwnersStatus: ReviewCheckStatus;
  riskDisclosureStatus: ReviewCheckStatus;
  corporateApprovalRef: string;
  paymentProviderName: string;
  paymentProviderApprovalRef: string;
  fundSafeguardingRef: string;
  countryOpinionRef: string;
  authorityReference?: string | null;
  restrictions?: string | null;
  decision: ReviewDecision;
}

const CONFIRMED_FIELDS: Array<{
  key: keyof Pick<
    RegulatoryReviewInput,
    | "corporateActsStatus"
    | "paymentSafeguardingStatus"
    | "beneficialOwnersStatus"
    | "riskDisclosureStatus"
  >;
  label: string;
}> = [
  { key: "corporateActsStatus", label: "actes et autorisations de l’entreprise" },
  { key: "paymentSafeguardingStatus", label: "circuit de paiement et protection des fonds" },
  { key: "beneficialOwnersStatus", label: "dirigeants et bénéficiaires effectifs" },
  { key: "riskDisclosureStatus", label: "information complète des investisseurs" },
];

export function missingRegulatoryRequirements(
  review: RegulatoryReviewInput | null | undefined
): string[] {
  if (!review) return ["revue réglementaire"];

  const missing: string[] = [];
  if (review.distributionScope === "pending") missing.push("périmètre de diffusion");
  if (review.marketAuthorityPath === "pending") missing.push("qualification AMF-UMOA");
  if (
    review.distributionScope === "restricted_private" &&
    !["private_route_confirmed", "authority_clearance"].includes(
      review.marketAuthorityPath
    )
  ) {
    missing.push("parcours cohérent avec une diffusion privée");
  }
  if (
    review.distributionScope === "public_offering" &&
    review.marketAuthorityPath !== "visa_obtained"
  ) {
    missing.push("visa de l’autorité de marché");
  }
  for (const field of CONFIRMED_FIELDS) {
    if (review[field.key] !== "confirmed") missing.push(field.label);
  }
  if (!review.corporateApprovalRef.trim()) {
    missing.push("référence de la décision sociale");
  }
  if (!review.paymentProviderName.trim()) {
    missing.push("prestataire de paiement identifié");
  }
  if (!review.paymentProviderApprovalRef.trim()) {
    missing.push("agrément ou enregistrement du prestataire de paiement");
  }
  if (!review.fundSafeguardingRef.trim()) {
    missing.push("preuve de protection des fonds");
  }
  if (!review.countryOpinionRef.trim()) missing.push("avis juridique local référencé");
  if (
    review.distributionScope === "public_offering" &&
    !review.authorityReference?.trim()
  ) {
    missing.push("référence de l’autorité compétente");
  }
  return missing;
}

export function isRegulatoryClearanceComplete(
  review: RegulatoryReviewInput | null | undefined
): boolean {
  return review?.decision === "cleared" && missingRegulatoryRequirements(review).length === 0;
}

export function isIndependentReviewComplete(review: {
  preparedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
} | null | undefined): boolean {
  return Boolean(
    review?.reviewedBy &&
      review.reviewedAt &&
      review.reviewedBy !== review.preparedBy
  );
}

export function offerVisibilityForRegulatoryReview(
  review: RegulatoryReviewInput | null | undefined
): "public" | "restricted" | null {
  if (!isRegulatoryClearanceComplete(review)) return null;
  return review?.distributionScope === "public_offering" ? "public" : "restricted";
}

export function isReviewCheckStatus(value: unknown): value is ReviewCheckStatus {
  return REVIEW_CHECK_STATUSES.includes(value as ReviewCheckStatus);
}

export function isDistributionScope(value: unknown): value is DistributionScope {
  return DISTRIBUTION_SCOPES.includes(value as DistributionScope);
}

export function isMarketAuthorityPath(value: unknown): value is MarketAuthorityPath {
  return MARKET_AUTHORITY_PATHS.includes(value as MarketAuthorityPath);
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return REVIEW_DECISIONS.includes(value as ReviewDecision);
}
