import test from "node:test";
import assert from "node:assert/strict";
import { assessCollectionPayment, DEFAULT_MOBILE_MONEY_LIMIT_XOF, emptyPaymentUsage } from "./payment-policy";

test("Mobile Money accepte exactement la limite par opération", () => {
  assert.equal(assessCollectionPayment({ amount: DEFAULT_MOBILE_MONEY_LIMIT_XOF, method: "mobile_money" }).decision, "allow");
});

test("Mobile Money bloque au-dessus de la limite par opération", () => {
  const result = assessCollectionPayment({ amount: DEFAULT_MOBILE_MONEY_LIMIT_XOF + 1, method: "mobile_money" });
  assert.equal(result.decision, "block");
  assert.equal(result.code, "PAYMENT_LIMIT_EXCEEDED");
});

test("le cumul sur 24 heures est bloquant", () => {
  const usage = { ...emptyPaymentUsage(), dailyTotal: 1_500_000, dailyCount: 2 };
  assert.equal(assessCollectionPayment({ amount: 600_000, method: "mobile_money", usage }).decision, "block");
});

test("le nombre d'opérations est bloquant", () => {
  const usage = { ...emptyPaymentUsage(), dailyCount: 5 };
  assert.equal(assessCollectionPayment({ amount: 100_000, method: "card", usage }).code, "PAYMENT_FREQUENCY_EXCEEDED");
});

test("un virement bancaire est toujours examiné avant instructions", () => {
  assert.equal(assessCollectionPayment({ amount: 2_000_000, method: "bank_transfer" }).decision, "review");
});

test("un profil PEP passe en examen renforcé", () => {
  const result = assessCollectionPayment({ amount: 100_000, method: "card", risk: { country: "CI", politicallyExposed: true } });
  assert.equal(result.decision, "review");
  assert.ok(result.riskScore >= 40);
});

test("les tentatives rapprochées déclenchent un examen", () => {
  const usage = { ...emptyPaymentUsage(), recent15mCount: 3 };
  assert.equal(assessCollectionPayment({ amount: 100_000, method: "card", usage }).decision, "review");
});
