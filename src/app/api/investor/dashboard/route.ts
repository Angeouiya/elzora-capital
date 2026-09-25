import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1 } from "@/lib/d1";
import { simulateDebtFinancing } from "@/lib/finance";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";
import { getCancellationEligibility } from "@/lib/investment-cancellation";
import { isInvestorProfileCurrent } from "@/lib/investor-profile";

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  kycStatus: string;
  profileCompletedAt: string | null;
  profileExpiresAt: string | null;
  profileAttentionLevel: string | null;
}

interface InvestmentDashboardRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  paymentConfirmedAt: string | null;
  paymentRef: string | null;
  reflectionEndsAt: string | null;
  refundableUntil: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  projectId: string;
  projectTitle: string;
  projectSector: string;
  projectCountry: string;
  projectCity: string;
  instrumentType: string;
  companyLegalName: string;
  companyTradeName: string | null;
  companyLegalForm: string;
  fundingGoal: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  receivedToDate: number;
  equityDividendReceived: number;
  offerStatus: string;
  equityAllocationStatus: string | null;
  ownershipMicroPct: number | null;
  certificateNo: string | null;
  equityIssuedAt: string | null;
  equityIssuanceStatus: string | null;
  equityShareClass: string | null;
  contractNumber: string | null;
  contractIssuedAt: string | null;
}

