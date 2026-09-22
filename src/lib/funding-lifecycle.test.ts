import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { finalizeFundedOffer } from "./funding-lifecycle";

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

test("finalizeFundedOffer closes funding and creates an idempotent schedule", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE Project (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, companyId TEXT NOT NULL,
      instrumentType TEXT NOT NULL, status TEXT NOT NULL,
      fundedAt TEXT, closedAt TEXT, updatedAt TEXT NOT NULL
    );
    CREATE TABLE Offer (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, status TEXT NOT NULL,
      fundingGoal INTEGER NOT NULL, raisedAmount INTEGER NOT NULL,
      annualRate REAL, ratePeriod TEXT, durationMonths INTEGER,
      repaymentType TEXT, upfrontCommissionPct REAL NOT NULL,
      annualFollowUpPct REAL NOT NULL
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
    CREATE TABLE CompanyPayment (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, installmentNo INTEGER NOT NULL,
      dueDate TEXT NOT NULL, capitalDue INTEGER NOT NULL, interestDue INTEGER NOT NULL,
      followUpFeeDue INTEGER NOT NULL, totalDue INTEGER NOT NULL, status TEXT NOT NULL,
      paidAt TEXT, paidAmount INTEGER NOT NULL, remaining INTEGER NOT NULL,
      paymentRef TEXT, paymentEventId TEXT, createdAt TEXT NOT NULL,
      UNIQUE(projectId, installmentNo)
    );
    CREATE TABLE CompanyMember (id TEXT PRIMARY KEY, companyId TEXT NOT NULL, userId TEXT NOT NULL);
    CREATE TABLE Notification (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL,
      actionUrl TEXT, createdAt TEXT NOT NULL
    );

    INSERT INTO Project VALUES
      ('project_1', 'Atelier solaire', 'company_1', 'debt', 'funding', NULL, NULL, '2026-01-01T00:00:00.000Z');
    INSERT INTO Offer VALUES
      ('offer_1', 'project_1', 'open', 1000000, 1000000, 8, 'total', 6,
       'amortized', 6, 2);
    INSERT INTO CompanyMember VALUES ('member_1', 'company_1', 'user_1');
  `);

  const database = testD1(sqlite);
  assert.equal(await finalizeFundedOffer("offer_1", database), true);
  assert.equal(await finalizeFundedOffer("offer_1", database), true);

  assert.equal(sqlite.prepare(`SELECT status FROM Offer WHERE id = 'offer_1'`).pluck().get(), "funded");
  assert.equal(sqlite.prepare(`SELECT status FROM Project WHERE id = 'project_1'`).pluck().get(), "funded");

  const schedule = sqlite
    .prepare(
      `SELECT COUNT(*) AS count,
              SUM(capitalDue) AS capital,
              SUM(interestDue) AS interest,
              SUM(followUpFeeDue) AS fee,
              SUM(totalDue) AS total,
              SUM(remaining) AS remaining
       FROM CompanyPayment WHERE projectId = 'project_1'`
    )
    .get() as Record<string, number>;
  assert.deepEqual(schedule, {
    count: 6,
    capital: 1_000_000,
    interest: 80_000,
    fee: 10_000,
    total: 1_090_000,
    remaining: 1_090_000,
  });
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM ProjectEvent`).pluck().get(), 1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM AuditLog`).pluck().get(), 1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM Notification`).pluck().get(), 1);
  sqlite.close();
});
