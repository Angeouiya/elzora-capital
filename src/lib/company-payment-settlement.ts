import { getD1, isoNow, requestIp } from "@/lib/d1";
import { allocateProRata } from "@/lib/money-allocation";

export interface CompanyPaymentSettlement {
  id: string;
  projectId: string;
  installmentNo: number;
  capitalDue: number;
  interestDue: number;
  followUpFeeDue: number;
  totalDue: number;
  paidAmount: number;
  remaining: number;
  status: string;
  paymentRef: string | null;
}

interface DistributionInvestmentRow extends Record<string, unknown> {
  id: string;
  amount: number;
}

export async function settleCompanyPayment(
  req: Request,
  payment: CompanyPaymentSettlement,
  totalAmount: number,
  database: D1Database = getD1()
) {
  const investmentResult = await database
    .prepare(
      `SELECT id, amount FROM Investment
       WHERE projectId = ? AND status = 'confirmed'
       ORDER BY createdAt ASC, id ASC`
    )
    .bind(payment.projectId)
    .all<DistributionInvestmentRow>();
  const investments = investmentResult.results;
  if (investments.length === 0) {
    throw new Error("Aucun investissement confirmé à distribuer");
  }

  const weights = investments.map((investment) => Number(investment.amount));
  const capitalParts = allocateProRata(Number(payment.capitalDue), weights);
  const interestParts = allocateProRata(Number(payment.interestDue), weights);
  const distributionPayload = JSON.stringify(
    investments.map((investment, index) => ({
      investmentId: investment.id,
      capital: capitalParts[index],
      interest: interestParts[index],
      amount: capitalParts[index] + interestParts[index],
    }))
  );

  const expectedTotal =
    Number(payment.capitalDue) +
    Number(payment.interestDue) +
    Number(payment.followUpFeeDue);
  if (expectedTotal !== totalAmount) {
    throw new Error("Le montant reçu ne correspond pas à l'échéance");
  }

  const now = isoNow();
  const eventId = crypto.randomUUID();
  const companyAccountId = payment.projectId;
  const statements = [
    database
      .prepare(
        `UPDATE CompanyPayment
         SET status = 'paid', paidAt = ?, paidAmount = ?, remaining = 0,
             paymentEventId = ?
         WHERE id = ? AND status = 'verifying' AND paymentRef = ?`
      )
      .bind(now, totalAmount, eventId, payment.id, payment.paymentRef),
    ledgerInsert(database, {
      idemKey: `company-payment:${payment.id}:external`,
      accountType: "company_external",
      accountId: companyAccountId,
      counterpartyType: "company_incoming",
      counterpartyId: payment.id,
      amount: -totalAmount,
      sourceType: "company_payment",
      sourceId: payment.id,
      description: "Règlement externe de l'échéance",
      now,
      eventId,
      paymentId: payment.id,
    }),
    ledgerInsert(database, {
      idemKey: `company-payment:${payment.id}:incoming`,
      accountType: "company_incoming",
      accountId: payment.id,
      counterpartyType: "company_external",
      counterpartyId: companyAccountId,
      amount: totalAmount,
      sourceType: "company_payment",
      sourceId: payment.id,
      description: "Fonds de remboursement reçus",
      now,
      eventId,
      paymentId: payment.id,
    }),
  ];

  const fee = Number(payment.followUpFeeDue);
  if (fee > 0) {
    statements.push(
      ledgerInsert(database, {
        idemKey: `company-payment:${payment.id}:fee-debit`,
        accountType: "company_incoming",
        accountId: payment.id,
        counterpartyType: "platform_revenue",
        counterpartyId: "elzora",
        amount: -fee,
        sourceType: "commission",
        sourceId: payment.id,
        description: "Commission de suivi prélevée",
        now,
        eventId,
        paymentId: payment.id,
      }),
      ledgerInsert(database, {
        idemKey: `company-payment:${payment.id}:fee-credit`,
        accountType: "platform_revenue",
        accountId: "elzora",
        counterpartyType: "company_incoming",
        counterpartyId: payment.id,
        amount: fee,
        sourceType: "commission",
        sourceId: payment.id,
        description: "Commission de suivi encaissée",
        now,
        eventId,
        paymentId: payment.id,
      })
    );
  }

  statements.push(
    database
      .prepare(
        `WITH allocated AS (
           SELECT json_extract(value, '$.investmentId') AS investmentId,
                  CAST(json_extract(value, '$.capital') AS INTEGER) AS capitalPart,
                  CAST(json_extract(value, '$.interest') AS INTEGER) AS interestPart,
                  CAST(json_extract(value, '$.amount') AS INTEGER) AS amount
           FROM json_each(?)
         )
         INSERT INTO Distribution
         (id, companyPaymentId, investmentId, amount, capitalPortion,
          interestPortion, feePortion, status, createdAt, availableAt)
         SELECT 'dist_' || ? || '_' || investmentId, ?, investmentId,
                amount, capitalPart, interestPart,
                0, 'available', ?, ?
         FROM allocated
         WHERE EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         ) AND NOT EXISTS (
           SELECT 1 FROM Distribution d
           WHERE d.companyPaymentId = ? AND d.investmentId = allocated.investmentId
         )`
      )
      .bind(
        distributionPayload,
        payment.id,
        payment.id,
        now,
        now,
        payment.id,
        eventId,
        payment.id
      ),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT lower(hex(randomblob(16))),
                'distribution:' || d.companyPaymentId || ':' || d.investmentId || ':debit',
                'company_incoming', ?, 'investor_wallet', i.investorId,
                -d.amount, 'XOF', 'distribution', d.id,
                'Répartition du remboursement', ?
         FROM Distribution d
         JOIN Investment i ON i.id = d.investmentId
         WHERE d.companyPaymentId = ? AND EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(payment.id, now, payment.id, payment.id, eventId),
    database
      .prepare(
        `INSERT INTO LedgerEntry
         (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
          amount, currency, sourceType, sourceId, description, createdAt)
         SELECT lower(hex(randomblob(16))),
                'distribution:' || d.companyPaymentId || ':' || d.investmentId || ':credit',
                'investor_wallet', i.investorId, 'company_incoming', ?,
                d.amount, 'XOF', 'distribution', d.id,
                'Remboursement disponible', ?
         FROM Distribution d
         JOIN Investment i ON i.id = d.investmentId
         WHERE d.companyPaymentId = ? AND EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(payment.id, now, payment.id, payment.id, eventId),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT lower(hex(randomblob(16))), i.investorId, 'distribution',
                'Remboursement reçu',
                CAST(d.amount AS TEXT) || ' FCFA sont disponibles dans votre portefeuille.',
                0, 'investor_dashboard', ?
         FROM Distribution d
         JOIN Investment i ON i.id = d.investmentId
         WHERE d.companyPaymentId = ? AND i.investorType = 'individual'
           AND EXISTS (
             SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
           )`
      )
      .bind(now, payment.id, payment.id, eventId)
  );

  statements.push(
    database
      .prepare(
        `UPDATE Project
         SET status = CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM CompanyPayment
             WHERE projectId = ? AND id != ? AND status != 'paid'
           ) THEN 'completed' ELSE 'repaying' END,
             closedAt = CASE
               WHEN NOT EXISTS (
                 SELECT 1 FROM CompanyPayment
                 WHERE projectId = ? AND id != ? AND status != 'paid'
               ) THEN ? ELSE closedAt END,
             updatedAt = ?
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        payment.projectId,
        payment.id,
        payment.projectId,
        payment.id,
        now,
        now,
        payment.projectId,
        payment.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'paydunya', 'company_payment_settled',
                'company_payment', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        payment.id,
        JSON.stringify({ projectId: payment.projectId, amount: totalAmount }),
        requestIp(req),
        now,
        payment.id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         SELECT ?, ?, 'completed', 'Financement entièrement remboursé', 'system', ?
         WHERE EXISTS (
           SELECT 1 FROM Project WHERE id = ? AND status = 'completed'
         ) AND NOT EXISTS (
           SELECT 1 FROM ProjectEvent WHERE projectId = ? AND eventType = 'completed'
         )`
      )
      .bind(
        crypto.randomUUID(),
        payment.projectId,
        now,
        payment.projectId,
        payment.projectId
      ),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT lower(hex(randomblob(16))), cm.userId, 'payment',
                'Échéance confirmée',
                'Le règlement de l''échéance n°' || ? ||
                ' pour « ' || p.title || ' » est confirmé.',
                0, 'company_dashboard', ?
         FROM CompanyMember cm
         JOIN Project p ON p.companyId = cm.companyId
         WHERE p.id = ? AND EXISTS (
           SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
         ) AND NOT EXISTS (
           SELECT 1 FROM Notification n
           WHERE n.userId = cm.userId AND n.type = 'payment'
             AND n.message = 'Le règlement de l''échéance n°' || ? ||
               ' pour « ' || p.title || ' » est confirmé.'
         )`
      )
      .bind(
        payment.installmentNo,
        now,
        payment.projectId,
        payment.id,
        eventId,
        payment.installmentNo
      )
  );

  await database.batch(statements);
}

function ledgerInsert(
  database: ReturnType<typeof getD1>,
  entry: {
    idemKey: string;
    accountType: string;
    accountId: string;
    counterpartyType: string;
    counterpartyId: string;
    amount: number;
    sourceType: string;
    sourceId: string;
    description: string;
    now: string;
    eventId: string;
    paymentId: string;
  }
) {
  return database
    .prepare(
      `INSERT INTO LedgerEntry
       (id, idemKey, accountType, accountId, counterpartyType, counterpartyId,
        amount, currency, sourceType, sourceId, description, createdAt)
       SELECT ?, ?, ?, ?, ?, ?, ?, 'XOF', ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentEventId = ?
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
      entry.sourceType,
      entry.sourceId,
      entry.description,
      entry.now,
      entry.paymentId,
      entry.eventId
    );
}
