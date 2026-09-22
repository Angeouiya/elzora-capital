import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";

interface PayoutRow extends Record<string, unknown> {
  id: string;
  amount: number;
  fees: number;
  netAmount: number;
  status: string;
  partnerRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface UserKycRow extends Record<string, unknown> {
  kycStatus: string;
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
  const [balance, payouts] = await Promise.all([
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = 'investor_wallet' AND accountId = ?`
      )
      .bind(session.userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT id, amount, fees, netAmount, status,
                partnerRef, createdAt, completedAt
         FROM Payout WHERE investorId = ?
         ORDER BY createdAt DESC LIMIT 30`
      )
      .bind(session.userId)
      .all<PayoutRow>(),
  ]);

  return NextResponse.json(
    {
      payouts: payouts.results,
      availableBalance: Number(balance?.balance || 0),
      payoutsEnabled: capabilities.payoutsEnabled,
      providerName: capabilities.providerName,
      payoutMethods: capabilities.payoutMethods,
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
  if (!capabilities.payoutsEnabled) {
    return NextResponse.json(
      {
        error:
          "Les versements sont en cours d'activation avec un prestataire de paiement agréé. Aucun compte bancaire ou Mobile Money n'est collecté pour le moment.",
        code: "PAYOUTS_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const providerRecipientId = String(body.providerRecipientId || "").trim();
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Le montant doit être un entier strictement positif." },
      { status: 400 }
    );
  }
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(providerRecipientId)) {
    return NextResponse.json(
      { error: "Sélectionnez un moyen de versement préalablement vérifié." },
      { status: 400 }
    );
  }

  const database = getD1();
  const [user, balance, openPayout] = await Promise.all([
    database
      .prepare(`SELECT kycStatus FROM User WHERE id = ? LIMIT 1`)
      .bind(session.userId)
      .first<UserKycRow>(),
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = 'investor_wallet' AND accountId = ?`
      )
      .bind(session.userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT id FROM Payout
         WHERE investorId = ? AND status IN ('pending', 'ordered', 'uncertain')
         LIMIT 1`
      )
      .bind(session.userId)
      .first<{ id: string }>(),
  ]);

  if (!user || user.kycStatus !== "verified") {
    return NextResponse.json(
      { error: "Votre identité doit être vérifiée avant tout versement." },
      { status: 403 }
    );
  }
  if (openPayout) {
    return NextResponse.json(
      { error: "Une demande de versement est déjà en cours de traitement." },
      { status: 409 }
    );
  }
  if (amount > Number(balance?.balance || 0)) {
    return NextResponse.json({ error: "Solde disponible insuffisant." }, { status: 409 });
  }

  const payoutId = crypto.randomUUID();
  const now = isoNow();
  const auditId = crypto.randomUUID();
  const notificationId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO Payout
           (id, investorType, investorId, amount, fees, netAmount, status,
            beneficiaryAccount, partnerRef, createdAt, completedAt)
           VALUES (?, 'individual', ?, ?, 0, ?, 'pending', ?, NULL, ?, NULL)`
        )
        .bind(payoutId, session.userId, amount, amount, providerRecipientId, now),
      database
        .prepare(
          `INSERT INTO LedgerEntry
           (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
            amount, currency, sourceType, sourceId, description, createdAt)
           VALUES (?, ?, 'investor_wallet', ?, 'investor_withdrawal_pending', ?,
                   ?, 'XOF', 'payout', ?, 'Réservation pour versement', ?)`
        )
        .bind(
          crypto.randomUUID(),
          `payout:${payoutId}:wallet`,
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
           VALUES (?, ?, 'investor_withdrawal_pending', ?, 'investor_wallet', ?,
                   ?, 'XOF', 'payout', ?, 'Versement en attente du prestataire', ?)`
        )
        .bind(
          crypto.randomUUID(),
          `payout:${payoutId}:pending`,
          payoutId,
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
          auditId,
          session.userId,
          payoutId,
          JSON.stringify({ amount, provider: capabilities.providerName }),
          requestIp(req),
          now
        ),
      database
        .prepare(
          `INSERT INTO Notification
           (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'payout', 'Versement demandé',
                   'Votre demande est transmise au prestataire de paiement.', 0, NULL, ?)`
        )
        .bind(notificationId, session.userId, now),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Une demande de versement est déjà en cours ou n'a pas pu être réservée." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      payout: { id: payoutId, amount, status: "pending", createdAt: now },
      notice: "Votre demande a été transmise au prestataire de paiement.",
    },
    { status: 201 }
  );
}
