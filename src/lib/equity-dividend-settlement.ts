import { getD1, isoNow, requestIp } from "@/lib/d1";

export interface EquityDividendSettlement {
  id: string;
  projectId: string;
  companyId: string;
  netPayableAmount: number;
  status: string;
  paymentRef: string | null;
}

export async function settleEquityDividend(
  req: Request,
  dividend: EquityDividendSettlement,
  totalAmount: number,
  database: D1Database = getD1()
) {
  if (
    !Number.isSafeInteger(totalAmount) ||
    totalAmount <= 0 ||
    totalAmount !== Number(dividend.netPayableAmount)
  ) {
    throw new Error("Le montant reçu ne correspond pas au dividende approuvé");
  }

  const integrity = await database
    .prepare(
      `SELECT COUNT(*) AS allocationCount,
              COALESCE(SUM(netAmount), 0) AS allocatedNet
       FROM EquityDividendAllocation
       WHERE dividendId = ? AND status = 'pending'`
    )
    .bind(dividend.id)
    .first<{ allocationCount: number; allocatedNet: number }>();
  if (
    !integrity ||
    Number(integrity.allocationCount) < 1 ||
    Number(integrity.allocatedNet) !== totalAmount
  ) {
    if (dividend.status === "paid") return;
    throw new Error("La répartition du dividende est incohérente");
  }

  const now = isoNow();
  const eventId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE EquityDividend
         SET status = 'paid', paymentEventId = ?, paidAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'verifying' AND paymentRef = ?
           AND reviewedBy IS NOT NULL AND approvedBy IS NOT NULL
           AND reviewedBy != approvedBy`
      )
      .bind(eventId, now, now, dividend.id, dividend.paymentRef),
    conditionalLedger(database, {
      idemKey: `equity-dividend:${dividend.id}:external`,
      accountType: "company_external",
      accountId: dividend.companyId,
      counterpartyType: "equity_dividend_incoming",
      counterpartyId: dividend.id,
      amount: -totalAmount,
      sourceId: dividend.id,
      description: "Versement externe du dividende",
      now,
      dividendId: dividend.id,
      eventId,
    }),
    conditionalLedger(database, {
      idemKey: `equity-dividend:${dividend.id}:incoming`,
      accountType: "equity_dividend_incoming",
      accountId: dividend.id,
      counterpartyType: "company_external",
      counterpartyId: dividend.companyId,
      amount: totalAmount,
      sourceId: dividend.id,
      description: "Dividende reçu pour répartition",
      now,
      dividendId: dividend.id,
      eventId,
    }),
    database
      .prepare(
        `UPDATE EquityDividendAllocation
         SET status = 'available', availableAt = ?, updatedAt = ?
         WHERE dividendId = ? AND status = 'pending'
           AND EXISTS (
             SELECT 1 FROM EquityDividend
             WHERE id = ? AND status = 'paid' AND paymentEventId = ?
           )`
      )
      .bind(now, now, dividend.id, dividend.id, eventId),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT lower(hex(randomblob(16))),
                'equity-dividend:' || a.dividendId || ':' || a.id || ':debit',
                'equity_dividend_incoming', a.dividendId,
                'investor_wallet', a.investorId,
                -a.netAmount, 'XOF', 'equity_dividend', a.id,
                'Répartition du dividende', ?
         FROM EquityDividendAllocation a
         WHERE a.dividendId = ? AND a.status = 'available'
           AND EXISTS (
             SELECT 1 FROM EquityDividend
             WHERE id = ? AND status = 'paid' AND paymentEventId = ?
           )
           AND NOT EXISTS (
             SELECT 1 FROM LedgerEntry l
             WHERE l.idemKey = 'equity-dividend:' || a.dividendId || ':' || a.id || ':debit'
           )`
      )
      .bind(now, dividend.id, dividend.id, eventId),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT lower(hex(randomblob(16))),
                'equity-dividend:' || a.dividendId || ':' || a.id || ':credit',
                'investor_wallet', a.investorId,
                'equity_dividend_incoming', a.dividendId,
                a.netAmount, 'XOF', 'equity_dividend', a.id,
                'Dividende disponible', ?
         FROM EquityDividendAllocation a
         WHERE a.dividendId = ? AND a.status = 'available'
           AND EXISTS (
             SELECT 1 FROM EquityDividend
             WHERE id = ? AND status = 'paid' AND paymentEventId = ?
           )
           AND NOT EXISTS (
             SELECT 1 FROM LedgerEntry l
             WHERE l.idemKey = 'equity-dividend:' || a.dividendId || ':' || a.id || ':credit'
           )`
      )
      .bind(now, dividend.id, dividend.id, eventId),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT lower(hex(randomblob(16))), a.investorId, 'equity_dividend',
                'Dividende reçu',
                CAST(a.netAmount AS TEXT) ||
                  ' FCFA nets sont disponibles dans votre portefeuille.',
                0, 'investor_dashboard', ?
         FROM EquityDividendAllocation a
         WHERE a.dividendId = ? AND a.investorType = 'individual'
           AND a.status = 'available'
           AND EXISTS (
             SELECT 1 FROM EquityDividend
             WHERE id = ? AND status = 'paid' AND paymentEventId = ?
           )
           AND NOT EXISTS (
             SELECT 1 FROM Notification n
             WHERE n.userId = a.investorId AND n.type = 'equity_dividend'
               AND n.message = CAST(a.netAmount AS TEXT) ||
                 ' FCFA nets sont disponibles dans votre portefeuille.'
           )`
      )
      .bind(now, dividend.id, dividend.id, eventId),
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         SELECT ?, ?, 'equity_dividend_paid',
                'Dividende validé, réglé et réparti aux associés inscrits',
                'system', ?
         WHERE EXISTS (
           SELECT 1 FROM EquityDividend
           WHERE id = ? AND status = 'paid' AND paymentEventId = ?
         ) AND NOT EXISTS (
           SELECT 1 FROM ProjectEvent
           WHERE projectId = ? AND eventType = 'equity_dividend_paid'
             AND description LIKE '%' || ? || '%'
         )`
      )
      .bind(
        crypto.randomUUID(),
        dividend.projectId,
        now,
        dividend.id,
        eventId,
        dividend.projectId,
        dividend.id
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'equity_dividend_settled',
                'equity_dividend', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityDividend
           WHERE id = ? AND status = 'paid' AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        dividend.id,
        JSON.stringify({ projectId: dividend.projectId, amount: totalAmount }),
        requestIp(req),
        now,
        dividend.id,
        eventId
      ),
  ];

  const results = await database.batch(statements);
  if ((results[0].meta.changes || 0) !== 1) {
    const current = await database
      .prepare(`SELECT status FROM EquityDividend WHERE id = ? LIMIT 1`)
      .bind(dividend.id)
      .first<{ status: string }>();
    if (current?.status !== "paid") {
      throw new Error("Le dividende doit être rapproché manuellement");
    }
  }
}

function conditionalLedger(
  database: D1Database,
  entry: {
    idemKey: string;
    accountType: string;
    accountId: string;
    counterpartyType: string;
    counterpartyId: string;
    amount: number;
    sourceId: string;
    description: string;
    now: string;
    dividendId: string;
    eventId: string;
  }
) {
  return database
    .prepare(
      `INSERT INTO LedgerEntry
       (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
        amount, currency, sourceType, sourceId, description, createdAt)
       SELECT ?, ?, ?, ?, ?, ?, ?, 'XOF', 'equity_dividend', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM EquityDividend
         WHERE id = ? AND status = 'paid' AND paymentEventId = ?
       )`
    )
    .bind(
      crypto.randomUUID(),
      entry.idemKey,
      entry.accountType,
      entry.accountId,
      entry.counterpartyType,
      entry.counterpartyId,
      entry.amount,
      entry.sourceId,
      entry.description,
      entry.now,
      entry.dividendId,
      entry.eventId
    );
}
