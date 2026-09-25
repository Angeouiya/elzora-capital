import assert from "node:assert/strict";
import test from "node:test";
import {
  declaredInvestableCapitalMax,
  investorAttentionLevel,
  isInvestorProfileCurrent,
  validateInvestorProfileInput,
} from "./investor-profile";

const completeProfile = {
  experience: "occasional",
  objective: "growth",
  horizon: "three_to_five",
  investableCapitalRange: "500k_2m",
  lossCapacity: "partial",
  riskComfort: "balanced",
  understandsCapitalLoss: true,
  understandsIlliquidity: true,
} as const;

test("investor profile requires complete choices and both risk acknowledgements", () => {
  assert.equal(validateInvestorProfileInput(completeProfile).ok, true);
  assert.deepEqual(
    validateInvestorProfileInput({ ...completeProfile, understandsIlliquidity: false }),
    { ok: false, code: "RISK_ACKNOWLEDGEMENT_REQUIRED" }
  );
  assert.deepEqual(
    validateInvestorProfileInput({ ...completeProfile, horizon: "unknown" }),
    { ok: false, code: "INVALID_PROFILE" }
  );
});

test("profile validity is based on an explicit future expiry", () => {
  const now = new Date("2026-09-25T08:00:00.000Z");
  assert.equal(
    isInvestorProfileCurrent(
      { completedAt: "2026-09-20T08:00:00.000Z", expiresAt: "2027-09-20T08:00:00.000Z" },
      now
    ),
    true
  );
  assert.equal(
    isInvestorProfileCurrent(
      { completedAt: "2025-09-20T08:00:00.000Z", expiresAt: "2026-09-20T08:00:00.000Z" },
      now
    ),
    false
  );
});

test("declared capital range caps cumulative commitments", () => {
  assert.equal(declaredInvestableCapitalMax("100k_500k"), 500_000);
  assert.equal(declaredInvestableCapitalMax("2m_10m"), 10_000_000);
  assert.equal(declaredInvestableCapitalMax("over_10m"), null);
  assert.equal(declaredInvestableCapitalMax("invalid"), 0);
});

test("first-time or loss-sensitive profiles receive heightened guidance", () => {
  assert.equal(investorAttentionLevel(completeProfile), "standard");
  assert.equal(
    investorAttentionLevel({ ...completeProfile, experience: "first_time" }),
    "heightened"
  );
});
