import assert from "node:assert/strict";
import test from "node:test";
import {
  isRegulatoryClearanceComplete,
  isIndependentReviewComplete,
  missingRegulatoryRequirements,
  offerVisibilityForRegulatoryReview,
  type RegulatoryReviewInput,
} from "./regulatory-review";

const completeReview: RegulatoryReviewInput = {
  distributionScope: "restricted_private",
  marketAuthorityPath: "private_route_confirmed",
  corporateActsStatus: "confirmed",
  paymentSafeguardingStatus: "confirmed",
  beneficialOwnersStatus: "confirmed",
  riskDisclosureStatus: "confirmed",
  corporateApprovalRef: "PV-AGE-2026-014",
  paymentProviderName: "Prestataire agréé UMOA",
  paymentProviderApprovalRef: "BCEAO-EP-2026-014",
  fundSafeguardingRef: "CONV-CANTONNEMENT-2026-014",
  countryOpinionRef: "AVIS-CI-2026-014",
  authorityReference: null,
  restrictions: "Accès réservé aux personnes vérifiées.",
  decision: "cleared",
};

test("a complete private-distribution review clears the publication gate", () => {
  assert.equal(isRegulatoryClearanceComplete(completeReview), true);
  assert.deepEqual(missingRegulatoryRequirements(completeReview), []);
  assert.equal(offerVisibilityForRegulatoryReview(completeReview), "restricted");
});

test("a public offering requires a visa and its authority reference", () => {
  const review = { ...completeReview, distributionScope: "public_offering" as const };
  assert.equal(isRegulatoryClearanceComplete(review), false);
  assert.deepEqual(missingRegulatoryRequirements(review), [
    "visa de l’autorité de marché",
    "référence de l’autorité compétente",
  ]);
});

test("a visa-backed public offering maps to public visibility", () => {
  const review = {
    ...completeReview,
    distributionScope: "public_offering" as const,
    marketAuthorityPath: "visa_obtained" as const,
    authorityReference: "AMF-UMOA-VISA-2026-014",
  };
  assert.equal(isRegulatoryClearanceComplete(review), true);
  assert.equal(offerVisibilityForRegulatoryReview(review), "public");
});

test("an incoherent private route cannot be cleared", () => {
  const review = { ...completeReview, marketAuthorityPath: "visa_obtained" as const };
  assert.equal(isRegulatoryClearanceComplete(review), false);
  assert.deepEqual(missingRegulatoryRequirements(review), [
    "parcours cohérent avec une diffusion privée",
  ]);
});

test("the final review must be confirmed by a second person", () => {
  assert.equal(
    isIndependentReviewComplete({
      preparedBy: "admin-a",
      reviewedBy: "admin-b",
      reviewedAt: "2026-09-25T10:00:00.000Z",
    }),
    true
  );
  assert.equal(
    isIndependentReviewComplete({
      preparedBy: "admin-a",
      reviewedBy: "admin-a",
      reviewedAt: "2026-09-25T10:00:00.000Z",
    }),
    false
  );
});

test("a cleared label cannot hide an incomplete operational checklist", () => {
  const review = {
    ...completeReview,
    paymentSafeguardingStatus: "pending" as const,
    countryOpinionRef: "",
  };
  assert.equal(isRegulatoryClearanceComplete(review), false);
  assert.deepEqual(missingRegulatoryRequirements(review), [
    "circuit de paiement et protection des fonds",
    "avis juridique local référencé",
  ]);
});

test("clearance requires traceable corporate and payment evidence", () => {
  const review = {
    ...completeReview,
    corporateApprovalRef: "",
    paymentProviderName: "",
    paymentProviderApprovalRef: "",
    fundSafeguardingRef: "",
  };
  assert.equal(isRegulatoryClearanceComplete(review), false);
  assert.deepEqual(missingRegulatoryRequirements(review), [
    "référence de la décision sociale",
    "prestataire de paiement identifié",
    "agrément ou enregistrement du prestataire de paiement",
    "preuve de protection des fonds",
  ]);
});
