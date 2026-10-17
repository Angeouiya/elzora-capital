import assert from "node:assert/strict";
import test from "node:test";
import { canPrepareStage, canReviewStageEvidence, canSubmitStageEvidence, isEvidenceAfterTransfer, parseStagePlan, stageCommission, stageFinancials } from "./staged-disbursement";

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

test("the first stage needs no impossible pre-payment evidence", () => {
  assert.equal(canPrepareStage({ status: "planned", trancheNo: 1, previousTransferStatus: null, previousQualityStatus: null, previousReviewer: null }), true);
  assert.equal(canPrepareStage({ status: "evidence_submitted", trancheNo: 1, previousTransferStatus: null, previousQualityStatus: null, previousReviewer: null }), false);
});

test("the next stage waits for both payment and independent quality review of the prior stage", () => {
  const base = { status: "planned", trancheNo: 2, previousTransferStatus: "executed", previousQualityStatus: "qa_passed", previousReviewer: "reviewer-2" };
  assert.equal(canPrepareStage(base), true);
  assert.equal(canPrepareStage({ ...base, previousTransferStatus: "approved" }), false);
  assert.equal(canPrepareStage({ ...base, previousQualityStatus: "changes_requested" }), false);
  assert.equal(canPrepareStage({ ...base, previousReviewer: null }), false);
});

test("progress evidence and quality review happen only after the stage is paid", () => {
  assert.equal(canSubmitStageEvidence("planned", null), false);
  assert.equal(canSubmitStageEvidence("planned", "approved"), false);
  assert.equal(canSubmitStageEvidence("planned", "executed"), true);
  assert.equal(canSubmitStageEvidence("changes_requested", "executed"), true);
  assert.equal(canSubmitStageEvidence("qa_passed", "executed"), false);
  assert.equal(canReviewStageEvidence("evidence_submitted", "approved"), false);
  assert.equal(canReviewStageEvidence("evidence_submitted", "executed"), true);
});

test("quality evidence must be uploaded after the confirmed transfer", () => {
  const paidAt = "2026-10-17T12:00:00.000Z";
  assert.equal(isEvidenceAfterTransfer("2026-10-17T12:00:01.000Z", paidAt), true);
  assert.equal(isEvidenceAfterTransfer(paidAt, paidAt), true);
  assert.equal(isEvidenceAfterTransfer("2026-10-17T11:59:59.000Z", paidAt), false);
  assert.equal(isEvidenceAfterTransfer("invalid", paidAt), false);
  assert.equal(isEvidenceAfterTransfer(null, paidAt), false);
  assert.equal(isEvidenceAfterTransfer("2026-10-17T12:00:01.000Z", null), false);
});
