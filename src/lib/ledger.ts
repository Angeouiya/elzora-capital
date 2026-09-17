// ============================================================================
// GRAND LIVRE — Comptabilité en partie double
// ============================================================================
// Toute mutation financière écrit au moins 2 lignes (débit/crédit).
// Le solde d'un compte = somme des écritures pour ce (accountType, accountId).
// Chaque écriture porte une idemKey unique → idempotence (anti double-paiement).

import { db } from "./db";
import { randomUUID } from "crypto";

export type AccountType =
  | "investor_wallet"       // fonds disponibles de l'investisseur sur la plateforme
  | "investor_locked"       // fonds engagés (en attente de confirmation collecte)
  | "escrow"                 // séquestre (fonds reçus des investisseurs, attente clôture)
  | "company_payout"         // fonds versés à l'entreprise
  | "company_incoming"       // fonds reçus par l'entreprise (paiement échéance)
  | "platform_revenue"       // commissions de la plateforme
  | "investor_external";     // fonds versés au compte bancaire investisseur

export type SourceType =
  | "investment"
  | "disbursement"
  | "company_payment"
  | "distribution"
  | "payout"
  | "commission";

export interface LedgerInput {
  accountType: AccountType;
  accountId: string;
  amount: bigint;       // signé : + crédit, - débit
  counterpartyType?: AccountType;
  counterpartyId?: string;
  sourceType: SourceType;
  sourceId: string;
  description: string;
  idemKey: string;      // idempotence
}

// Écrit une paire débit/crédit de manière transactionnelle + idempotente.
// Si l'idemKey existe déjà, n'écrit rien (déjà traité).
export async function postLedgerEntry(
  from: Omit<LedgerInput, "amount"> & { amount: bigint },
  to: Omit<LedgerInput, "amount"> & { amount: bigint }
): Promise<void> {
  // Idempotence : on vérifie si l'idemKey existe déjà
  const existing = await db.ledgerEntry.findFirst({
    where: { idemKey: from.idemKey },
    select: { id: true },
  });
  if (existing) return; // déjà écrit

  await db.$transaction([
    db.ledgerEntry.create({
      data: {
        ...from,
        amount: -from.amount, // débit sur "from"
        counterpartyType: to.accountType,
        counterpartyId: to.accountId,
      },
    }),
    db.ledgerEntry.create({
      data: {
        ...to,
        amount: to.amount, // crédit sur "to"
        counterpartyType: from.accountType,
        counterpartyId: from.accountId,
        // même idemKey suffixé pour garder la paire identifiable
        idemKey: to.idemKey || from.idemKey + ":credit",
      },
    }),
  ]);
}

// Calcule le solde d'un compte à partir des écritures du grand livre.
export async function getBalance(
  accountType: AccountType,
  accountId: string
): Promise<bigint> {
  const entries = await db.ledgerEntry.findMany({
    where: { accountType, accountId },
    select: { amount: true },
  });
  return entries.reduce((acc, e) => acc + e.amount, 0n);
}

// Génère une clé d'idempotence unique pour une opération.
export function genIdemKey(prefix: string, sourceId: string): string {
  return `${prefix}:${sourceId}:${randomUUID()}`;
}
