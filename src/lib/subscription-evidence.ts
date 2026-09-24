import { LEGAL_VERSIONS } from "@/lib/legal";

export interface SubscriptionOfferTerms {
  id: string;
  projectId: string;
  version: number;
  title: string;
  instrumentType: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment: number | null;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  closingDate: string;
}

export interface CreateSubscriptionEvidenceInput {
  investmentId: string;
  investorId: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  signedAt: string;
  locale: "fr" | "en";
  offer: SubscriptionOfferTerms;
}

export function calculateOfferAllocationPct(amount: number, fundingGoal: number): number {
  if (amount <= 0 || fundingGoal <= 0) return 0;
  return (amount * 100) / fundingGoal;
}

export function calculateInvestmentSharePct(
  amount: number,
  fundingGoal: number,
  instrumentType: string,
  equityOfferedPct: number | null
): number {
  const allocationPct = calculateOfferAllocationPct(amount, fundingGoal);
  if (instrumentType !== "equity") return allocationPct;
  if (equityOfferedPct === null || equityOfferedPct <= 0) return 0;
  return (allocationPct * equityOfferedPct) / 100;
}

export async function createSubscriptionEvidence(input: CreateSubscriptionEvidenceInput) {
  const agreementSnapshot = JSON.stringify({
    agreementVersion: LEGAL_VERSIONS.subscription,
    termsVersion: LEGAL_VERSIONS.terms,
    riskVersion: LEGAL_VERSIONS.risk,
    offer: {
      id: input.offer.id,
      projectId: input.offer.projectId,
      version: input.offer.version,
      title: input.offer.title,
      instrumentType: input.offer.instrumentType,
      currency: "XOF",
      fundingGoal: input.offer.fundingGoal,
      minInvestment: input.offer.minInvestment,
      maxInvestment: input.offer.maxInvestment,
      annualRate: input.offer.annualRate,
      ratePeriod: input.offer.ratePeriod,
      durationMonths: input.offer.durationMonths,
      repaymentType: input.offer.repaymentType,
      equityOfferedPct: input.offer.equityOfferedPct,
      valuationPre: input.offer.valuationPre,
      upfrontCommissionPct: input.offer.upfrontCommissionPct,
      annualFollowUpPct: input.offer.annualFollowUpPct,
      closingDate: input.offer.closingDate,
    },
    subscription: {
      amount: input.amount,
      sharePct: fixedPercentage(input.sharePct),
    },
  });
  const agreementHash = await sha256Text(agreementSnapshot);
  const signedPayloadHash = await sha256Text(
    JSON.stringify({
      agreementHash,
      investmentId: input.investmentId,
      investorId: input.investorId,
      investorEmail: input.investorEmail.trim().toLowerCase(),
      signedAt: input.signedAt,
      signatureMethod: "authenticated_clickwrap",
      locale: input.locale,
    })
  );

  return {
    agreementSnapshot,
    agreementHash,
    signedPayloadHash,
  };
}

async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fixedPercentage(value: number): string {
  return Number.isFinite(value) ? value.toFixed(8) : "0.00000000";
}
