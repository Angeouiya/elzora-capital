import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";
import {
  checkPayDunyaDisbursement,
  getPayDunyaConfig,
  getPayDunyaPayoutOperators,
  initiatePayDunyaDisbursement,
  maskPayoutPhone,
  normalizePayDunyaPayoutPhone,
  submitPayDunyaDisbursement,
  type PayDunyaDisbursementStatus,
} from "@/lib/payments/paydunya";
import type { PayoutSettlementRow } from "@/lib/payout-settlement";
import {
  markPayoutUncertain,
  resolvePayDunyaPayoutStatus,
} from "@/lib/payout-provider-resolution";
import { parseWalletType, walletAccountType } from "@/lib/wallets";

interface PayoutRow extends Record<string, unknown> {
  id: string;
  amount: number;
  fees: number;
  netAmount: number;
  status: string;
  partnerRef: string | null;
  createdAt: string;
  completedAt: string | null;
  withdrawMode: string | null;
  beneficiaryAccount: string;
  failureReason: string | null;
  walletType: string;
}

interface PayoutUserRow extends Record<string, unknown> {
  kycStatus: string;
  country: string;
  phone: string | null;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const capabilities = getPaymentCapabilities();
  const walletType = parseWalletType(new URL(req.url).searchParams.get("walletType")) || "investment";
  const sourceWallet = walletAccountType(walletType);
  const [balance, payouts, user] = await Promise.all([
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = ? AND accountId = ?`
      )
      .bind(sourceWallet, session.userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT id, amount, fees, netAmount, status, withdrawMode, walletType,
                beneficiaryAccount, partnerRef, failureReason, createdAt, completedAt
         FROM Payout WHERE investorId = ?
         ORDER BY createdAt DESC LIMIT 30`
      )
      .bind(session.userId)
      .all<PayoutRow>(),
    database
      .prepare(`SELECT kycStatus, country, phone FROM User WHERE id = ? LIMIT 1`)
      .bind(session.userId)
      .first<PayoutUserRow>(),
  ]);

  const payoutPhone = user?.phone
    ? normalizePayDunyaPayoutPhone(user.phone, user.country)
    : null;

  return NextResponse.json(
    {
      payouts: payouts.results,
      availableBalance: Number(balance?.balance || 0),
      walletType,
      payoutsEnabled: capabilities.payoutsEnabled,
      providerName: capabilities.providerName,
      payoutMethods: capabilities.payoutMethods,
      payoutOperators:
        capabilities.payoutsEnabled && user
          ? getPayDunyaPayoutOperators(user.country)
          : [],
      payoutPhoneMasked: payoutPhone ? maskPayoutPhone(payoutPhone) : null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const capabilities = getPaymentCapabilities();
  const config = getPayDunyaConfig();
  if (!capabilities.payoutsEnabled || !config || config.mode !== "live") {
    return NextResponse.json(
      {
        error:
          "Les versements Mobile Money sont en cours d’activation avec un prestataire agréé.",
        code: "PAYOUTS_NOT_CONFIGURED",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const withdrawMode = String(body.withdrawMode || "").trim();
  const walletType = parseWalletType(body.walletType) || "investment";
  const sourceWallet = walletAccountType(walletType);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Le montant doit être un entier strictement positif." },
      { status: 400 }
    );
  }

  const database = getD1();
  const [user, balance, openPayout] = await Promise.all([
    database
      .prepare(`SELECT kycStatus, country, phone FROM User WHERE id = ? LIMIT 1`)
      .bind(session.userId)
      .first<PayoutUserRow>(),
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = ? AND accountId = ?`
      )
      .bind(sourceWallet, session.userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT id, investorId, amount, netAmount, status, partnerRef,
                withdrawMode, beneficiaryAccount, walletType
         FROM Payout
         WHERE investorId = ? AND status IN ('pending', 'ordered', 'uncertain')
         ORDER BY createdAt DESC LIMIT 1`
      )
      .bind(session.userId)
      .first<PayoutSettlementRow & {
        withdrawMode: string | null;
        beneficiaryAccount: string;
      }>(),
  ]);

  if (!user || user.kycStatus !== "verified") {
    return NextResponse.json(
      { error: "Votre identité doit être vérifiée avant tout versement." },
      { status: 403 }
    );
  }
  const operator = getPayDunyaPayoutOperators(user.country).find(
    (item) => item.id === withdrawMode
  );
  if (!operator) {
    return NextResponse.json(
      { error: "Sélectionnez un opérateur Mobile Money disponible dans votre pays." },
      { status: 400 }
    );
  }
  const payoutPhone = user.phone
    ? normalizePayDunyaPayoutPhone(user.phone, user.country)
    : null;
  if (!payoutPhone) {
    return NextResponse.json(
      { error: "Ajoutez un numéro Mobile Money valide à votre compte avant tout versement." },
      { status: 409 }
    );
  }

  if (openPayout) {
    if (
      Number(openPayout.amount) !== amount ||
      openPayout.withdrawMode !== withdrawMode ||
      openPayout.walletType !== walletType
    ) {
      return NextResponse.json(
        {
          error: "Une autre demande de versement est déjà en cours.",
          payout: publicPayout(openPayout),
        },
        { status: 409 }
      );
    }
    if (!openPayout.partnerRef) {
      await markPayoutUncertain(database, openPayout.id);
      return NextResponse.json(
        {
          payout: { ...publicPayout(openPayout), status: "uncertain" },
          notice: "Votre demande est sécurisée et fait l’objet d’un rapprochement.",
        },
        { status: 202 }
      );
    }
    return advancePayout(req, openPayout, payoutPhone, config, database, false);
  }

  if (amount > Number(balance?.balance || 0)) {
    return NextResponse.json({ error: "Solde disponible insuffisant." }, { status: 409 });
  }

  const payoutId = crypto.randomUUID();
  const now = isoNow();
  const maskedPhone = maskPayoutPhone(payoutPhone);
  const payout: PayoutSettlementRow & {
    withdrawMode: string;
    beneficiaryAccount: string;
  } = {
    id: payoutId,
    investorId: session.userId,
    amount,
    netAmount: amount,
    status: "pending",
    partnerRef: null,
    walletType,
    withdrawMode,
    beneficiaryAccount: maskedPhone,
  };

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO Payout
           (id, investorType, investorId, amount, fees, netAmount, status,
            beneficiaryAccount, withdrawMode, partnerRef, providerEventId, walletType,
            failureReason, createdAt, completedAt)
           VALUES (?, 'individual', ?, ?, 0, ?, 'pending', ?, ?, NULL, NULL, ?, NULL, ?, NULL)`
        )
        .bind(
          payoutId,
          session.userId,
          amount,
          amount,
          maskedPhone,
          withdrawMode,
          walletType,
          now
        ),
      database
        .prepare(
          `INSERT INTO LedgerEntry
           (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
            amount, currency, sourceType, sourceId, description, createdAt)
           VALUES (?, ?, ?, ?, 'investor_withdrawal_pending', ?,
                   ?, 'XOF', 'payout', ?, 'Réservation pour versement', ?)`
        )
        .bind(
          crypto.randomUUID(),
          `payout:${payoutId}:wallet`,
          sourceWallet,
          session.userId,
          payoutId,
          -amount,
          payoutId,
          now
        ),
      database
        .prepare(
          `INSERT INTO LedgerEntry
           (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
            amount, currency, sourceType, sourceId, description, createdAt)
           VALUES (?, ?, 'investor_withdrawal_pending', ?, ?, ?,
                   ?, 'XOF', 'payout', ?, 'Versement en attente du prestataire', ?)`
        )
        .bind(
          crypto.randomUUID(),
          `payout:${payoutId}:pending`,
          payoutId,
          sourceWallet,
          session.userId,
          amount,
          payoutId,
          now
        ),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'payout_requested', 'payout', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          payoutId,
          JSON.stringify({ amount, provider: "paydunya", withdrawMode, walletType }),
          requestIp(req),
          now
        ),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Une demande de versement est déjà en cours." },
      { status: 409 }
    );
  }

  return advancePayout(req, payout, payoutPhone, config, database, true);
}

async function advancePayout(
  req: NextRequest,
  payout: PayoutSettlementRow & { withdrawMode?: string | null },
  payoutPhone: string,
  config: NonNullable<ReturnType<typeof getPayDunyaConfig>>,
  database: D1Database,
  allowInitiate: boolean
) {
  let token = payout.partnerRef;
  try {
    if (!token) {
      if (!allowInitiate || !payout.withdrawMode) {
        await markPayoutUncertain(database, payout.id);
        return NextResponse.json(
          { payout: { ...publicPayout(payout), status: "uncertain" } },
          { status: 202 }
        );
      }
      token = await initiatePayDunyaDisbursement(config, {
        accountAlias: payoutPhone,
        amount: Number(payout.netAmount),
        withdrawMode: payout.withdrawMode,
        callbackUrl: `${config.publicAppUrl}/api/payouts/paydunya/webhook`,
      });
      await database
        .prepare(
          `UPDATE Payout SET partnerRef = ?, status = 'ordered'
           WHERE id = ? AND partnerRef IS NULL AND status = 'pending'`
        )
        .bind(token, payout.id)
        .run();
      payout = { ...payout, partnerRef: token, status: "ordered" };
    }

    let providerStatus: PayDunyaDisbursementStatus;
    try {
      await submitPayDunyaDisbursement(config, token, payout.id);
    } catch {
      // A network or provider response can be ambiguous; status verification
      // below is authoritative and prevents a duplicate payout.
    }
    providerStatus = await checkPayDunyaDisbursement(config, token);
    if (providerStatus.status?.toLowerCase() === "created") {
      await submitPayDunyaDisbursement(config, token, payout.id);
      providerStatus = await checkPayDunyaDisbursement(config, token);
    }

    const resolution = await resolvePayDunyaPayoutStatus(
      req,
      payout,
      providerStatus,
      database
    );
    return payoutResolutionResponse(payout, resolution);
  } catch (error) {
    console.error(
      "payout_provider_uncertain",
      error instanceof Error ? error.message : "unknown_error"
    );
    await markPayoutUncertain(database, payout.id);
    return NextResponse.json(
      {
        payout: { ...publicPayout(payout), status: "uncertain" },
        notice: "Votre demande est sécurisée. La confirmation du prestataire est en attente.",
      },
      { status: 202, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}

function payoutResolutionResponse(
  payout: PayoutSettlementRow,
  resolution: "completed" | "failed" | "ordered" | "uncertain"
) {
  const notices = {
    completed: "Le versement Mobile Money est confirmé.",
    failed: "Le versement n’a pas abouti. Le solde a été libéré.",
    ordered: "Le versement est en cours de traitement.",
    uncertain: "Votre demande est sécurisée et fait l’objet d’un rapprochement.",
  };
  return NextResponse.json(
    {
      payout: { ...publicPayout(payout), status: resolution },
      notice: notices[resolution],
    },
    {
      status: resolution === "completed" || resolution === "failed" ? 201 : 202,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
function publicPayout(payout: {
  id: string;
  amount: number;
  status: string;
  withdrawMode?: string | null;
  walletType?: string;
}) {
  return {
    id: payout.id,
    amount: Number(payout.amount),
    status: payout.status,
    withdrawMode: payout.withdrawMode || null,
    walletType: parseWalletType(payout.walletType) || "investment",
  };
}
