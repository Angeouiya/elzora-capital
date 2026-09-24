import { getD1, isoNow } from "@/lib/d1";
import { simulateDebtFinancing } from "@/lib/finance";
import {
  allocateEquityOwnership,
  equityPctToMicroPct,
  type EquityAllocationResult,
} from "@/lib/equity-allocation";
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
  equityOfferedPct: number | null;
  instrumentType: string;
  projectStatus: string;
  companyId: string;
}

interface ConfirmedEquityInvestmentRow extends Record<string, unknown> {
  id: string;
  investorType: string;
  investorId: string;
  amount: number;
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
              o.upfrontCommissionPct, o.annualFollowUpPct, o.equityOfferedPct,
              p.instrumentType, p.status AS projectStatus, p.companyId
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       WHERE o.id = ? LIMIT 1`
    )
    .bind(offerId)
    .first<FundedOfferRow>();

  if (!offer || Number(offer.raisedAmount) < Number(offer.fundingGoal)) return false;

  const now = isoNow();
  let equityInvestments: ConfirmedEquityInvestmentRow[] = [];
  let equityAllocations: EquityAllocationResult[] = [];
  if (offer.instrumentType === "equity") {
    if (offer.equityOfferedPct === null) return false;
    const result = await database
      .prepare(
        `SELECT id, investorType, investorId, amount
         FROM Investment
         WHERE offerId = ? AND status = 'confirmed'
         ORDER BY createdAt ASC, id ASC`
      )
      .bind(offer.id)
      .all<ConfirmedEquityInvestmentRow>();
    equityInvestments = result.results;
    const confirmedTotal = equityInvestments.reduce(
      (sum, investment) => sum + Number(investment.amount),
      0
    );
    if (confirmedTotal !== Number(offer.raisedAmount) || confirmedTotal <= 0) return false;
    equityAllocations = allocateEquityOwnership(
      Number(offer.equityOfferedPct),
      equityInvestments.map((investment) => ({
        investmentId: investment.id,
        amount: Number(investment.amount),
      }))
    );
  }

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
                CASE WHEN p.instrumentType = 'equity'
                  THEN 'Votre financement « ' || p.title ||
                    ' » a atteint son objectif. La préparation juridique de l''émission peut commencer.'
                  ELSE 'Votre financement « ' || p.title ||
                    ' » a atteint son objectif. L''échéancier contractuel est disponible.'
                END,
                0, 'company_dashboard', ?
         FROM CompanyMember cm
         JOIN Project p ON p.companyId = cm.companyId
         WHERE p.id = ? AND NOT EXISTS (
           SELECT 1 FROM Notification n
           WHERE n.userId = cm.userId AND n.type = 'funding'
             AND n.actionUrl = 'company_dashboard'
             AND n.message LIKE '%' || p.title || '%'
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
  } else {
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO EquityIssuance
           (id, offerId, projectId, companyId, shareClass, totalOwnershipMicroPct,
            status, resolutionRef, resolutionDate, declarationRef, shareRegisterRef,
            preparedBy, approvedBy, preparedAt, approvedAt, issuedAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'ordinary', ?, 'pending_documents',
                   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          offer.id,
          offer.projectId,
          offer.companyId,
          equityPctToMicroPct(Number(offer.equityOfferedPct)),
          now,
          now
        ),
      database
        .prepare(
          `INSERT INTO ProjectEvent
           (id, projectId, eventType, description, actor, createdAt)
           SELECT ?, ?, 'equity_allocated',
                  'Allocations économiques calculées ; émission juridique en attente',
                  'system', ?
           WHERE NOT EXISTS (
             SELECT 1 FROM ProjectEvent
             WHERE projectId = ? AND eventType = 'equity_allocated'
           )`
        )
        .bind(crypto.randomUUID(), offer.projectId, now, offer.projectId),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'system', 'funding-lifecycle', 'equity_allocations_created',
                  'offer', ?, ?, NULL, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM AuditLog
             WHERE action = 'equity_allocations_created'
               AND entityType = 'offer' AND entityId = ?
           )`
        )
        .bind(
          crypto.randomUUID(),
          offer.id,
          JSON.stringify({
            projectId: offer.projectId,
            investmentCount: equityAllocations.length,
            totalOwnershipMicroPct: equityPctToMicroPct(Number(offer.equityOfferedPct)),
            legalStatus: "pending_documents",
          }),
          now,
          offer.id
        )
    );

    for (let index = 0; index < equityAllocations.length; index += 1) {
      const allocation = equityAllocations[index];
      const investment = equityInvestments[index];
      statements.push(
        database
          .prepare(
            `INSERT INTO EquityAllocation
             (id, issuanceId, investmentId, investorType, investorId,
              ownershipMicroPct, status, certificateNo, issuedAt, createdAt, updatedAt)
             SELECT ?, ei.id, ?, ?, ?, ?, 'pending_issuance', NULL, NULL, ?, ?
             FROM EquityIssuance ei
             WHERE ei.offerId = ?
               AND NOT EXISTS (
                 SELECT 1 FROM EquityAllocation WHERE investmentId = ?
               )`
          )
          .bind(
            crypto.randomUUID(),
            allocation.investmentId,
            investment.investorType,
            investment.investorId,
            allocation.ownershipMicroPct,
            now,
            now,
            offer.id,
            allocation.investmentId
          ),
        database
          .prepare(
            `UPDATE Investment SET sharePct = ?, updatedAt = ?
             WHERE id = ? AND status = 'confirmed'`
          )
          .bind(allocation.ownershipPct, now, allocation.investmentId),
        database
          .prepare(
            `INSERT INTO Notification
             (id, userId, type, title, message, read, actionUrl, createdAt)
             SELECT ?, i.investorId, 'equity_allocation',
                    'Allocation de capital enregistrée', ?, 0, 'investor_dashboard', ?
             FROM Investment i
             WHERE i.id = ? AND i.investorType = 'individual'
               AND NOT EXISTS (
                 SELECT 1 FROM Notification n
                 WHERE n.userId = i.investorId AND n.type = 'equity_allocation'
                   AND n.actionUrl = 'investor_dashboard' AND n.message = ?
               )`
          )
          .bind(
            crypto.randomUUID(),
            `Votre allocation économique de ${allocation.ownershipPct.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} % est enregistrée. L'émission juridique des titres reste en préparation.`,
            now,
            allocation.investmentId,
            `Votre allocation économique de ${allocation.ownershipPct.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} % est enregistrée. L'émission juridique des titres reste en préparation.`
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
