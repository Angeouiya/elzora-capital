import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { settlePayout, type PayoutSettlementRow } from "./payout-settlement";

interface TestStatement {
  bind: (...values: unknown[]) => TestStatement;
  execute: () => { success: boolean; meta: { changes: number } };
}

function testD1(sqlite: Database.Database): D1Database {
  const prepare = (sql: string, values: unknown[] = []): TestStatement => ({
    bind: (...nextValues) => prepare(sql, nextValues),
    execute: () => {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: result.changes } };
    },
  });
  return {
    prepare: (sql: string) => prepare(sql),
    batch: async (statements: D1PreparedStatement[]) => {
      const local = statements as unknown as TestStatement[];
      return sqlite.transaction(() => local.map((statement) => statement.execute()))() as never;
    },
  } as unknown as D1Database;
}

function databaseForPayout(id: string, status = "ordered") {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE Payout (
      id TEXT PRIMARY KEY, investorId TEXT NOT NULL, amount INTEGER NOT NULL,
      netAmount INTEGER NOT NULL, fees INTEGER NOT NULL, status TEXT NOT NULL,
      partnerRef TEXT, providerEventId TEXT, failureReason TEXT, completedAt TEXT
    );
    CREATE TABLE LedgerEntry (
      id TEXT PRIMARY KEY, idemKey TEXT UNIQUE, accountType TEXT NOT NULL,
      accountId TEXT NOT NULL, counterpartyType TEXT, counterpartyId TEXT,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, sourceType TEXT NOT NULL,
      sourceId TEXT NOT NULL, description TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE AuditLog (
      id TEXT PRIMARY KEY, actorType TEXT, actorId TEXT, action TEXT,
      entityType TEXT, entityId TEXT, metadata TEXT, ipAddress TEXT, createdAt TEXT
    );
    CREATE TABLE Notification (
      id TEXT PRIMARY KEY, userId TEXT, type TEXT, title TEXT, message TEXT,
      read INTEGER, actionUrl TEXT, createdAt TEXT
    );
  `);
  sqlite
    .prepare(`INSERT INTO Payout VALUES (?, 'user_1', 50000, 50000, 0, ?, 'token_1', NULL, NULL, NULL)`)
    .run(id, status);
  sqlite.exec(`
    INSERT INTO LedgerEntry VALUES
      ('l1', 'payout:${id}:wallet', 'investor_wallet', 'user_1',
       'investor_withdrawal_pending', '${id}', -50000, 'XOF', 'payout', '${id}', 'reserve', '2026-01-01'),
      ('l2', 'payout:${id}:pending', 'investor_withdrawal_pending', '${id}',
       'investor_wallet', 'user_1', 50000, 'XOF', 'payout', '${id}', 'pending', '2026-01-01');
  `);
  return sqlite;
}

test("successful payout closes the pending account exactly once", async () => {
  const sqlite = databaseForPayout("payout_success");
  const payout: PayoutSettlementRow = {
    id: "payout_success", investorId: "user_1", amount: 50_000,
    netAmount: 50_000, status: "ordered", partnerRef: "token_1",
  };
  const request = new Request("https://example.com/api/payouts/paydunya/webhook");
  await settlePayout(request, payout, { status: "success", fees: 800 }, testD1(sqlite));
  await settlePayout(request, { ...payout, status: "completed" }, { status: "success" }, testD1(sqlite));
  assert.equal(sqlite.prepare(`SELECT status FROM Payout`).pluck().get(), "completed");
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry`).pluck().get(), 0);
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'investor_wallet'`).pluck().get(), -50_000);
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'investor_external'`).pluck().get(), 50_000);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM AuditLog`).pluck().get(), 1);
  sqlite.close();
});

test("failed payout releases the reserved wallet balance", async () => {
  const sqlite = databaseForPayout("payout_failed");
  const payout: PayoutSettlementRow = {
    id: "payout_failed", investorId: "user_1", amount: 50_000,
    netAmount: 50_000, status: "ordered", partnerRef: "token_1",
  };
  await settlePayout(
    new Request("https://example.com/api/payouts/paydunya/webhook"),
    payout,
    { status: "failed", failureReason: "operator_rejected" },
    testD1(sqlite)
  );
  assert.equal(sqlite.prepare(`SELECT status FROM Payout`).pluck().get(), "failed");
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry`).pluck().get(), 0);
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'investor_wallet'`).pluck().get(), 0);
  sqlite.close();
});
