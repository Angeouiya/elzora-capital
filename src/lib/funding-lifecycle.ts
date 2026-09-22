import { getD1, isoNow } from "@/lib/d1";
import { simulateDebtFinancing } from "@/lib/finance";
import { allocateEvenly } from "@/lib/money-allocation";

interface FundedOfferRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  status: string;
  fundingGoal: number;
  raisedAmount: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  instrumentType: string;
  projectStatus: string;
}

interface Installment {
  number: number;
  dueDate: string;
  capital: number;
  interest: number;
  fee: number;
}

/**
 * Closes a fully funded offer and creates its contractual debt schedule once.
 * Every insert is guarded so a repeated provider callback remains harmless.
 */
export async function finalizeFundedOffer(
  offerId: string,
  database: D1Database = getD1()
): Promise<boolean> {
  const offer = await database
    .prepare(
      `SELECT o.id, o.projectId, o.status, o.fundingGoal, o.raisedAmount,
              o.annualRate, o.ratePeriod, o.durationMonths, o.repaymentType,
              o.upfrontCommissionPct, o.annualFollowUpPct,
              p.instrumentType, p.status AS projectStatus
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       WHERE o.id = ? LIMIT 1`
    )
    .bind(offerId)
    .first<FundedOfferRow>();

  if (!offer || Number(offer.raisedAmount) < Number(offer.fundingGoal)) return false;

  const now = isoNow();
  const statements = [
    database
      .prepare(
        `UPDATE Offer SET status = 'funded'
         WHERE id = ? AND raisedAmount >= fundingGoal AND status != 'funded'`
      )
      .bind(offer.id),
    database
      .prepare(
        `UPDATE Project SET status = 'funded', fundedAt = ?, updatedAt = ?
         WHERE id = ? AND status NOT IN ('funded', 'repaying', 'completed')`
      )
      .bind(now, now, offer.projectId),
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         SELECT ?, ?, 'funded', 'Objectif de collecte atteint', 'system', ?
         WHERE NOT EXISTS (
           SELECT 1 FROM ProjectEvent WHERE projectId = ? AND eventType = 'funded'
         )`
      )
      .bind(crypto.randomUUID(), offer.projectId, now, offer.projectId),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'system', 'funding-lifecycle', 'offer_funded', 'offer', ?, ?, NULL, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM AuditLog
           WHERE action = 'offer_funded' AND entityType = 'offer' AND entityId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        offer.id,
        JSON.stringify({ projectId: offer.projectId, amount: Number(offer.raisedAmount) }),
        now,
        offer.id
      ),
    database
      .prepare(
        `INSERT INTO Notification
         (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT lower(hex(randomblob(16))), cm.userId, 'funding',
                'Financement atteint',
                'Votre financement « ' || p.title ||
                ' » a atteint son objectif. L''échéancier contractuel est disponible.',
                0, 'company_dashboard', ?
         FROM CompanyMember cm
         JOIN Project p ON p.companyId = cm.companyId
         WHERE p.id = ? AND NOT EXISTS (
           SELECT 1 FROM Notification n
           WHERE n.userId = cm.userId AND n.type = 'funding'
             AND n.actionUrl = 'company_dashboard'
             AND n.message = 'Votre financement « ' || p.title ||
               ' » a atteint son objectif. L''échéancier contractuel est disponible.'
         )`
      )
      .bind(now, offer.projectId),
  ];

  if (offer.instrumentType === "debt") {
    const installments = buildDebtSchedule(offer, new Date(now));
    for (const installment of installments) {
      const total = installment.capital + installment.interest + installment.fee;
      statements.push(
        database
          .prepare(
            `INSERT INTO CompanyPayment
             (id, projectId, installmentNo, dueDate, capitalDue, interestDue,
              followUpFeeDue, totalDue, status, paidAt, paidAmount, remaining,
              paymentRef, paymentEventId, createdAt)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', NULL, 0, ?, NULL, NULL, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM CompanyPayment WHERE projectId = ? AND installmentNo = ?
             )`
          )
          .bind(
            crypto.randomUUID(),
            offer.projectId,
            installment.number,
            installment.dueDate,
            installment.capital,
            installment.interest,
            installment.fee,
            total,
            total,
            now,
            offer.projectId,
            installment.number
          )
      );
    }
  }

  await database.batch(statements);
  return true;
}

function buildDebtSchedule(offer: FundedOfferRow, fundedAt: Date): Installment[] {
  const principal = BigInt(Number(offer.fundingGoal));
  const durationMonths = Math.max(1, Number(offer.durationMonths || 1));
  const simulation = simulateDebtFinancing({
    principal,
    annualRate: Number(offer.annualRate || 0),
    ratePeriod: offer.ratePeriod === "annual" ? "annual" : "total",
    durationMonths,
    repaymentType: offer.repaymentType === "amortized" ? "amortized" : "bullet",
    upfrontCommissionPct: Number(offer.upfrontCommissionPct),
    annualFollowUpPct: Number(offer.annualFollowUpPct),
  });

  const count = offer.repaymentType === "amortized" ? durationMonths : 1;
  const capitalParts = allocateEvenly(Number(simulation.principal), count);
  const interestParts = allocateEvenly(Number(simulation.investorInterest), count);
  const feeParts = allocateEvenly(Number(simulation.followUpCommission), count);

  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    dueDate: addUtcMonths(fundedAt, offer.repaymentType === "amortized" ? index + 1 : durationMonths),
    capital: capitalParts[index],
    interest: interestParts[index],
    fee: feeParts[index],
  }));
}

function addUtcMonths(value: Date, months: number): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}
