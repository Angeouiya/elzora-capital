import assert from "node:assert/strict";
import test from "node:test";
import { buildEquityValueScenarios, totalReturnPct } from "./investment-simulation";

test("equity scenarios show both potential gain and potential loss", () => {
  const scenarios = buildEquityValueScenarios(500_000, 20);

  assert.deepEqual(scenarios, {
    referenceChangePct: 20,
    upside: { changePct: 20, estimatedValue: 600_000, gainOrLoss: 100_000 },
    downside: { changePct: -20, estimatedValue: 400_000, gainOrLoss: -100_000 },
  });
});

test("equity scenarios preserve integer money for uneven amounts", () => {
  const scenarios = buildEquityValueScenarios(333_333, 20);
  assert.equal(scenarios.upside.gainOrLoss, 66_666);
  assert.equal(scenarios.downside.estimatedValue, 266_667);
});

test("total return percentage compares the gain with the invested amount", () => {
  assert.equal(totalReturnPct(100_000, 20_500), 20.5);
});
