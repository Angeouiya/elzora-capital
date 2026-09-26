-- Deux compartiments lisibles pour l'investisseur :
-- - investor_wallet : argent destiné aux investissements et revenus reçus ;
-- - investor_reserve_wallet : réserve disponible, séparée des souscriptions.

ALTER TABLE "Payout"
  ADD COLUMN "walletType" TEXT NOT NULL DEFAULT 'investment'
  CHECK ("walletType" IN ('investment', 'reserve'));

CREATE TABLE "WalletDeposit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "investorId" TEXT NOT NULL,
  "walletType" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paymentRef" TEXT,
  "providerEventId" TEXT,
  "failureReason" TEXT,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "confirmedAt" DATETIME,
  CONSTRAINT "WalletDeposit_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WalletDeposit_walletType_check"
    CHECK ("walletType" IN ('investment', 'reserve')),
  CONSTRAINT "WalletDeposit_method_check"
    CHECK ("method" IN ('card', 'mobile_money', 'bank_transfer')),
  CONSTRAINT "WalletDeposit_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "WalletDeposit_currency_check" CHECK ("currency" = 'XOF'),
  CONSTRAINT "WalletDeposit_status_check"
    CHECK ("status" IN ('pending', 'review', 'provider_pending', 'confirmed', 'failed', 'cancelled'))
);

CREATE UNIQUE INDEX "WalletDeposit_paymentRef_key"
  ON "WalletDeposit"("paymentRef") WHERE "paymentRef" IS NOT NULL;
CREATE UNIQUE INDEX "WalletDeposit_providerEventId_key"
  ON "WalletDeposit"("providerEventId") WHERE "providerEventId" IS NOT NULL;
CREATE INDEX "WalletDeposit_investor_status_createdAt_idx"
  ON "WalletDeposit"("investorId", "status", "createdAt");
CREATE INDEX "WalletDeposit_investor_method_createdAt_idx"
  ON "WalletDeposit"("investorId", "method", "createdAt");

CREATE TABLE "WalletTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestKey" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "fromWallet" TEXT NOT NULL,
  "toWallet" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" DATETIME NOT NULL,
  CONSTRAINT "WalletTransfer_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WalletTransfer_fromWallet_check"
    CHECK ("fromWallet" IN ('investment', 'reserve')),
  CONSTRAINT "WalletTransfer_toWallet_check"
    CHECK ("toWallet" IN ('investment', 'reserve')),
  CONSTRAINT "WalletTransfer_distinct_wallets_check" CHECK ("fromWallet" <> "toWallet"),
  CONSTRAINT "WalletTransfer_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "WalletTransfer_currency_check" CHECK ("currency" = 'XOF'),
  CONSTRAINT "WalletTransfer_status_check" CHECK ("status" = 'completed')
);

CREATE UNIQUE INDEX "WalletTransfer_requestKey_key"
  ON "WalletTransfer"("requestKey");
CREATE INDEX "WalletTransfer_investor_createdAt_idx"
  ON "WalletTransfer"("investorId", "createdAt");

CREATE INDEX "Payout_investor_wallet_status_idx"
  ON "Payout"("investorId", "walletType", "status");

PRAGMA optimize;
