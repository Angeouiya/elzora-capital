import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import {
  settleCompanyPayment,
  type CompanyPaymentSettlement,
} from "./company-payment-settlement";

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

test("company settlement balances ledger and distributes exactly once", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE CompanyPayment (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, installmentNo INTEGER NOT NULL,
      capitalDue INTEGER NOT NULL, interestDue INTEGER NOT NULL,
      followUpFeeDue INTEGER NOT NULL, totalDue INTEGER NOT NULL,
      paidAmount INTEGER NOT NULL, remaining INTEGER NOT NULL, status TEXT NOT NULL,
      paidAt TEXT, paymentRef TEXT, paymentEventId TEXT
    );
    CREATE TABLE Investment (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, investorType TEXT NOT NULL,
      investorId TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE Distribution (
      id TEXT PRIMARY KEY, companyPaymentId TEXT NOT NULL, investmentId TEXT NOT NULL,
      amount INTEGER NOT NULL, capitalPortion INTEGER NOT NULL,
      interestPortion INTEGER NOT NULL, feePortion INTEGER NOT NULL,
      status TEXT NOT NULL, createdAt TEXT NOT NULL, availableAt TEXT,
      UNIQUE(companyPaymentId, investmentId)
    );
    CREATE TABLE LedgerEntry (
      id TEXT PRIMARY KEY, idemKey TEXT NOT NULL UNIQUE, accountType TEXT NOT NULL,
      accountId TEXT NOT NULL, counterpartyType TEXT, counterpartyId TEXT,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, sourceType TEXT NOT NULL,
      sourceId TEXT NOT NULL, description TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE Project (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, companyId TEXT NOT NULL,
      status TEXT NOT NULL, closedAt TEXT, updatedAt TEXT NOT NULL
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
    CREATE TABLE Notification (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL,
      actionUrl TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE CompanyMember (id TEXT PRIMARY KEY, companyId TEXT NOT NULL, userId TEXT NOT NULL);

    INSERT INTO Project VALUES
      ('project_1', 'Atelier solaire', 'company_1', 'funded', NULL, '2026-01-01T00:00:00.000Z');
    INSERT INTO CompanyPayment VALUES
      ('payment_1', 'project_1', 1, 100000, 8000, 1000, 109000,
       0, 109000, 'verifying', NULL, 'token_1', NULL);
    INSERT INTO Investment VALUES
      ('inv_1', 'project_1', 'individual', 'user_1', 10000, 'confirmed', '2026-01-01T00:00:00.000Z'),
      ('inv_2', 'project_1', 'individual', 'user_2', 35000, 'confirmed', '2026-01-02T00:00:00.000Z'),
      ('inv_3', 'project_1', 'individual', 'user_3', 55000, 'confirmed', '2026-01-03T00:00:00.000Z');
    INSERT INTO CompanyMember VALUES ('member_1', 'company_1', 'company_user_1');
  `);

  const database = testD1(sqlite);
  const payment: CompanyPaymentSettlement = {
    id: "payment_1",
    projectId: "project_1",
    installmentNo: 1,
    capitalDue: 100_000,
    interestDue: 8_000,
    followUpFeeDue: 1_000,
    totalDue: 109_000,
    paidAmount: 0,
    remaining: 109_000,
    status: "verifying",
    paymentRef: "token_1",
  };
  const request = new NextRequest("https://example.com/api/payments/paydunya/webhook");

  await settleCompanyPayment(request, payment, 109_000, database);
  await settleCompanyPayment(request, payment, 109_000, database);

  assert.equal(sqlite.prepare(`SELECT status FROM CompanyPayment`).pluck().get(), "paid");
  assert.equal(sqlite.prepare(`SELECT status FROM Project`).pluck().get(), "completed");
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM Distribution`).pluck().get(), 3);
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM Distribution`).pluck().get(), 108_000);
  assert.equal(sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry`).pluck().get(), 0);
  assert.equal(
    sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'investor_wallet'`).pluck().get(),
    108_000
  );
  assert.equal(
    sqlite.prepare(`SELECT SUM(amount) FROM LedgerEntry WHERE accountType = 'platform_revenue'`).pluck().get(),
    1_000
  );
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM AuditLog`).pluck().get(), 1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM ProjectEvent`).pluck().get(), 1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM Notification`).pluck().get(), 4);
  sqlite.close();
});
