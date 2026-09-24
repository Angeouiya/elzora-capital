import assert from "node:assert/strict";
import test from "node:test";
import {
  isRegulatoryClearanceComplete,
  missingRegulatoryRequirements,
  type RegulatoryReviewInput,
} from "./regulatory-review";

const completeReview: RegulatoryReviewInput = {
  distributionScope: "restricted_private",
  marketAuthorityPath: "private_route_confirmed",
  corporateActsStatus: "confirmed",
  paymentSafeguardingStatus: "confirmed",
  beneficialOwnersStatus: "confirmed",
  riskDisclosureStatus: "confirmed",
  countryOpinionRef: "AVIS-CI-2026-014",
  authorityReference: null,
  restrictions: "Accès réservé aux personnes vérifiées.",
  decision: "cleared",
};

test("a complete private-distribution review clears the publication gate", () => {
  assert.equal(isRegulatoryClearanceComplete(completeReview), true);
  assert.deepEqual(missingRegulatoryRequirements(completeReview), []);
});

test("a public offering requires an authority reference", () => {
  const review = { ...completeReview, distributionScope: "public_offering" as const };
  assert.equal(isRegulatoryClearanceComplete(review), false);
  assert.deepEqual(missingRegulatoryRequirements(review), [
    "référence de l’autorité compétente",
  ]);
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
