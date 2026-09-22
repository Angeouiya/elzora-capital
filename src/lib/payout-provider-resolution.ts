import { getD1 } from "@/lib/d1";
import type { PayDunyaDisbursementStatus } from "@/lib/payments/paydunya";
import { settlePayout, type PayoutSettlementRow } from "@/lib/payout-settlement";

export type PayoutResolution = "completed" | "failed" | "ordered" | "uncertain";

export async function resolvePayDunyaPayoutStatus(
  req: Request,
  payout: PayoutSettlementRow,
  providerStatus: PayDunyaDisbursementStatus,
  database: D1Database = getD1()
): Promise<PayoutResolution> {
  const status = providerStatus.status?.toLowerCase();
  const providerAmount = Number(providerStatus.amount);
  if (providerStatus.token && providerStatus.token !== payout.partnerRef) {
    await markPayoutUncertain(database, payout.id);
    return "uncertain";
  }
  if (
    Number.isFinite(providerAmount) &&
    providerAmount > 0 &&
    providerAmount !== Number(payout.netAmount)
  ) {
    await markPayoutUncertain(database, payout.id);
    return "uncertain";
  }

  const fees = Number(providerStatus.fees || 0);
  if (status === "success") {
    await settlePayout(
      req,
      payout,
      {
        status: "success",
        fees: Number.isSafeInteger(fees) ? fees : 0,
        transactionId: providerStatus.transaction_id || null,
      },
      database
    );
    return "completed";
  }
  if (status === "failed") {
    await settlePayout(
      req,
      payout,
      {
        status: "failed",
        fees: Number.isSafeInteger(fees) ? fees : 0,
        failureReason: providerStatus.response_text || "Versement refusé",
        transactionId: providerStatus.transaction_id || null,
      },
      database
    );
    return "failed";
  }

  await database
    .prepare(
      `UPDATE Payout SET status = 'ordered'
       WHERE id = ? AND status IN ('pending', 'uncertain', 'ordered')`
    )
    .bind(payout.id)
    .run();
  return "ordered";
}

export async function markPayoutUncertain(
  database: D1Database,
  payoutId: string
) {
  await database
    .prepare(
      `UPDATE Payout SET status = 'uncertain'
       WHERE id = ? AND status IN ('pending', 'ordered', 'uncertain')`
    )
    .bind(payoutId)
    .run();
}
