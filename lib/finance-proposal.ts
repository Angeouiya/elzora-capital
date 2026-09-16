import type { InterestBase, PaymentFrequency, RatePeriod, RepaymentMode } from "@/lib/calculations";

export type FundingType = "DEBT" | "EQUITY";

export interface FinancingProposal {
  type: FundingType;
  rateBps: number;
  ratePeriod: RatePeriod;
  durationMonths: number;
  minTicket: number;
  maxTicket: number;
  minimumGoal: number;
  paymentFrequency: PaymentFrequency;
  repaymentMode: RepaymentMode;
  graceMonths: number;
  interestBase: InterestBase;
  earlyRepayment: "ALLOWED" | "WITH_CONDITIONS" | "NOT_ALLOWED";
  guaranteeSummary: string;
  guaranteeRank: string;
  equityPercentBps: number;
  preMoneyValuation: number;
  exitHorizonMonths: number;
}

export interface ProjectBudgetPayload {
  lines?: Array<{ label: string; amount: number }>;
  conditions?: Record<string, unknown>;
  finalTerms?: Record<string, unknown>;
  forecasts?: Record<string, unknown>;
  documents?: Record<string, string | null>;
  [key: string]: unknown;
}

const numberValue = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
};

export function parseProjectBudget(budget: string | null | undefined): ProjectBudgetPayload {
  if (!budget) return {};
  try {
    const parsed = JSON.parse(budget);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProjectBudget(current: string | null | undefined, patch: Partial<ProjectBudgetPayload>): string {
  return JSON.stringify({ ...parseProjectBudget(current), ...patch });
}

function proposalFrom(raw: Record<string, unknown> | undefined, requestedAmount: number): FinancingProposal {
  const type: FundingType = raw?.type === "EQUITY" ? "EQUITY" : "DEBT";
  return {
    type,
    rateBps: numberValue(raw?.rate),
    ratePeriod: raw?.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL",
    durationMonths: Math.max(1, numberValue(raw?.duration, 6)),
    minTicket: Math.max(1000, numberValue(raw?.minTicket, 10000)),
    maxTicket: Math.max(1000, numberValue(raw?.maxTicket, Math.min(5000000, Math.max(requestedAmount, 10000)))),
    minimumGoal: Math.min(requestedAmount, numberValue(raw?.minimumGoal, requestedAmount)),
    paymentFrequency: raw?.paymentFrequency === "QUARTERLY" || raw?.paymentFrequency === "SEMIANNUAL" || raw?.paymentFrequency === "AT_MATURITY" ? raw.paymentFrequency : "MONTHLY",
    repaymentMode: raw?.repaymentMode === "AMORTIZING" ? "AMORTIZING" : "BULLET",
    graceMonths: numberValue(raw?.graceMonths),
    interestBase: raw?.interestBase === "OUTSTANDING_PRINCIPAL" ? "OUTSTANDING_PRINCIPAL" : "ORIGINAL_PRINCIPAL",
    earlyRepayment: raw?.earlyRepayment === "NOT_ALLOWED" || raw?.earlyRepayment === "WITH_CONDITIONS" ? raw.earlyRepayment : "ALLOWED",
    guaranteeSummary: typeof raw?.guaranteeSummary === "string" ? raw.guaranteeSummary : "",
    guaranteeRank: typeof raw?.guaranteeRank === "string" ? raw.guaranteeRank : "",
    equityPercentBps: numberValue(raw?.equityPercentBps ?? raw?.rate),
    preMoneyValuation: numberValue(raw?.preMoneyValuation),
    exitHorizonMonths: Math.max(1, numberValue(raw?.exitHorizonMonths ?? raw?.duration, 36)),
  };
}

export function getProjectProposal(project: { budget?: string | null; requestedAmount: number }): FinancingProposal {
  const payload = parseProjectBudget(project.budget);
  return proposalFrom(payload.conditions, project.requestedAmount);
}

export function getFinalTerms(project: { budget?: string | null; requestedAmount: number }): FinancingProposal {
  const payload = parseProjectBudget(project.budget);
  return proposalFrom(payload.finalTerms ?? payload.conditions, project.requestedAmount);
}

export function validateFinancialProposal(proposal: FinancingProposal, requestedAmount: number): string[] {
  const errors: string[] = [];
  if (requestedAmount <= 0) errors.push("Le montant recherché doit être supérieur à zéro.");
  if (proposal.minTicket <= 0) errors.push("Le ticket minimum doit être supérieur à zéro.");
  if (proposal.maxTicket < proposal.minTicket) errors.push("Le ticket maximum doit être supérieur ou égal au ticket minimum.");
  if (proposal.minimumGoal <= 0 || proposal.minimumGoal > requestedAmount) errors.push("Le seuil minimum de collecte doit être compris entre 1 et le montant recherché.");
  if (proposal.type === "DEBT") {
    if (proposal.rateBps <= 0) errors.push("La rémunération proposée aux investisseurs doit être renseignée.");
    if (proposal.durationMonths <= 0) errors.push("La durée du financement doit être renseignée.");
    if (proposal.graceMonths >= proposal.durationMonths) errors.push("Le différé doit être inférieur à la durée totale.");
  } else {
    if (proposal.equityPercentBps <= 0 || proposal.equityPercentBps >= 10000) errors.push("La part de capital proposée doit être comprise entre 0 et 100 %.");
    if (proposal.preMoneyValuation <= 0) errors.push("La valorisation pré-money doit être renseignée pour une opération en capital.");
  }
  return errors;
}

export function proposalToOfferFields(proposal: FinancingProposal, targetAmount: number) {
  return {
    type: proposal.type,
    rate: proposal.type === "EQUITY" ? proposal.equityPercentBps : proposal.rateBps,
    ratePeriod: proposal.ratePeriod,
    duration: proposal.type === "EQUITY" ? proposal.exitHorizonMonths : proposal.durationMonths,
    minTicket: proposal.minTicket,
    maxTicket: proposal.maxTicket,
    targetAmount,
  };
}
