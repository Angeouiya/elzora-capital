import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getBankTransferConfig, getPaymentCapabilities } from "@/lib/payment-capabilities";
import { createPayDunyaCheckout, getPayDunyaConfig } from "@/lib/payments/paydunya";
import {
  assessCollectionPayment,
  PAYMENT_POLICY_VERSION,
  type CollectionPaymentMethod,
} from "@/lib/payment-policy";
import { decodeWalletCursor, encodeWalletCursor } from "@/lib/wallet-history";
import {
  parseWalletAmount,
  parseWalletType,
  validWalletRequestKey,
  walletAccountType,
  walletFromAccountType,
} from "@/lib/wallets";

interface WalletEntryRow extends Record<string, unknown> {
  id: string;
  accountType: string;
  amount: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

interface WalletUserRow extends Record<string, unknown> {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string;
  kycStatus: string;
  documentCountry: string | null;
  sourceOfFunds: string | null;
  politicallyExposed: number | null;
  actingForSelf: number | null;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || 20);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(50, Math.max(10, requestedLimit))
    : 20;
  const rawCursor = req.nextUrl.searchParams.get("cursor");
  const cursor = decodeWalletCursor(rawCursor);
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Page invalide" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const paymentCapabilities = getPaymentCapabilities();
  const entrySql = `
    SELECT id, accountType, amount, currency, sourceType, sourceId, description,
           createdAt, balanceAfter
    FROM (
      SELECT id, accountType, amount, currency, sourceType, sourceId, description,
             createdAt,
             SUM(amount) OVER (
               PARTITION BY accountType
               ORDER BY createdAt, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS balanceAfter
      FROM LedgerEntry
      WHERE accountId = ?
        AND accountType IN ('investor_wallet', 'investor_reserve_wallet')
    )
    ${cursor ? "WHERE createdAt < ? OR (createdAt = ? AND id < ?)" : ""}
    ORDER BY createdAt DESC, id DESC
    LIMIT ?`;
  const entryQuery = cursor
    ? database.prepare(entrySql).bind(session.userId, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1)
    : database.prepare(entrySql).bind(session.userId, limit + 1);

  const [entriesResult, walletSummary, payoutSummary, depositResult] = await Promise.all([
    entryQuery.all<WalletEntryRow>(),
    database
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN accountType = 'investor_wallet' THEN amount ELSE 0 END), 0) AS investmentBalance,
           COALESCE(SUM(CASE WHEN accountType = 'investor_reserve_wallet' THEN amount ELSE 0 END), 0) AS reserveBalance,
           COALESCE(SUM(CASE
             WHEN accountType = 'investor_wallet' AND amount > 0
              AND sourceType IN ('distribution', 'equity_dividend') THEN amount ELSE 0 END), 0) AS totalReceived
         FROM LedgerEntry
         WHERE accountId = ?
           AND accountType IN ('investor_wallet', 'investor_reserve_wallet')`
      )
      .bind(session.userId)
      .first<{ investmentBalance: number; reserveBalance: number; totalReceived: number }>(),
    database
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS totalPaidOut,
           COALESCE(SUM(CASE WHEN status IN ('pending', 'ordered', 'uncertain') THEN amount ELSE 0 END), 0) AS pendingPayout
         FROM Payout WHERE investorId = ?`
      )
      .bind(session.userId)
      .first<{ totalPaidOut: number; pendingPayout: number }>(),
    database
      .prepare(
        `SELECT id, walletType, method, amount, status, createdAt
         FROM WalletDeposit WHERE investorId = ? ORDER BY createdAt DESC LIMIT 8`
      )
      .bind(session.userId)
      .all<Record<string, unknown>>(),
  ]);

  const investmentBalance = Number(walletSummary?.investmentBalance || 0);
  const reserveBalance = Number(walletSummary?.reserveBalance || 0);
  const hasMore = entriesResult.results.length > limit;
  const rows = entriesResult.results.slice(0, limit);
  const last = rows.at(-1);

  return NextResponse.json(
    {
      summary: {
        availableBalance: investmentBalance + reserveBalance,
        investmentBalance,
        reserveBalance,
        totalReceived: Number(walletSummary?.totalReceived || 0),
        totalPaidOut: Number(payoutSummary?.totalPaidOut || 0),
        pendingPayout: Number(payoutSummary?.pendingPayout || 0),
        payoutsEnabled: paymentCapabilities.payoutsEnabled,
        depositsEnabled: paymentCapabilities.collectionsEnabled,
        depositMethods: paymentCapabilities.collectionMethods,
      },
      deposits: depositResult.results.map((deposit) => ({
        id: String(deposit.id), walletType: String(deposit.walletType), method: String(deposit.method),
        amount: Number(deposit.amount), status: String(deposit.status), createdAt: String(deposit.createdAt),
      })),
      entries: rows.map((entry) => ({
        id: entry.id,
        walletType: walletFromAccountType(entry.accountType),
        amount: Number(entry.amount),
        currency: entry.currency,
        sourceType: entry.sourceType,
        description: entry.description,
        reference: entry.sourceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase(),
        createdAt: entry.createdAt,
        balanceAfter: Number(entry.balanceAfter),
      })),
      nextCursor: hasMore && last ? encodeWalletCursor({ createdAt: last.createdAt, id: last.id }) : null,
    },
    { headers: noStore }
  );
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const user = await loadWalletUser(database, session.userId);
  if (!user || user.kycStatus !== "verified") {
    return NextResponse.json(
      { error: "Votre identité doit être vérifiée avant de déplacer de l’argent." },
      { status: 403, headers: noStore }
    );
  }
  if (body.action === "transfer") return transferBetweenWallets(req, database, session.userId, body);
  if (body.action === "deposit") return createWalletDeposit(req, database, session.userId, user, body);
  return NextResponse.json({ error: "Action inconnue" }, { status: 400, headers: noStore });
}

