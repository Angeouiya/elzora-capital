import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  confirmPayDunyaCheckout,
  getPayDunyaConfig,
  verifyPayDunyaHash,
  type PayDunyaTransaction,
} from "@/lib/payments/paydunya";

interface InvestmentPaymentRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  investorId: string;
  amount: number;
  status: string;
  paymentRef: string | null;
}

export async function POST(req: NextRequest) {
  const config = getPayDunyaConfig();
  if (!config) {
    return NextResponse.json({ error: "Prestataire indisponible" }, { status: 503 });
  }

  const callback = await parseCallback(req);
  if (!callback || !(await verifyPayDunyaHash(callback.hash, config.masterKey))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const callbackToken = callback.invoice?.token;
  if (!callbackToken) {
    return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
  }

  let confirmed: PayDunyaTransaction;
  try {
    confirmed = await confirmPayDunyaCheckout(config, callbackToken);
  } catch {
    return NextResponse.json({ error: "Vérification indisponible" }, { status: 503 });
  }

  const token = confirmed.invoice?.token;
  const customData = confirmed.custom_data;
  const investmentId = stringValue(customData?.investmentId);
  const flow = stringValue(customData?.flow);
  const totalAmount = Number(confirmed.invoice?.total_amount);
  if (token !== callbackToken || flow !== "investment" || !investmentId) {
    return NextResponse.json({ error: "Transaction incohérente" }, { status: 400 });
  }

  const database = getD1();
  const investment = await database
    .prepare(
      `SELECT id, offerId, investorId, amount, status, paymentRef
       FROM Investment WHERE id = ? LIMIT 1`
    )
    .bind(investmentId)
    .first<InvestmentPaymentRow>();

  if (
    !investment ||
    investment.paymentRef !== token ||
    !Number.isSafeInteger(totalAmount) ||
    totalAmount !== Number(investment.amount) ||
    stringValue(customData?.offerId) !== investment.offerId
  ) {
    return NextResponse.json({ error: "Transaction non reconnue" }, { status: 400 });
  }

  const status = confirmed.status?.toLowerCase();
  if (status === "completed") {
    if (investment.status === "confirmed") {
      return NextResponse.json({ received: true, idempotent: true });
    }
    if (!['pending_payment', 'payment_pending'].includes(investment.status)) {
      return NextResponse.json({ error: "Transaction à rapprocher" }, { status: 409 });
    }
    await confirmInvestment(req, investment);
    return NextResponse.json({ received: true, status: "confirmed" });
  }

  if (status === "cancelled" || status === "failed") {
    await cancelInvestment(req, investment, status);
    return NextResponse.json({ received: true, status });
  }

  return NextResponse.json({ received: true, status: status || "pending" });
}

async function confirmInvestment(req: NextRequest, investment: InvestmentPaymentRow) {
  const database = getD1();
  const now = isoNow();
  const eventId = crypto.randomUUID();
  const amount = Number(investment.amount);
  await database.batch([
    database
      .prepare(
        `UPDATE Investment
         SET status = 'confirmed', paymentConfirmedAt = ?, paymentEventId = ?, updatedAt = ?
         WHERE id = ? AND status IN ('pending_payment', 'payment_pending')`
      )
      .bind(now, eventId, now, investment.id),
    database
      .prepare(
        `UPDATE Offer
         SET committedAmount = MAX(0, committedAmount - ?),
             raisedAmount = raisedAmount + ?,
             backersCount = backersCount + 1
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(amount, amount, investment.offerId, investment.id, eventId),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, 'investor_external', ?, 'escrow', ?, ?, 'XOF',
                'investment', ?, 'Règlement externe de la souscription', ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        `investment:${investment.id}:external`,
        investment.investorId,
        investment.offerId,
        -amount,
        investment.id,
        now,
        investment.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, 'escrow', ?, 'investor_external', ?, ?, 'XOF',
                'investment', ?, 'Fonds de souscription reçus en séquestre', ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        `investment:${investment.id}:escrow`,
        investment.offerId,
        investment.investorId,
        amount,
        investment.id,
        now,
        investment.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'investment_payment_confirmed',
                'investment', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        investment.id,
        JSON.stringify({ offerId: investment.offerId, amount }),
        requestIp(req),
        now,
        investment.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT ?, ?, 'payment', 'Paiement confirmé',
                'Votre souscription est confirmée et vos fonds sont sécurisés.',
                0, 'investor_dashboard', ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(crypto.randomUUID(), investment.investorId, now, investment.id, eventId),
  ]);
}

async function cancelInvestment(
  req: NextRequest,
  investment: InvestmentPaymentRow,
  providerStatus: string
) {
  if (!['pending_payment', 'payment_pending'].includes(investment.status)) return;
  const database = getD1();
  const now = isoNow();
  const eventId = crypto.randomUUID();
  const amount = Number(investment.amount);
  await database.batch([
    database
      .prepare(
        `UPDATE Investment SET status = 'cancelled', paymentEventId = ?, updatedAt = ?
         WHERE id = ? AND status IN ('pending_payment', 'payment_pending')`
      )
      .bind(eventId, now, investment.id),
    database
      .prepare(
        `UPDATE Offer SET committedAmount = MAX(0, committedAmount - ?)
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND status = 'cancelled' AND paymentEventId = ?
         )`
      )
      .bind(amount, investment.offerId, investment.id, eventId),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'investment_payment_closed',
                'investment', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND status = 'cancelled' AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        investment.id,
        JSON.stringify({ providerStatus }),
        requestIp(req),
        now,
        investment.id,
        eventId
      ),
  ]);
}

async function parseCallback(req: NextRequest): Promise<PayDunyaTransaction | null> {
  const text = await req.text();
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(text) as { data?: PayDunyaTransaction } & PayDunyaTransaction;
      return parsed.data || parsed;
    }

    const params = new URLSearchParams(text);
    const serialized = params.get("data");
    if (serialized) return JSON.parse(serialized) as PayDunyaTransaction;

    return {
      hash: params.get("data[hash]") || undefined,
      status: params.get("data[status]") || undefined,
      invoice: {
        token:
          params.get("data[invoice][token]") || params.get("data[token]") || undefined,
        total_amount: params.get("data[invoice][total_amount]") || undefined,
      },
    };
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
