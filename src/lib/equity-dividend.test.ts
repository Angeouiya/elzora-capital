import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateDividendAmounts,
  calculatePlatformDividendPool,
} from "./equity-dividend";

test("platform dividend pool follows the issued ownership percentage", () => {
  assert.equal(calculatePlatformDividendPool(80_000_000, 12_500_000), 10_000_000);
  assert.equal(calculatePlatformDividendPool(1_000_000, 3_333_333), 33_333);
});

test("dividend allocation preserves gross, withholding and net totals", () => {
  const result = allocateDividendAmounts(10_000_000, 1_000_000, [
    { id: "a", ownershipMicroPct: 3_125_000 },
    { id: "b", ownershipMicroPct: 9_375_000 },
  ]);

  assert.deepEqual(result, [
    { id: "a", grossAmount: 2_500_000, withholdingAmount: 250_000, netAmount: 2_250_000 },
    { id: "b", grossAmount: 7_500_000, withholdingAmount: 750_000, netAmount: 6_750_000 },
  ]);
  assert.equal(result.reduce((sum, item) => sum + item.netAmount, 0), 9_000_000);
});

test("dividend allocation rejects an incoherent withholding", () => {
  assert.throws(
    () =>
      allocateDividendAmounts(100_000, 100_000, [
        { id: "a", ownershipMicroPct: 1_000_000 },
      ]),
    /retenue/
  );
});
