import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/lib/d1";
import {
  checkPayDunyaDisbursement,
  getPayDunyaConfig,
  verifyPayDunyaHash,
  type PayDunyaDisbursementStatus,
} from "@/lib/payments/paydunya";
import { resolvePayDunyaPayoutStatus } from "@/lib/payout-provider-resolution";
import type { PayoutSettlementRow } from "@/lib/payout-settlement";

export async function POST(req: NextRequest) {
  const config = getPayDunyaConfig();
  if (!config || config.mode !== "live") {
    return NextResponse.json({ error: "Prestataire indisponible" }, { status: 503 });
  }

  const callback = await parseCallback(req);
  if (!callback || !(await verifyPayDunyaHash(callback.hash, config.masterKey))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }
  const token = typeof callback.token === "string" ? callback.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(token)) {
    return NextResponse.json({ error: "Référence invalide" }, { status: 400 });
  }

  const database = getD1();
  const payout = await database
    .prepare(
      `SELECT id, investorId, amount, netAmount, status, partnerRef, walletType
       FROM Payout WHERE partnerRef = ? LIMIT 1`
    )
    .bind(token)
    .first<PayoutSettlementRow>();
  if (!payout) {
    return NextResponse.json({ error: "Versement introuvable" }, { status: 404 });
  }
  if (payout.status === "completed" || payout.status === "failed") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  let providerStatus: PayDunyaDisbursementStatus;
  try {
    providerStatus = await checkPayDunyaDisbursement(config, token);
  } catch {
    return NextResponse.json({ error: "Vérification indisponible" }, { status: 503 });
  }
  const resolution = await resolvePayDunyaPayoutStatus(
    req,
    payout,
    providerStatus,
    database
  );
  return NextResponse.json({ received: true, status: resolution });
}

async function parseCallback(
  req: NextRequest
): Promise<PayDunyaDisbursementStatus | null> {
  const text = await req.text();
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return JSON.parse(text) as PayDunyaDisbursementStatus;
    }
    const params = new URLSearchParams(text);
    const serialized = params.get("data");
    if (serialized) return JSON.parse(serialized) as PayDunyaDisbursementStatus;
    return {
      hash: params.get("hash") || undefined,
      status: params.get("status") || undefined,
      token: params.get("token") || undefined,
      amount: params.get("amount") || undefined,
      fees: params.get("fees") || undefined,
      disburse_id: params.get("disburse_id") || undefined,
      transaction_id: params.get("transaction_id") || undefined,
    };
  } catch {
    return null;
  }
}
