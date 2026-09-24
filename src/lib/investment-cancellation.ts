export type CancellationEligibilityCode =
  | "AVAILABLE"
  | "ALREADY_CANCELLED"
  | "PAYMENT_IN_PROGRESS"
  | "PAYMENT_CONFIRMED"
  | "WINDOW_EXPIRED"
  | "WINDOW_UNAVAILABLE"
  | "STATUS_NOT_ELIGIBLE";

export interface CancellableInvestment {
  status: string;
  reflectionEndsAt: string | null;
  paymentRef?: string | null;
}

export interface CancellationEligibility {
  allowed: boolean;
  code: CancellationEligibilityCode;
  deadline: string | null;
}

export function getCancellationEligibility(
  investment: CancellableInvestment,
  now = new Date()
): CancellationEligibility {
  const deadline = investment.reflectionEndsAt;

  if (investment.status === "cancelled") {
    return { allowed: false, code: "ALREADY_CANCELLED", deadline };
  }
  if (investment.status === "confirmed" || investment.status === "refunded") {
    return { allowed: false, code: "PAYMENT_CONFIRMED", deadline };
  }
  if (!["pending_payment", "payment_pending"].includes(investment.status)) {
    return { allowed: false, code: "STATUS_NOT_ELIGIBLE", deadline };
  }
  if (investment.paymentRef) {
    return { allowed: false, code: "PAYMENT_IN_PROGRESS", deadline };
  }
  if (!deadline || !Number.isFinite(new Date(deadline).getTime())) {
    return { allowed: false, code: "WINDOW_UNAVAILABLE", deadline: null };
  }
  if (new Date(deadline).getTime() < now.getTime()) {
    return { allowed: false, code: "WINDOW_EXPIRED", deadline };
  }
  return { allowed: true, code: "AVAILABLE", deadline };
}
