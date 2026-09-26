import { getD1, isoNow, requestIp } from "@/lib/d1";
import { parseWalletType, walletAccountType } from "@/lib/wallets";

export interface PayoutSettlementRow extends Record<string, unknown> {
  id: string;
  investorId: string;
  amount: number;
  netAmount: number;
  status: string;
  partnerRef: string | null;
  walletType: string;
}

export async function settlePayout(
  req: Request,
  payout: PayoutSettlementRow,
  outcome: {
    status: "success" | "failed";
    fees?: number;
    failureReason?: string | null;
    transactionId?: string | null;
  },
  database: D1Database = getD1()
) {
  if (payout.status === "completed" || payout.status === "failed") return;
  const now = isoNow();
  const eventId = crypto.randomUUID();
  const amount = Number(payout.amount);
  const fees = Number.isSafeInteger(outcome.fees) && Number(outcome.fees) >= 0
    ? Number(outcome.fees)
    : 0;
  const success = outcome.status === "success";
  const finalStatus = success ? "completed" : "failed";
  const sourceWallet = walletAccountType(parseWalletType(payout.walletType) || "investment");

  const statements = [
    database
      .prepare(
        `UPDATE Payout
         SET status = ?, fees = ?, completedAt = ?, providerEventId = ?,
             failureReason = ?
         WHERE id = ? AND status IN ('pending', 'ordered', 'uncertain')`
      )
      .bind(
        finalStatus,
        fees,
        now,
        eventId,
        success ? null : outcome.failureReason || "Versement refusé par le prestataire",
        payout.id
      ),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, 'investor_withdrawal_pending', ?, ?, ?, ?, 'XOF',
                'payout', ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Payout WHERE id = ? AND providerEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        success ? `payout:${payout.id}:pending-complete` : `payout:${payout.id}:pending-release`,
        payout.id,
        success ? "investor_external" : sourceWallet,
        payout.investorId,
        -amount,
        payout.id,
        success ? "Versement exécuté" : "Annulation de la réservation",
        now,
        payout.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT ?, ?, ?, ?, 'investor_withdrawal_pending', ?, ?, 'XOF',
                'payout', ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Payout WHERE id = ? AND providerEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        success ? `payout:${payout.id}:external` : `payout:${payout.id}:wallet-release`,
        success ? "investor_external" : sourceWallet,
        payout.investorId,
        payout.id,
        amount,
        payout.id,
        success ? "Fonds versés au bénéficiaire" : "Solde rendu disponible",
        now,
        payout.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', ?, 'payout', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Payout WHERE id = ? AND providerEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        success ? "payout_completed" : "payout_failed",
        payout.id,
        JSON.stringify({
          amount,
          fees,
          transactionId: outcome.transactionId || null,
          failureReason: success ? null : outcome.failureReason || null,
        }),
        requestIp(req),
        now,
        payout.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT ?, ?, 'payout', ?, ?, 0, 'investor_dashboard', ?
         WHERE EXISTS (
           SELECT 1 FROM Payout WHERE id = ? AND providerEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        payout.investorId,
        success ? "Versement effectué" : "Versement non abouti",
        success
          ? `${amount.toLocaleString("fr-FR")} FCFA ont été versés sur votre compte Mobile Money.`
          : `Le montant réservé est de nouveau disponible dans votre portefeuille ${payout.walletType === "reserve" ? "de réserve" : "d’investissement"}.`,
        now,
        payout.id,
        eventId
      ),
  ];

  await database.batch(statements);
}
