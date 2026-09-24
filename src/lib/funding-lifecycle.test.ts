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
      annualFollowUpPct REAL NOT NULL, equityOfferedPct REAL
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
       'amortized', 6, 2, NULL);
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

test("finalizeFundedOffer creates exact pending equity allocations once", async () => {
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
      annualFollowUpPct REAL NOT NULL, equityOfferedPct REAL
    );
    CREATE TABLE Investment (
      id TEXT PRIMARY KEY, offerId TEXT NOT NULL, investorType TEXT NOT NULL,
      investorId TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL,
      sharePct REAL NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
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
    CREATE TABLE EquityIssuance (
      id TEXT PRIMARY KEY, offerId TEXT NOT NULL UNIQUE, projectId TEXT NOT NULL,
      companyId TEXT NOT NULL, shareClass TEXT NOT NULL,
      totalOwnershipMicroPct INTEGER NOT NULL, status TEXT NOT NULL,
      resolutionRef TEXT, resolutionDate TEXT, declarationRef TEXT,
      shareRegisterRef TEXT, preparedBy TEXT, approvedBy TEXT,
      preparedAt TEXT, approvedAt TEXT, issuedAt TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE EquityAllocation (
      id TEXT PRIMARY KEY, issuanceId TEXT NOT NULL, investmentId TEXT NOT NULL UNIQUE,
      investorType TEXT NOT NULL, investorId TEXT NOT NULL,
      ownershipMicroPct INTEGER NOT NULL, status TEXT NOT NULL,
      certificateNo TEXT, issuedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );

    INSERT INTO Project VALUES
      ('project_eq', 'Capital régional', 'company_eq', 'equity', 'funding', NULL, NULL, '2026-01-01T00:00:00.000Z');
    INSERT INTO Offer VALUES
      ('offer_eq', 'project_eq', 'open', 4000000, 4000000, NULL, NULL, NULL,
       NULL, 6, 0, 12.5);
    INSERT INTO Investment VALUES
      ('inv_a', 'offer_eq', 'individual', 'user_a', 1000000, 'confirmed', 0,
       '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('inv_b', 'offer_eq', 'individual', 'user_b', 3000000, 'confirmed', 0,
       '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
    INSERT INTO CompanyMember VALUES ('member_eq', 'company_eq', 'company_user');
  `);

  const database = testD1(sqlite);
  assert.equal(await finalizeFundedOffer("offer_eq", database), true);
  assert.equal(await finalizeFundedOffer("offer_eq", database), true);

  const issuance = sqlite
    .prepare(
      `SELECT status, totalOwnershipMicroPct, shareClass
       FROM EquityIssuance WHERE offerId = 'offer_eq'`
    )
    .get() as Record<string, string | number>;
  assert.deepEqual(issuance, {
    status: "pending_documents",
    totalOwnershipMicroPct: 12_500_000,
    shareClass: "ordinary",
  });

  const allocations = sqlite
    .prepare(
      `SELECT investmentId, ownershipMicroPct, status
       FROM EquityAllocation ORDER BY investmentId`
    )
    .all() as Array<Record<string, string | number>>;
  assert.deepEqual(allocations, [
    { investmentId: "inv_a", ownershipMicroPct: 3_125_000, status: "pending_issuance" },
    { investmentId: "inv_b", ownershipMicroPct: 9_375_000, status: "pending_issuance" },
  ]);
  assert.equal(
    sqlite.prepare(`SELECT SUM(ownershipMicroPct) FROM EquityAllocation`).pluck().get(),
    12_500_000
  );
  assert.equal(sqlite.prepare(`SELECT sharePct FROM Investment WHERE id = 'inv_a'`).pluck().get(), 3.125);
  assert.equal(sqlite.prepare(`SELECT sharePct FROM Investment WHERE id = 'inv_b'`).pluck().get(), 9.375);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM EquityIssuance`).pluck().get(), 1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM EquityAllocation`).pluck().get(), 2);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM CompanyPayment`).pluck().get(), 0);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) FROM Notification`).pluck().get(), 3);
  sqlite.close();
});
