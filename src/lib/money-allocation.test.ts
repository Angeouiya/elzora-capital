import assert from "node:assert/strict";
import test from "node:test";
import { allocateEvenly, allocateProRata } from "./money-allocation";
import { verifySection28Scenario } from "./finance";

test("allocateEvenly preserves every unit", () => {
  const result = allocateEvenly(1_000_003, 6);
  assert.equal(result.length, 6);
  assert.equal(result.reduce((sum, value) => sum + value, 0), 1_000_003);
  assert.ok(Math.max(...result) - Math.min(...result) <= 1);
});

test("allocateProRata preserves total across uneven investments", () => {
  const result = allocateProRata(1_080_001, [10_000, 35_000, 55_000]);
  assert.deepEqual(result, [108_001, 378_000, 594_000]);
  assert.equal(result.reduce((sum, value) => sum + value, 0), 1_080_001);
});

test("allocateProRata rejects an empty or zero-weight allocation", () => {
  assert.throws(() => allocateProRata(100, []));
  assert.throws(() => allocateProRata(100, [0, 0]));
});

test("allocateProRata remains exact above Number multiplication precision", () => {
  const total = 8_000_000_000_001;
  const result = allocateProRata(total, [4_000_000_000_001, 3_999_999_999_999]);
  assert.equal(result.reduce((sum, value) => sum + value, 0), total);
  assert.ok(result.every(Number.isSafeInteger));
});

test("debt lifecycle keeps the reference financing scenario balanced", () => {
  const scenario = verifySection28Scenario();
  assert.equal(scenario.allPassed, true);
  const investors = allocateProRata(1_080_000, [10_000, 35_000, 55_000]);
  assert.equal(investors.reduce((sum, value) => sum + value, 0) + 10_000, 1_090_000);
});
