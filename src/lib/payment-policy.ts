export const PAYMENT_POLICY_VERSION = "1.0";
export const DEFAULT_MOBILE_MONEY_LIMIT_XOF = 1_000_000;

export type CollectionPaymentMethod = "card" | "mobile_money";

export type PaymentPolicyAssessment =
  | {
      ok: true;
      method: CollectionPaymentMethod;
      limit: number | null;
    }
  | {
      ok: false;
      code: "INVALID_PAYMENT_AMOUNT" | "MOBILE_MONEY_LIMIT_EXCEEDED";
      method: CollectionPaymentMethod;
      limit: number | null;
    };

/**
 * Operational platform policy. It is deliberately separate from provider
 * capabilities so a checkout can never bypass the amount control.
 */
export function assessCollectionPayment({
  amount,
  method,
  mobileMoneyLimit = DEFAULT_MOBILE_MONEY_LIMIT_XOF,
}: {
  amount: number;
  method: CollectionPaymentMethod;
  mobileMoneyLimit?: number;
}): PaymentPolicyAssessment {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, code: "INVALID_PAYMENT_AMOUNT", method, limit: null };
  }
  if (method === "mobile_money" && amount > mobileMoneyLimit) {
    return {
      ok: false,
      code: "MOBILE_MONEY_LIMIT_EXCEEDED",
      method,
      limit: mobileMoneyLimit,
    };
  }
  return {
    ok: true,
    method,
    limit: method === "mobile_money" ? mobileMoneyLimit : null,
  };
}
