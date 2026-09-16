/**
 * Moteur financier Nexora Capital.
 * Les montants monétaires restent des entiers (FCFA) afin d'éviter les flottants binaires.
 */

export type RatePeriod = "TOTAL" | "ANNUAL";
export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "AT_MATURITY";
export type RepaymentMode = "BULLET" | "AMORTIZING";
export type InterestBase = "ORIGINAL_PRINCIPAL" | "OUTSTANDING_PRINCIPAL";

export interface AdvancedRepaymentTerms {
  principal: number;
  rateBps: number;
  ratePeriod: RatePeriod;
  durationMonths: number;
  paymentFrequency?: PaymentFrequency;
  repaymentMode?: RepaymentMode;
  graceMonths?: number;
  interestBase?: InterestBase;
  startDate?: Date;
}

export interface ScheduleRow {
  month: number;
  date: Date;
  capital: number;
  interest: number;
  fee: number;
  total: number;
  remainingCapital: number;
}

const clampInt = (value: number, min = 0) => Math.max(min, Math.round(Number.isFinite(value) ? value : 0));

export function calculateInitialCommission(financedAmount: number): number {
  return Math.round(clampInt(financedAmount) * 0.06);
}

export function calculateAnnualFee(remainingCapital: number, durationMonths: number): number {
  return Math.round(clampInt(remainingCapital) * 0.02 * (clampInt(durationMonths) / 12));
}

export function calculateInvestorInterest(
  investedAmount: number,
  rateBps: number,
  period: RatePeriod,
  durationMonths: number
): number {
  const principal = clampInt(investedAmount);
  const months = clampInt(durationMonths);
  const rate = clampInt(rateBps) / 10000;
  if (!principal || !months || !rate) return 0;
  return period === "TOTAL"
    ? Math.round(principal * rate)
    : Math.round(principal * rate * (months / 12));
}

export function calculateNetReceived(financedAmount: number): {
  commission: number;
  netReceived: number;
} {
  const amount = clampInt(financedAmount);
  const commission = calculateInitialCommission(amount);
  return { commission, netReceived: amount - commission };
}

function frequencyMonths(frequency: PaymentFrequency, durationMonths: number): number {
  if (frequency === "QUARTERLY") return 3;
  if (frequency === "SEMIANNUAL") return 6;
  if (frequency === "AT_MATURITY") return Math.max(1, durationMonths);
  return 1;
}

function paymentMonths(durationMonths: number, frequency: PaymentFrequency): number[] {
  const step = frequencyMonths(frequency, durationMonths);
  const result: number[] = [];
  for (let month = step; month < durationMonths; month += step) result.push(month);
  if (!result.includes(durationMonths)) result.push(durationMonths);
  return result;
}

/**
 * Échéancier contractuel avancé.
 * - BULLET : capital remboursé à la dernière échéance.
 * - AMORTIZING : capital réparti après le différé.
 * - TOTAL : rémunération contractuelle totale répartie selon les échéances.
 * - ANNUAL + OUTSTANDING_PRINCIPAL : intérêts calculés sur le capital restant dû.
 */
export function generateAdvancedRepaymentSchedule(terms: AdvancedRepaymentTerms): ScheduleRow[] {
  const principal = clampInt(terms.principal);
  const durationMonths = Math.max(1, clampInt(terms.durationMonths, 1));
  const rateBps = clampInt(terms.rateBps);
  const paymentFrequency = terms.paymentFrequency ?? "MONTHLY";
  const repaymentMode = terms.repaymentMode ?? "BULLET";
  const graceMonths = Math.min(durationMonths, clampInt(terms.graceMonths ?? 0));
  const interestBase = terms.interestBase ?? "ORIGINAL_PRINCIPAL";
  const months = paymentMonths(durationMonths, paymentFrequency);
  const start = terms.startDate ? new Date(terms.startDate) : new Date();

  const capitalPaymentMonths = months.filter((month) => month > graceMonths);
  const amortizingPeriods = Math.max(1, capitalPaymentMonths.length);
  const baseCapital = repaymentMode === "AMORTIZING" ? Math.floor(principal / amortizingPeriods) : 0;
  let capitalResidual = repaymentMode === "AMORTIZING" ? principal - baseCapital * amortizingPeriods : principal;
  let remaining = principal;
  let previousMonth = 0;

  const fixedTotalInterest = terms.ratePeriod === "TOTAL" || interestBase === "ORIGINAL_PRINCIPAL"
    ? calculateInvestorInterest(principal, rateBps, terms.ratePeriod, durationMonths)
    : null;
  let fixedInterestAllocated = 0;
  const fixedInterestBase = fixedTotalInterest === null ? 0 : Math.floor(fixedTotalInterest / months.length);

  const rows: ScheduleRow[] = [];

  months.forEach((month, index) => {
    const periodMonths = month - previousMonth;
    const isLast = index === months.length - 1;
    let capital = 0;

    if (repaymentMode === "BULLET") {
      capital = isLast ? remaining : 0;
    } else if (month > graceMonths) {
      capital = Math.min(remaining, baseCapital + (capitalResidual > 0 ? 1 : 0));
      if (capitalResidual > 0) capitalResidual -= 1;
      if (isLast) capital = remaining;
    }

    let interest = 0;
    if (fixedTotalInterest !== null) {
      interest = isLast
        ? fixedTotalInterest - fixedInterestAllocated
        : Math.min(fixedTotalInterest - fixedInterestAllocated, fixedInterestBase);
      fixedInterestAllocated += interest;
    } else {
      interest = Math.round(remaining * (rateBps / 10000) * (periodMonths / 12));
    }

    const fee = Math.round(remaining * 0.02 * (periodMonths / 12));
    remaining = Math.max(0, remaining - capital);

    const date = new Date(start);
    date.setMonth(date.getMonth() + month);
    rows.push({
      month,
      date,
      capital,
      interest,
      fee,
      total: capital + interest + fee,
      remainingCapital: remaining,
    });
    previousMonth = month;
  });

  return rows;
}