interface NotificationRow extends Record<string, unknown> {
  id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  actionUrl: string | null;
  createdAt: string;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const paymentCapabilities = getPaymentCapabilities();
  const [user, investmentResult, balanceRow, notificationResult] = await Promise.all([
    database
      .prepare(
        `SELECT u.id, u.email, u.firstName, u.lastName, u.country, u.language, u.kycStatus,
                ip.completedAt AS profileCompletedAt, ip.expiresAt AS profileExpiresAt,
                ip.attentionLevel AS profileAttentionLevel
         FROM User u
         LEFT JOIN InvestorProfile ip ON ip.userId = u.id
         WHERE u.id = ? LIMIT 1`
      )
      .bind(session.userId)
      .first<UserRow>(),
    database
      .prepare(
        `SELECT
           i.id, i.offerId, i.investorType, i.investorId, i.investorName,
           i.investorEmail, i.amount, i.sharePct, i.status, i.signedAt,
           i.paymentConfirmedAt, i.paymentRef, i.reflectionEndsAt,
           i.refundableUntil, i.cancelledAt, i.cancellationReason, i.createdAt,
           p.id AS projectId, p.title AS projectTitle, p.sector AS projectSector,
           p.country AS projectCountry, p.city AS projectCity,
           p.instrumentType AS instrumentType,
           c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
           c.legalForm AS companyLegalForm,
           o.fundingGoal, o.annualRate, o.ratePeriod, o.durationMonths,
           o.repaymentType, o.upfrontCommissionPct, o.annualFollowUpPct,
           o.status AS offerStatus,
           ea.status AS equityAllocationStatus,
           ea.ownershipMicroPct, ea.certificateNo, ea.issuedAt AS equityIssuedAt,
           ei.status AS equityIssuanceStatus, ei.shareClass AS equityShareClass,
           ic.contractNumber, ic.issuedAt AS contractIssuedAt,
           COALESCE((
             SELECT SUM(d.amount) FROM Distribution d
             WHERE d.investmentId = i.id AND d.status = 'available'
           ), 0) AS receivedToDate,
           COALESCE((
             SELECT SUM(eda.netAmount) FROM EquityDividendAllocation eda
             WHERE eda.investmentId = i.id AND eda.status = 'available'
           ), 0) AS equityDividendReceived
         FROM Investment i
         JOIN Project p ON p.id = i.projectId
         JOIN Company c ON c.id = p.companyId
         JOIN Offer o ON o.id = i.offerId
         LEFT JOIN EquityAllocation ea ON ea.investmentId = i.id
         LEFT JOIN EquityIssuance ei ON ei.id = ea.issuanceId
         LEFT JOIN InvestmentContract ic ON ic.investmentId = i.id
         WHERE i.investorId = ?
         ORDER BY i.createdAt DESC`
      )
      .bind(session.userId)
      .all<InvestmentDashboardRow>(),
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = 'investor_wallet' AND accountId = ?`
      )
      .bind(session.userId)
      .first<{ balance: number }>(),
    database
      .prepare(
        `SELECT id, type, title, message, read, actionUrl, createdAt
         FROM Notification WHERE userId = ?
         ORDER BY createdAt DESC LIMIT 8`
      )
      .bind(session.userId)
      .all<NotificationRow>(),
  ]);

  if (!user) {
    return NextResponse.json({ user: null, investments: [], portfolio: null, notifications: [] });
  }

  const availableBalance = Number(balanceRow?.balance || 0);
  let receivedTotal = 0;
  let totalInvested = 0;
  let pendingPayments = 0;
  let activeDeals = 0;
  const bySector = new Map<string, number>();

  const investments = investmentResult.results.map((row) => {
    const amount = Number(row.amount);
    const equityDividendReceived = Number(row.equityDividendReceived || 0);
    const receivedToDate = Number(row.receivedToDate || 0) + equityDividendReceived;
    receivedTotal += receivedToDate;
    if (["pending_payment", "payment_pending"].includes(row.status)) pendingPayments += 1;
    if (row.status === "confirmed") {
      totalInvested += amount;
      activeDeals += 1;
      bySector.set(row.projectSector, (bySector.get(row.projectSector) || 0) + amount);
    }

    let expectedRepayment: number | null = null;
    let remainingDue: number | null = null;
    let projectionLabel: string | null = null;
    if (row.instrumentType === "debt") {
      const simulation = simulateDebtFinancing({
        principal: BigInt(Number(row.fundingGoal)),
        annualRate: Number(row.annualRate || 0),
        ratePeriod: row.ratePeriod === "annual" ? "annual" : "total",
        durationMonths: Number(row.durationMonths || 0),
        repaymentType: row.repaymentType === "amortized" ? "amortized" : "bullet",
        upfrontCommissionPct: Number(row.upfrontCommissionPct),
        annualFollowUpPct: Number(row.annualFollowUpPct),
      });
      expectedRepayment = Number(simulation.perInvestorRepayment(BigInt(amount)));
      remainingDue = Math.max(0, expectedRepayment - receivedToDate);
      projectionLabel = "Montant attendu, sous réserve du remboursement de l'entreprise";
    } else {
      projectionLabel = "Valeur de sortie et liquidité non garanties";
    }
    const cancellation = getCancellationEligibility({
      status: row.status,
      paymentRef: row.paymentRef,
      reflectionEndsAt: row.reflectionEndsAt,
    });

    return {
      id: row.id,
      offerId: row.offerId,
      investorType: row.investorType,
      investorId: row.investorId,
      investorName: row.investorName,
      investorEmail: row.investorEmail,
      amount,
      sharePct: Number(row.sharePct),
      status: row.status,
      signedAt: row.signedAt,
      paymentConfirmedAt: row.paymentConfirmedAt,
      reflectionEndsAt: row.reflectionEndsAt,
      refundableUntil: row.refundableUntil,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
      cancellation: {
        available: cancellation.allowed,
        deadline: cancellation.deadline,
        state: cancellation.code,
      },
      createdAt: row.createdAt,
      expectedRepayment,
      receivedToDate,
      equityDividendReceived,
      remainingDue,
      availableBalance,
      projectionLabel,
      contract:
        row.status === "confirmed"
          ? {
              number: row.contractNumber,
              issuedAt: row.contractIssuedAt,
              downloadUrl: `/api/investor/investments/${row.id}/contract`,
            }
          : null,
      equityPosition:
        row.instrumentType === "equity"
          ? {
              status:
                row.equityAllocationStatus ||
                (row.offerStatus === "funded" ? "pending_allocation" : "funding"),
              ownershipPct:
                row.ownershipMicroPct === null
                  ? Number(row.sharePct)
                  : Number(row.ownershipMicroPct) / 1_000_000,
              certificateNo: row.certificateNo,
              issuedAt: row.equityIssuedAt,
              issuanceStatus: row.equityIssuanceStatus,
              shareClass: row.equityShareClass,
            }
          : null,
      project: {
        id: row.projectId,
        title: row.projectTitle,
        sector: row.projectSector,
        country: row.projectCountry,
        city: row.projectCity,
        instrumentType: row.instrumentType,
        company: {
          legalName: row.companyLegalName,
          tradeName: row.companyTradeName,
          legalForm: row.companyLegalForm,
        },
      },
    };
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        language: user.language,
        kycStatus: user.kycStatus,
        investmentProfile: {
          complete: isInvestorProfileCurrent({ completedAt: user.profileCompletedAt, expiresAt: user.profileExpiresAt }),
          needsRefresh: Boolean(user.profileCompletedAt) && !isInvestorProfileCurrent({ completedAt: user.profileCompletedAt, expiresAt: user.profileExpiresAt }),
          attentionLevel: user.profileAttentionLevel,
          completedAt: user.profileCompletedAt,
          expiresAt: user.profileExpiresAt,
        },
      },
      investments,
      portfolio: {
        totalInvested,
        availableBalance,
        receivedTotal,
        pendingPayments,
        activeDeals,
        bySector: Array.from(bySector, ([name, value]) => ({ name, value })),
        payoutsEnabled: paymentCapabilities.payoutsEnabled,
        payoutProviderName: paymentCapabilities.providerName,
        payoutMethods: paymentCapabilities.payoutMethods,
      },
      notifications: notificationResult.results.map((notification) => ({
        ...notification,
        read: Boolean(notification.read),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