async function transferBetweenWallets(
  req: NextRequest,
  database: D1Database,
  userId: string,
  body: Record<string, unknown>
) {
  const fromWallet = parseWalletType(body.fromWallet);
  const toWallet = parseWalletType(body.toWallet);
  const amount = parseWalletAmount(body.amount);
  const requestKey = body.requestKey;
  if (!fromWallet || !toWallet || fromWallet === toWallet || !amount || !validWalletRequestKey(requestKey)) {
    return NextResponse.json({ error: "Transfert invalide" }, { status: 400, headers: noStore });
  }

  const existing = await database
    .prepare(`SELECT id, fromWallet, toWallet, amount, status, createdAt FROM WalletTransfer WHERE requestKey = ? AND investorId = ? LIMIT 1`)
    .bind(requestKey, userId)
    .first<Record<string, unknown>>();
  if (existing) return NextResponse.json({ transfer: existing, idempotent: true }, { headers: noStore });

  const transferId = crypto.randomUUID();
  const now = isoNow();
  const fromAccount = walletAccountType(fromWallet);
  const toAccount = walletAccountType(toWallet);
  await database.batch([
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, ?, ?, ?, ?, ?, 'XOF', 'wallet_transfer', ?, ?, ?
         WHERE (SELECT COALESCE(SUM(amount), 0) FROM LedgerEntry
                WHERE accountType = ? AND accountId = ?) >= ?`
      )
      .bind(
        crypto.randomUUID(), `wallet-transfer:${requestKey}:debit`, fromAccount, userId,
        toAccount, userId, -amount, transferId, "Transfert entre mes portefeuilles",
        now, fromAccount, userId, amount
      ),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, ?, ?, ?, ?, ?, 'XOF', 'wallet_transfer', ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM LedgerEntry WHERE idemKey = ?)`
      )
      .bind(
        crypto.randomUUID(), `wallet-transfer:${requestKey}:credit`, toAccount, userId,
        fromAccount, userId, amount, transferId, "Transfert reçu entre mes portefeuilles",
        now, `wallet-transfer:${requestKey}:debit`
      ),
    database
      .prepare(
        `INSERT INTO WalletTransfer
         (id, requestKey, investorId, fromWallet, toWallet, amount, currency, status, createdAt)
         SELECT ?, ?, ?, ?, ?, ?, 'XOF', 'completed', ?
         WHERE EXISTS (SELECT 1 FROM LedgerEntry WHERE idemKey = ?)`
      )
      .bind(transferId, requestKey, userId, fromWallet, toWallet, amount, now, `wallet-transfer:${requestKey}:debit`),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'user', ?, 'wallet.transferred', 'WalletTransfer', ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM WalletTransfer WHERE id = ?)`
      )
      .bind(
        crypto.randomUUID(), userId, transferId,
        JSON.stringify({ fromWallet, toWallet, amount }), requestIp(req), now, transferId
      ),
  ]);

  const transfer = await database
    .prepare(`SELECT id, fromWallet, toWallet, amount, status, createdAt FROM WalletTransfer WHERE id = ? LIMIT 1`)
    .bind(transferId)
    .first<Record<string, unknown>>();
  if (!transfer) {
    return NextResponse.json({ error: "Solde insuffisant pour ce transfert." }, { status: 409, headers: noStore });
  }
  return NextResponse.json({ transfer }, { status: 201, headers: noStore });
}

async function createWalletDeposit(
  req: NextRequest,
  database: D1Database,
  userId: string,
  user: WalletUserRow,
  body: Record<string, unknown>
) {
  const walletType = parseWalletType(body.walletType);
  const amount = parseWalletAmount(body.amount);
  const method = parseDepositMethod(body.method);
  const requestKey = body.requestKey;
  if (!walletType || !amount || !method || !validWalletRequestKey(requestKey)) {
    return NextResponse.json({ error: "Dépôt invalide" }, { status: 400, headers: noStore });
  }

  const existing = await database
    .prepare(`SELECT id, walletType, method, amount, status, paymentRef FROM WalletDeposit WHERE id = ? AND investorId = ? LIMIT 1`)
    .bind(requestKey, userId)
    .first<Record<string, unknown>>();
  if (existing) return NextResponse.json({ deposit: existing, idempotent: true }, { headers: noStore });

  const usage = await loadDepositUsage(database, userId, method);
  const assessment = assessCollectionPayment({
    amount,
    method,
    usage,
    risk: {
      country: user.country,
      documentCountry: user.documentCountry,
      sourceOfFunds: user.sourceOfFunds,
      politicallyExposed: Boolean(user.politicallyExposed),
      actingForSelf: user.actingForSelf === null ? undefined : Boolean(user.actingForSelf),
    },
  });
  if (assessment.decision === "block") {
    return NextResponse.json(
      { error: assessment.reasons[0] || "Ce dépôt dépasse les limites de sécurité.", code: assessment.code },
      { status: 422, headers: noStore }
    );
  }

  const now = isoNow();
  const status = assessment.decision === "review" ? "review" : "pending";
  await database.batch([
    database
      .prepare(
        `INSERT INTO WalletDeposit
         (id, investorId, walletType, method, amount, currency, status,
          paymentRef, providerEventId, failureReason, createdAt, updatedAt, confirmedAt)
         VALUES (?, ?, ?, ?, ?, 'XOF', ?, NULL, NULL, NULL, ?, ?, NULL)`
      )
      .bind(requestKey, userId, walletType, method, amount, status, now, now),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'wallet.deposit_requested', 'WalletDeposit', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(), userId, requestKey,
        JSON.stringify({ walletType, method, amount, decision: assessment.decision, reasons: assessment.reasons, policyVersion: PAYMENT_POLICY_VERSION }),
        requestIp(req), now
      ),
  ]);

  if (assessment.decision === "review") {
    return NextResponse.json(
      { deposit: { id: requestKey, walletType, method, amount, status: "review" }, message: "Ce dépôt doit être vérifié avant de vous transmettre le moyen de paiement." },
      { status: 202, headers: noStore }
    );
  }

  if (method === "bank_transfer") {
    const bank = getBankTransferConfig();
    if (!bank) {
      await database
        .prepare(`UPDATE WalletDeposit SET status = 'failed', failureReason = 'bank_instructions_unavailable', updatedAt = ? WHERE id = ?`)
        .bind(isoNow(), requestKey)
        .run();
      return NextResponse.json({ error: "Les coordonnées du compte de collecte ne sont pas encore disponibles." }, { status: 503, headers: noStore });
    }
    await database.prepare(`UPDATE WalletDeposit SET status = 'provider_pending', updatedAt = ? WHERE id = ?`).bind(now, requestKey).run();
    return NextResponse.json(
      {
        deposit: { id: requestKey, walletType, method, amount, status: "provider_pending" },
        payment: {
          status: "bank_instructions_ready",
          instructions: { bankName: bank.bankName, beneficiary: bank.beneficiary, accountReference: bank.accountReference, transferReference: requestKey, amount, currency: "XOF" },
        },
      },
      { status: 201, headers: noStore }
    );
  }

  const capabilities = getPaymentCapabilities();
  const config = getPayDunyaConfig();
  if (!capabilities.collectionsEnabled || !capabilities.collectionMethods.includes(method) || !config) {
    await database
      .prepare(`UPDATE WalletDeposit SET status = 'failed', failureReason = 'collections_not_configured', updatedAt = ? WHERE id = ?`)
      .bind(isoNow(), requestKey)
      .run();
    return NextResponse.json({ error: "Les dépôts par carte et Mobile Money sont en cours d’activation." }, { status: 503, headers: noStore });
  }

  try {
    const origin = config.publicAppUrl;
    const checkout = await createPayDunyaCheckout(config, {
      amount,
      description: walletType === "investment" ? "Approvisionnement du portefeuille d’investissement" : "Approvisionnement du portefeuille de réserve",
      itemName: "Dépôt sur portefeuille NEXORA",
      customer: { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, phone: user.phone },
      customData: { flow: "wallet_deposit", depositId: String(requestKey), investorId: userId, walletType, paymentMethod: method, paymentPolicyVersion: PAYMENT_POLICY_VERSION },
      callbackUrl: `${origin}/api/payments/paydunya/webhook`,
      returnUrl: `${origin}/?wallet=deposit-return`,
      cancelUrl: `${origin}/?wallet=deposit-cancelled`,
    });
    await database
      .prepare(`UPDATE WalletDeposit SET paymentRef = ?, status = 'provider_pending', updatedAt = ? WHERE id = ? AND paymentRef IS NULL`)
      .bind(checkout.token, isoNow(), requestKey)
      .run();
    return NextResponse.json(
      { deposit: { id: requestKey, walletType, method, amount, status: "provider_pending" }, payment: { status: "ready", checkoutUrl: checkout.checkoutUrl, provider: "PayDunya" } },
      { status: 201, headers: noStore }
    );
  } catch (error) {
    await database.prepare(`UPDATE WalletDeposit SET status = 'failed', failureReason = ?, updatedAt = ? WHERE id = ?`).bind("provider_unavailable", isoNow(), requestKey).run();
    console.error("wallet_deposit_checkout_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Le paiement sécurisé est momentanément indisponible." }, { status: 503, headers: noStore });
  }
}

async function loadWalletUser(database: D1Database, userId: string) {
  return database
    .prepare(
      `SELECT u.firstName, u.lastName, u.email, u.phone, u.country, u.kycStatus,
              k.documentCountry, k.sourceOfFunds, k.politicallyExposed, k.actingForSelf
       FROM User u LEFT JOIN KycProfile k ON k.userId = u.id
       WHERE u.id = ? LIMIT 1`
    )
    .bind(userId)
    .first<WalletUserRow>();
}

async function loadDepositUsage(database: D1Database, userId: string, method: CollectionPaymentMethod) {
  const now = isoNow();
  const row = await database
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('review','pending','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-24 hours') THEN amount ELSE 0 END), 0) AS dailyTotal,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('review','pending','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-30 days') THEN amount ELSE 0 END), 0) AS monthlyTotal,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('review','pending','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-24 hours') THEN 1 ELSE 0 END), 0) AS dailyCount,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('review','pending','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-30 days') THEN 1 ELSE 0 END), 0) AS monthlyCount,
         COALESCE(SUM(CASE WHEN datetime(createdAt) >= datetime(?, '-15 minutes') THEN 1 ELSE 0 END), 0) AS recent15mCount,
         COALESCE(SUM(CASE WHEN datetime(createdAt) >= datetime(?, '-24 hours') THEN 1 ELSE 0 END), 0) AS allMethods24hCount,
         COUNT(DISTINCT CASE WHEN datetime(createdAt) >= datetime(?, '-24 hours') THEN method END) AS distinctMethods24h
       FROM WalletDeposit WHERE investorId = ?`
    )
    .bind(method, now, method, now, method, now, method, now, now, now, now, userId)
    .first<Record<string, number>>();
  return {
    dailyTotal: Number(row?.dailyTotal || 0), monthlyTotal: Number(row?.monthlyTotal || 0),
    dailyCount: Number(row?.dailyCount || 0), monthlyCount: Number(row?.monthlyCount || 0),
    recent15mCount: Number(row?.recent15mCount || 0), allMethods24hCount: Number(row?.allMethods24hCount || 0),
    distinctMethods24h: Number(row?.distinctMethods24h || 0),
  };
}

function parseDepositMethod(value: unknown): CollectionPaymentMethod | null {
  return value === "card" || value === "mobile_money" || value === "bank_transfer" ? value : null;
}
