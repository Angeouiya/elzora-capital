import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateInvestmentSharePct,
  calculateOfferAllocationPct,
  createSubscriptionEvidence,
  type CreateSubscriptionEvidenceInput,
} from "./subscription-evidence";

test("equity ownership is the investor's fraction of the equity actually offered", () => {
  assert.equal(calculateOfferAllocationPct(50_000_000, 500_000_000), 10);
  assert.equal(calculateInvestmentSharePct(50_000_000, 500_000_000, "equity", 15), 1.5);
});

test("debt participation remains the fraction of the funded offer", () => {
  assert.equal(calculateInvestmentSharePct(50_000, 1_000_000, "debt", null), 5);
});

test("subscription evidence is deterministic and changes when a material term changes", async () => {
  const base: CreateSubscriptionEvidenceInput = {
    investmentId: "inv-1",
    investorId: "user-1",
    investorEmail: "Investor@Example.com",
    amount: 50_000_000,
    sharePct: 1.5,
    signedAt: "2026-09-24T12:00:00.000Z",
    locale: "fr",
    offer: {
      id: "offer-1",
      projectId: "project-1",
      version: 3,
      title: "Croissance régionale",
      instrumentType: "equity",
      fundingGoal: 500_000_000,
      minInvestment: 1_000_000,
      maxInvestment: 50_000_000,
      annualRate: null,
      ratePeriod: null,
      durationMonths: null,
      repaymentType: null,
      equityOfferedPct: 15,
      valuationPre: 2_500_000_000,
      upfrontCommissionPct: 6,
      annualFollowUpPct: 0,
      closingDate: "2026-12-31T23:59:59.000Z",
    },
  };

  const first = await createSubscriptionEvidence(base);
  const second = await createSubscriptionEvidence(base);
  const changed = await createSubscriptionEvidence({
    ...base,
    offer: { ...base.offer, equityOfferedPct: 16 },
  });

  assert.equal(first.agreementHash, second.agreementHash);
  assert.equal(first.signedPayloadHash, second.signedPayloadHash);
  assert.notEqual(first.agreementHash, changed.agreementHash);
  assert.notEqual(first.signedPayloadHash, changed.signedPayloadHash);
  assert.match(first.agreementHash, /^[a-f0-9]{64}$/);
  assert.match(first.signedPayloadHash, /^[a-f0-9]{64}$/);
});
