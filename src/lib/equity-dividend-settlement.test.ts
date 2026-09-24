import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import {
  settleEquityDividend,
  type EquityDividendSettlement,
} from "./equity-dividend-settlement";

interface TestStatement {
  bind: (...values: unknown[]) => TestStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
  execute: () => { success: boolean; meta: { changes: number } };
}

function testD1(sqlite: Database.Database): D1Database {
  const prepare = (sql: string, values: unknown[] = []): TestStatement => ({
    bind: (...nextValues) => prepare(sql, nextValues),
    first: async <T>() => (sqlite.prepare(sql).get(...values) as T | undefined) ?? null,
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...values) as T[] }),
    run: async () => {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: result.changes } };
    },
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

test("equity dividend settlement balances the ledger and is idempotent", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE EquityDividend (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, companyId TEXT NOT NULL,
      netPayableAmount INTEGER NOT NULL, status TEXT NOT NULL, paymentRef TEXT,
      paymentEventId TEXT, paidAt TEXT, updatedAt TEXT,
      reviewedBy TEXT, approvedBy TEXT
    );
    CREATE TABLE EquityDividendAllocation (
      id TEXT PRIMARY KEY, dividendId TEXT NOT NULL, investmentId TEXT NOT NULL,
      investorType TEXT NOT NULL, investorId TEXT NOT NULL,
      grossAmount INTEGER NOT NULL, withholdingAmount INTEGER NOT NULL,
      netAmount INTEGER NOT NULL, status TEXT NOT NULL,
      availableAt TEXT, updatedAt TEXT
    );
    CREATE TABLE LedgerEntry (
      id TEXT PRIMARY KEY, idemKey TEXT NOT NULL UNIQUE, accountType TEXT NOT NULL,
      accountId TEXT NOT NULL, counterpartyType TEXT, counterpartyId TEXT,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, sourceType TEXT NOT NULL,
      sourceId TEXT NOT NULL, description TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE Notification (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL,
      actionUrl TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE ProjectEvent (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, eventType TEXT NOT NULL,
      description TEXT NOT NULL, actor TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE AuditLog (
      id TEXT PRIMARY KEY, actorType TEXT NOT NULL, actorId TEXT NOT NULL,
      action TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT NOT NULL,
      metadata TEXT NOT NULL, ipAddress TEXT, createdAt TEXT NOT NULL
    );
    INSERT INTO EquityDividend VALUES
      ('div_1', 'project_1', 'company_1', 9000000, 'verifying', 'token_1',
       NULL, NULL, '2026-01-01', 'legal_1', 'finance_1');
    INSERT INTO EquityDividendAllocation VALUES
      ('da_1', 'div_1', 'inv_1', 'individual', 'user_1', 2500000, 250000, 2250000, 'pending', NULL, '2026-01-01'),
      ('da_2', 'div_1', 'inv_2', 'individual', 'user_2', 7500000, 750000, 6750000, 'pending', NULL, '2026-01-01');
  `);

  const dividend: EquityDividendSettlement = {
    id: "div_1",
    projectId: "project_1",
    companyId: "company_1",
    netPayableAmount: 9_000_000,
    status: "verifying",
    paymentRef: "token_1",
  };
  const database = testD1(sqlite);
  const request = new NextRequest("https://example.com/api/payments/paydunya/webhook");

  await settleEquityDividend(request, dividend, 9_000_000, database);
  await settleEquityDividend(
    request,
    { ...dividend, status: "paid" },
    9_000_000,
    database
  );

  assert.equal(sqlite.prepare(`SELECT status FROM EquityDividend`).pluck().get(), "paid");
  assert.equal(
    sqlite.prepare(`SELECT COUNT(*) FROM EquityDividendAllocation WHERE status = 'available'`).pluck().get(),
    2
  );
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry`).pluck().get(), 0);
  assert.equal(
    sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'investor_wallet'`).pluck().get(),
    9_000_000
  );
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM Notification`).pluck().get(), 2);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM AuditLog`).pluck().get(), 1);
  sqlite.close();
});
