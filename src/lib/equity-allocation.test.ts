import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateEquityOwnership,
  equityCertificateNumber,
  equityPctToMicroPct,
} from "./equity-allocation";

test("equity ownership allocation preserves the complete offered capital", () => {
  const result = allocateEquityOwnership(12.5, [
    { investmentId: "inv-a", amount: 1_000_000 },
    { investmentId: "inv-b", amount: 3_000_000 },
  ]);
  assert.deepEqual(
    result.map((item) => item.ownershipMicroPct),
    [3_125_000, 9_375_000]
  );
  assert.equal(
    result.reduce((sum, item) => sum + item.ownershipMicroPct, 0),
    equityPctToMicroPct(12.5)
  );
  assert.deepEqual(
    result.map((item) => item.ownershipPct),
    [3.125, 9.375]
  );
});

test("equity ownership keeps every micro-percent across uneven tickets", () => {
  const result = allocateEquityOwnership(7.000001, [
    { investmentId: "inv-a", amount: 1 },
    { investmentId: "inv-b", amount: 2 },
    { investmentId: "inv-c", amount: 4 },
  ]);
  assert.equal(
    result.reduce((sum, item) => sum + item.ownershipMicroPct, 0),
    7_000_001
  );
});

test("certificate numbers are deterministic and contain no unsafe characters", () => {
  assert.equal(equityCertificateNumber("offer-abc_123", 7), "OFFERABC12-000007");
});
