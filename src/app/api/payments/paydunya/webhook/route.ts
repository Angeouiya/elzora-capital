import { NextRequest, NextResponse } from "next/server";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  confirmPayDunyaCheckout,
  getPayDunyaConfig,
  verifyPayDunyaHash,
  type PayDunyaTransaction,
} from "@/lib/payments/paydunya";
import { finalizeFundedOffer } from "@/lib/funding-lifecycle";
import {
  settleCompanyPayment,
  type CompanyPaymentSettlement,
} from "@/lib/company-payment-settlement";
import {
  settleEquityDividend,
  type EquityDividendSettlement,
} from "@/lib/equity-dividend-settlement";
import { ensureInvestmentContract } from "@/lib/investment-contract";

interface InvestmentPaymentRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  investorId: string;
  amount: number;
  status: string;
  paymentRef: string | null;
  signedAt: string | null;
  signatureHash: string | null;
  evidencePresent: number;
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
  const flow = stringValue(customData?.flow);
  const totalAmount = Number(confirmed.invoice?.total_amount);
  if (token !== callbackToken || !Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: "Transaction incohérente" }, { status: 400 });
  }

  if (flow === "investment") {
    return handleInvestmentWebhook(req, confirmed, token, totalAmount);
  }
  if (flow === "company_payment") {
    return handleCompanyPaymentWebhook(req, confirmed, token, totalAmount);
  }
  if (flow === "equity_dividend") {
    return handleEquityDividendWebhook(req, confirmed, token, totalAmount);
  }
  return NextResponse.json({ error: "Transaction non reconnue" }, { status: 400 });
}

async function handleInvestmentWebhook(
  req: NextRequest,
  confirmed: PayDunyaTransaction,
  token: string,
  totalAmount: number
) {
  const customData = confirmed.custom_data;
  const investmentId = stringValue(customData?.investmentId);
  if (!investmentId) {
    return NextResponse.json({ error: "Transaction incohérente" }, { status: 400 });
  }

  const database = getD1();
  const investment = await database
    .prepare(
      `SELECT i.id, i.offerId, i.investorId, i.amount, i.status, i.paymentRef,
              i.signedAt, i.signatureHash,
              CASE WHEN se.id IS NULL THEN 0 ELSE 1 END AS evidencePresent
       FROM Investment i
       LEFT JOIN SubscriptionEvidence se
         ON se.investmentId = i.id AND se.signedPayloadHash = i.signatureHash
       WHERE i.id = ? LIMIT 1`
    )
    .bind(investmentId)
    .first<InvestmentPaymentRow>();

  if (
    !investment ||
    investment.paymentRef !== token ||
    totalAmount !== Number(investment.amount) ||
    stringValue(customData?.offerId) !== investment.offerId
  ) {
    return NextResponse.json({ error: "Transaction non reconnue" }, { status: 400 });
  }

  const status = confirmed.status?.toLowerCase();
  if (status === "completed") {
    if (!investment.signedAt || !investment.signatureHash || !Boolean(investment.evidencePresent)) {
      return NextResponse.json(
        { error: "Souscription non signée à rapprocher" },
        { status: 409 }
      );
    }
    if (investment.status === "confirmed") {
      await issueContractWithoutBlocking(database, investment.id);
      await finalizeFundedOffer(investment.offerId);
      return NextResponse.json({ received: true, idempotent: true });
    }
    if (!['pending_payment', 'payment_pending'].includes(investment.status)) {
      return NextResponse.json({ error: "Transaction à rapprocher" }, { status: 409 });
    }
    const didConfirm = await confirmInvestment(req, investment);
    if (!didConfirm) {
      const current = await database
        .prepare(`SELECT status FROM Investment WHERE id = ? LIMIT 1`)
        .bind(investment.id)
        .first<{ status: string }>();
      if (current?.status === "confirmed") {
        await issueContractWithoutBlocking(database, investment.id);
        await finalizeFundedOffer(investment.offerId);
        return NextResponse.json({ received: true, idempotent: true });
      }
      return NextResponse.json({ error: "Transaction à rapprocher" }, { status: 409 });
    }
    await issueContractWithoutBlocking(database, investment.id);
    await finalizeFundedOffer(investment.offerId);
    return NextResponse.json({ received: true, status: "confirmed" });
  }

  if (status === "cancelled" || status === "failed") {
    await cancelInvestment(req, investment, status);
    return NextResponse.json({ received: true, status });
  }

  return NextResponse.json({ received: true, status: status || "pending" });
}

