import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1 } from "@/lib/d1";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";
import { decodeWalletCursor, encodeWalletCursor } from "@/lib/wallet-history";

interface WalletEntryRow extends Record<string, unknown> {
  id: string;
  amount: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  balanceAfter: number;
}

interface WalletSummaryRow extends Record<string, unknown> {
  availableBalance: number;
  totalReceived: number;
}

interface PayoutSummaryRow extends Record<string, unknown> {
  totalPaidOut: number;
  pendingPayout: number;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const url = new URL(req.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 20);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(50, Math.max(10, requestedLimit))
    : 20;
  const rawCursor = url.searchParams.get("cursor");
  const cursor = decodeWalletCursor(rawCursor);
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Page invalide" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const paymentCapabilities = getPaymentCapabilities();
  const entryQuery = cursor
    ? database
        .prepare(
          `SELECT id, amount, currency, sourceType, sourceId, createdAt, balanceAfter
           FROM (
             SELECT id, amount, currency, sourceType, sourceId, createdAt,
                    SUM(amount) OVER (ORDER BY createdAt, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balanceAfter
             FROM LedgerEntry
             WHERE accountType = 'investor_wallet' AND accountId = ?
           )
           WHERE createdAt < ? OR (createdAt = ? AND id < ?)
           ORDER BY createdAt DESC, id DESC
           LIMIT ?`
        )
        .bind(session.userId, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1)
    : database
        .prepare(
          `SELECT id, amount, currency, sourceType, sourceId, createdAt, balanceAfter
           FROM (
             SELECT id, amount, currency, sourceType, sourceId, createdAt,
                    SUM(amount) OVER (ORDER BY createdAt, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balanceAfter
             FROM LedgerEntry
             WHERE accountType = 'investor_wallet' AND accountId = ?
           )
           ORDER BY createdAt DESC, id DESC
           LIMIT ?`
        )
        .bind(session.userId, limit + 1);

  const [entriesResult, walletSummary, payoutSummary] = await Promise.all([
    entryQuery.all<WalletEntryRow>(),
    database
      .prepare(
        `SELECT
           COALESCE(SUM(amount), 0) AS availableBalance,
           COALESCE(SUM(CASE
             WHEN amount > 0 AND sourceType IN ('distribution', 'equity_dividend') THEN amount
             ELSE 0
           END), 0) AS totalReceived
         FROM LedgerEntry
         WHERE accountType = 'investor_wallet' AND accountId = ?`
      )
      .bind(session.userId)
      .first<WalletSummaryRow>(),
    database
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS totalPaidOut,
           COALESCE(SUM(CASE WHEN status IN ('pending', 'ordered', 'uncertain') THEN amount ELSE 0 END), 0) AS pendingPayout
         FROM Payout
         WHERE investorId = ?`
      )
      .bind(session.userId)
      .first<PayoutSummaryRow>(),
  ]);

  const hasMore = entriesResult.results.length > limit;
  const rows = entriesResult.results.slice(0, limit);
  const last = rows.at(-1);

  return NextResponse.json(
    {
      summary: {
        availableBalance: Number(walletSummary?.availableBalance || 0),
        totalReceived: Number(walletSummary?.totalReceived || 0),
        totalPaidOut: Number(payoutSummary?.totalPaidOut || 0),
        pendingPayout: Number(payoutSummary?.pendingPayout || 0),
        payoutsEnabled: paymentCapabilities.payoutsEnabled,
      },
      entries: rows.map((entry) => ({
        id: entry.id,
        amount: Number(entry.amount),
        currency: entry.currency,
        sourceType: entry.sourceType,
        reference: entry.sourceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase(),
        createdAt: entry.createdAt,
        balanceAfter: Number(entry.balanceAfter),
      })),
      nextCursor:
        hasMore && last
          ? encodeWalletCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    },
    { headers: noStore }
  );
}
