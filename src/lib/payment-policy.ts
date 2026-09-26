export const PAYMENT_POLICY_VERSION = "2.0";

export type CollectionPaymentMethod = "card" | "mobile_money" | "bank_transfer";
export type PaymentDecision = "allow" | "review" | "block";

export interface PaymentMethodPolicy {
  method: CollectionPaymentMethod;
  perTransaction: number;
  dailyTotal: number;
  monthlyTotal: number;
  dailyCount: number;
  monthlyCount: number;
  alwaysReviewed: boolean;
}

/** Limites internes NEXORA en XOF. Le prestataire peut appliquer une limite plus basse. */
export const PAYMENT_METHOD_POLICIES: Record<CollectionPaymentMethod, PaymentMethodPolicy> = {
  mobile_money: { method: "mobile_money", perTransaction: 1_000_000, dailyTotal: 2_000_000, monthlyTotal: 10_000_000, dailyCount: 5, monthlyCount: 20, alwaysReviewed: false },
  card: { method: "card", perTransaction: 10_000_000, dailyTotal: 15_000_000, monthlyTotal: 30_000_000, dailyCount: 5, monthlyCount: 20, alwaysReviewed: false },
  bank_transfer: { method: "bank_transfer", perTransaction: 50_000_000, dailyTotal: 75_000_000, monthlyTotal: 150_000_000, dailyCount: 3, monthlyCount: 10, alwaysReviewed: true },
};

export const DEFAULT_MOBILE_MONEY_LIMIT_XOF = PAYMENT_METHOD_POLICIES.mobile_money.perTransaction;
export const ENHANCED_REVIEW_THRESHOLD_XOF = 5_000_000;

export interface PaymentUsageSnapshot {
  dailyTotal: number;
  monthlyTotal: number;
  dailyCount: number;
  monthlyCount: number;
  recent15mCount: number;
  allMethods24hCount: number;
  distinctMethods24h: number;
}

export interface PaymentRiskContext {
  country: string;
  documentCountry?: string | null;
  politicallyExposed?: boolean;
  actingForSelf?: boolean;
  sourceOfFunds?: string | null;
}

export interface PaymentPolicyAssessment {
  decision: PaymentDecision;
  method: CollectionPaymentMethod;
  policy: PaymentMethodPolicy;
  riskScore: number;
  reasons: string[];
  code: "PAYMENT_ALLOWED" | "PAYMENT_REVIEW_REQUIRED" | "INVALID_PAYMENT_AMOUNT" | "PAYMENT_LIMIT_EXCEEDED" | "PAYMENT_FREQUENCY_EXCEEDED";
}

const UEMOA_COUNTRIES = new Set(["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"]);
const RISKY_FUND_SOURCES = new Set(["inheritance", "other"]);

export function emptyPaymentUsage(): PaymentUsageSnapshot {
  return { dailyTotal: 0, monthlyTotal: 0, dailyCount: 0, monthlyCount: 0, recent15mCount: 0, allMethods24hCount: 0, distinctMethods24h: 0 };
}

export function assessCollectionPayment({ amount, method, usage = emptyPaymentUsage(), risk }: {
  amount: number;
  method: CollectionPaymentMethod;
  usage?: PaymentUsageSnapshot;
  risk?: PaymentRiskContext;
}): PaymentPolicyAssessment {
  const policy = PAYMENT_METHOD_POLICIES[method];
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { decision: "block", code: "INVALID_PAYMENT_AMOUNT", method, policy, riskScore: 100, reasons: ["Le montant saisi n'est pas valide."] };
  }

  const limitReasons: string[] = [];
  if (amount > policy.perTransaction) limitReasons.push("Le plafond par opération est dépassé.");
  if (usage.dailyTotal + amount > policy.dailyTotal) limitReasons.push("Le plafond cumulé sur 24 heures est dépassé.");
  if (usage.monthlyTotal + amount > policy.monthlyTotal) limitReasons.push("Le plafond cumulé sur 30 jours est dépassé.");
  if (usage.dailyCount + 1 > policy.dailyCount) limitReasons.push("Le nombre maximal d'opérations sur 24 heures est atteint.");
  if (usage.monthlyCount + 1 > policy.monthlyCount) limitReasons.push("Le nombre maximal d'opérations sur 30 jours est atteint.");
  if (limitReasons.length > 0) {
    return {
      decision: "block",
      code: limitReasons.some((reason) => reason.includes("nombre")) ? "PAYMENT_FREQUENCY_EXCEEDED" : "PAYMENT_LIMIT_EXCEEDED",
      method,
      policy,
      riskScore: 100,
      reasons: limitReasons,
    };
  }

  const reasons: string[] = [];
  let riskScore = 0;
  if (policy.alwaysReviewed) { riskScore += 35; reasons.push("Le virement bancaire est vérifié par l'équipe avant transmission des instructions."); }
  if (amount >= ENHANCED_REVIEW_THRESHOLD_XOF) { riskScore += 25; reasons.push("Le montant nécessite une vérification renforcée."); }
  if (risk?.politicallyExposed) { riskScore += 40; reasons.push("Le profil requiert une vigilance renforcée."); }
  if (risk?.actingForSelf === false) { riskScore += 40; reasons.push("Le bénéficiaire réel de l'opération doit être confirmé."); }
  if (risk?.country && !UEMOA_COUNTRIES.has(risk.country.toUpperCase())) { riskScore += 25; reasons.push("Cette opération transfrontalière doit être examinée."); }
  if (risk?.documentCountry && risk.country && risk.documentCountry.toUpperCase() !== risk.country.toUpperCase()) { riskScore += 15; reasons.push("Le pays du document diffère du pays du compte."); }
  if (risk?.sourceOfFunds && RISKY_FUND_SOURCES.has(risk.sourceOfFunds)) { riskScore += 15; reasons.push("Un justificatif complémentaire sur l'origine des fonds peut être demandé."); }
  if (usage.recent15mCount >= 3 || usage.allMethods24hCount >= 5) { riskScore += 35; reasons.push("Plusieurs tentatives rapprochées doivent être vérifiées."); }
  if (usage.distinctMethods24h >= 2 && usage.dailyTotal + amount >= Math.floor(policy.dailyTotal * 0.8)) { riskScore += 30; reasons.push("La répartition sur plusieurs moyens de paiement doit être vérifiée."); }

  if (reasons.length > 0 || riskScore >= 25) {
    return { decision: "review", code: "PAYMENT_REVIEW_REQUIRED", method, policy, riskScore: Math.min(riskScore, 100), reasons };
  }
  return { decision: "allow", code: "PAYMENT_ALLOWED", method, policy, riskScore, reasons: [] };
}

export function paymentPolicySummary() {
  return {
    version: PAYMENT_POLICY_VERSION,
    currency: "XOF" as const,
    reviewThreshold: ENHANCED_REVIEW_THRESHOLD_XOF,
    methods: Object.values(PAYMENT_METHOD_POLICIES),
    notice: "Limites internes de sécurité NEXORA. Le prestataire de paiement ou l'émetteur peut appliquer une limite plus basse.",
  };
}