/** Signature historique conservée pour les écrans existants. */
export function generateRepaymentSchedule(
  principal: number,
  rateBps: number,
  ratePeriod: RatePeriod,
  durationMonths: number
): Array<{ month: number; date: Date; capital: number; interest: number; fee: number; total: number }> {
  return generateAdvancedRepaymentSchedule({
    principal,
    rateBps,
    ratePeriod,
    durationMonths,
    paymentFrequency: "MONTHLY",
    repaymentMode: "BULLET",
    interestBase: "ORIGINAL_PRINCIPAL",
  }).map(({ remainingCapital: _remainingCapital, ...row }) => row);
}

export function calculateDistribution(
  investmentAmount: number,
  totalCollected: number,
  repaymentCapital: number,
  repaymentInterest: number
): { capital: number; interest: number; total: number } {
  if (totalCollected <= 0 || investmentAmount <= 0) return { capital: 0, interest: 0, total: 0 };
  const ratio = investmentAmount / totalCollected;
  const capital = Math.round(repaymentCapital * ratio);
  const interest = Math.round(repaymentInterest * ratio);
  return { capital, interest, total: capital + interest };
}

export function calculateTotalCostForEnterprise(
  financedAmount: number,
  rateBps: number,
  ratePeriod: RatePeriod,
  durationMonths: number
): {
  initialCommission: number;
  annualFee: number;
  investorInterest: number;
  totalCost: number;
  totalPayment: number;
} {
  const initialCommission = calculateInitialCommission(financedAmount);
  const annualFee = calculateAnnualFee(financedAmount, durationMonths);
  const investorInterest = calculateInvestorInterest(financedAmount, rateBps, ratePeriod, durationMonths);
  const totalCost = initialCommission + annualFee + investorInterest;
  return { initialCommission, annualFee, investorInterest, totalCost, totalPayment: financedAmount + investorInterest + annualFee };
}

export function calculateAdvancedEnterpriseCost(terms: AdvancedRepaymentTerms) {
  const schedule = generateAdvancedRepaymentSchedule(terms);
  const investorInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const annualFee = schedule.reduce((sum, row) => sum + row.fee, 0);
  const initialCommission = calculateInitialCommission(terms.principal);
  const netReceived = terms.principal - initialCommission;
  return {
    initialCommission,
    annualFee,
    investorInterest,
    netReceived,
    totalCost: initialCommission + annualFee + investorInterest,
    totalDebtService: terms.principal + annualFee + investorInterest,
    schedule,
  };
}

export function calculateOwnContributionRatio(ownContribution: number, totalProjectAmount: number): number {
  if (totalProjectAmount <= 0) return 0;
  return Math.round((ownContribution / totalProjectAmount) * 10000) / 100;
}

export function calculateDebtServiceCoverage(cashAvailableForDebtService: number, debtService: number): number | null {
  if (debtService <= 0) return null;
  return Math.round((cashAvailableForDebtService / debtService) * 100) / 100;
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

export function formatRate(rateBps: number): string {
  return (rateBps / 100).toFixed(2).replace(/0+$/, "").replace(/[.,]$/, "").replace(".", ",") + " %";
}

export function generatePaymentReference(prefix: string = "NX"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