async function issueContractWithoutBlocking(database: D1Database, investmentId: string) {
  try {
    await ensureInvestmentContract(database, investmentId);
  } catch (error) {
    console.error(
      "investment_contract_issue_failed",
      investmentId,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}

async function handleCompanyPaymentWebhook(
  req: NextRequest,
  confirmed: PayDunyaTransaction,
  token: string,
  totalAmount: number
) {
  const customData = confirmed.custom_data;
  const paymentId = stringValue(customData?.companyPaymentId);
  if (!paymentId) {
    return NextResponse.json({ error: "Transaction incohérente" }, { status: 400 });
  }

  const database = getD1();
  const payment = await database
    .prepare(
      `SELECT id, projectId, installmentNo, capitalDue, interestDue,
              followUpFeeDue, totalDue, paidAmount, remaining, status, paymentRef
       FROM CompanyPayment WHERE id = ? LIMIT 1`
    )
    .bind(paymentId)
    .first<CompanyPaymentSettlement>();

  const expectedAmount = payment
    ? Number(payment.remaining) > 0
      ? Number(payment.remaining)
      : Number(payment.totalDue) - Number(payment.paidAmount || 0)
    : 0;
  if (
    !payment ||
    payment.paymentRef !== token ||
    payment.projectId !== stringValue(customData?.projectId) ||
    expectedAmount !== totalAmount
  ) {
    return NextResponse.json({ error: "Transaction non reconnue" }, { status: 400 });
  }

  const status = confirmed.status?.toLowerCase();
  if (status === "completed") {
    if (payment.status === "paid") {
      return NextResponse.json({ received: true, idempotent: true });
    }
    if (payment.status !== "verifying") {
      return NextResponse.json({ error: "Transaction à rapprocher" }, { status: 409 });
    }
    await settleCompanyPayment(req, payment, totalAmount);
    return NextResponse.json({ received: true, status: "paid" });
  }

  if (status === "cancelled" || status === "failed") {
    await reopenCompanyPayment(req, payment, status);
    return NextResponse.json({ received: true, status });
  }

  return NextResponse.json({ received: true, status: status || "pending" });
}

async function reopenCompanyPayment(
  req: NextRequest,
  payment: CompanyPaymentSettlement,
  providerStatus: string
) {
  if (payment.status !== "verifying") return;
  const database = getD1();
  const now = isoNow();
  const eventId = crypto.randomUUID();
  await database.batch([
    database
      .prepare(
        `UPDATE CompanyPayment
         SET status = CASE WHEN datetime(dueDate) <= datetime(?) THEN 'due' ELSE 'upcoming' END,
             paymentRef = NULL, paymentEventId = ?
         WHERE id = ? AND status = 'verifying' AND paymentRef = ?`
      )
      .bind(now, eventId, payment.id, payment.paymentRef),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'company_payment_reopened',
                'company_payment', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        payment.id,
        JSON.stringify({ providerStatus }),
        requestIp(req),
        now,
        payment.id,
        eventId
      ),
  ]);
}

async function handleEquityDividendWebhook(
  req: NextRequest,
  confirmed: PayDunyaTransaction,
  token: string,
  totalAmount: number
) {
  const customData = confirmed.custom_data;
  const dividendId = stringValue(customData?.equityDividendId);
  if (!dividendId) {
    return NextResponse.json({ error: "Transaction incohérente" }, { status: 400 });
  }

  const database = getD1();
  const dividend = await database
    .prepare(
      `SELECT id, projectId, companyId, netPayableAmount, status, paymentRef
       FROM EquityDividend WHERE id = ? LIMIT 1`
    )
    .bind(dividendId)
    .first<EquityDividendSettlement>();
  if (
    !dividend ||
    dividend.paymentRef !== token ||
    dividend.projectId !== stringValue(customData?.projectId) ||
    dividend.companyId !== stringValue(customData?.companyId) ||
    Number(dividend.netPayableAmount) !== totalAmount
  ) {
    return NextResponse.json({ error: "Transaction non reconnue" }, { status: 400 });
  }

  const status = confirmed.status?.toLowerCase();
  if (status === "completed") {
    if (dividend.status === "paid") {
      return NextResponse.json({ received: true, idempotent: true });
    }
    if (dividend.status !== "verifying") {
      return NextResponse.json({ error: "Transaction à rapprocher" }, { status: 409 });
    }
    await settleEquityDividend(req, dividend, totalAmount);
    return NextResponse.json({ received: true, status: "paid" });
  }

  if (status === "cancelled" || status === "failed") {
    await reopenEquityDividend(req, dividend, status);
    return NextResponse.json({ received: true, status });
  }
  return NextResponse.json({ received: true, status: status || "pending" });
}

async function reopenEquityDividend(
  req: NextRequest,
  dividend: EquityDividendSettlement,
  providerStatus: string
) {
  if (dividend.status !== "verifying") return;
  const database = getD1();
  const now = isoNow();
  const eventId = crypto.randomUUID();
  await database.batch([
    database
      .prepare(
        `UPDATE EquityDividend
         SET status = 'approved', paymentRef = NULL,
             paymentEventId = ?, updatedAt = ?
         WHERE id = ? AND status = 'verifying' AND paymentRef = ?`
      )
      .bind(eventId, now, dividend.id, dividend.paymentRef),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'equity_dividend_payment_reopened',
                'equity_dividend', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityDividend
           WHERE id = ? AND status = 'approved' AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        dividend.id,
        JSON.stringify({ providerStatus }),
        requestIp(req),
        now,
        dividend.id,
        eventId
      ),
  ]);
}

async function confirmInvestment(req: NextRequest, investment: InvestmentPaymentRow): Promise<boolean> {
  const database = getD1();
  const now = isoNow();
  const eventId = crypto.randomUUID();
  const amount = Number(investment.amount);
  const results = await database.batch([
    database
      .prepare(
        `UPDATE Investment
         SET status = 'confirmed', paymentConfirmedAt = ?, paymentEventId = ?, updatedAt = ?
         WHERE id = ? AND status IN ('pending_payment', 'payment_pending')
           AND signedAt IS NOT NULL AND signatureHash IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM SubscriptionEvidence
             WHERE investmentId = Investment.id
               AND signedPayloadHash = Investment.signatureHash
           )`
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
        `UPDATE PaymentAttempt SET status = 'confirmed', updatedAt = ?
         WHERE investmentId = ? AND EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(now, investment.id, investment.id, eventId),
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
  return (results[0].meta.changes || 0) === 1;
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
        `UPDATE PaymentAttempt SET status = ?, updatedAt = ?
         WHERE investmentId = ? AND EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND status = 'cancelled' AND paymentEventId = ?
         )`
      )
      .bind(providerStatus === "failed" ? "failed" : "cancelled", now, investment.id, investment.id, eventId),
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
