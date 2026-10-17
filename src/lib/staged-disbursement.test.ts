import assert from "node:assert/strict";
import test from "node:test";
import { canPrepareStage, parseStagePlan, stageCommission, stageFinancials } from "./staged-disbursement";

const stages = [
  { title: "Commande validée", grossAmount: 333_333, targetDate: "2026-11-01", qualityCriteria: "Bon de commande signé et équipements identifiés." },
  { title: "Installation contrôlée", grossAmount: 666_667, targetDate: "2027-02-01", qualityCriteria: "Procès verbal de réception et essais de qualité concluants." },
];

test("a stage plan must cover the exact funded amount with ordered, measurable milestones", () => {
  assert.equal(parseStagePlan(stages, 1_000_000).ok, true);
  assert.equal(parseStagePlan(stages, 999_999).ok, false);
  assert.equal(parseStagePlan([stages[1], stages[0]], 1_000_000).ok, false);
  assert.equal(parseStagePlan([{ ...stages[0], qualityCriteria: "ok" }, stages[1]], 1_000_000).ok, false);
});

test("commissions across uneven stages equal the contract commission exactly", () => {
  const first = stageCommission(333_333n, 0n, 6);
  const second = stageCommission(666_667n, 333_333n, 6);
  assert.equal(first + second, 60_000n);
  assert.equal(first + (333_333n - first) + second + (666_667n - second), 1_000_000n);
});

test("company payout figures reconcile gross, commission and net for every stage", () => {
  const first = stageFinancials(333_333, 0, 6);
  const second = stageFinancials(666_667, 333_333, 6);
  assert.equal(first.netAmount + first.commissionAmount, 333_333);
  assert.equal(second.netAmount + second.commissionAmount, 666_667);
  assert.equal(first.commissionAmount + second.commissionAmount, 60_000);
  assert.equal(first.netAmount + second.netAmount, 940_000);
  assert.throws(() => stageFinancials(100, 0, 100));
  assert.throws(() => stageFinancials(100, 0, 99.999));
});

test("a later stage remains blocked until the previous transfer is confirmed", () => {
  assert.equal(canPrepareStage({ status: "qa_passed", trancheNo: 1, previousStatus: null }), true);
  assert.equal(canPrepareStage({ status: "qa_passed", trancheNo: 2, previousStatus: "approved" }), false);
  assert.equal(canPrepareStage({ status: "qa_passed", trancheNo: 2, previousStatus: "executed" }), true);
  assert.equal(canPrepareStage({ status: "evidence_submitted", trancheNo: 1, previousStatus: null }), false);
});
