// ============================================================================
// MOTEUR FINANCIER NEXORA CAPITAL
// ============================================================================
// Tous les calculs en entiers (centimes) — JAMAIS de flottants pour l'argent.
// Conforme au scénario de test section 28 du brief.
//
// SCÉNARIO DE RÉFÉRENCE (dette, 6 mois, 8% total) :
//   Principal         1 000 000 FCFA
//   100 investisseurs × 10 000 FCFA
//   Taux 8% TOTAL sur 6 mois (≠ 8%/an)
//   Commission 6% upfront       → 60 000
//   Net entreprise              → 940 000
//   Intérêts investisseurs      → 80 000
//   Capital + intérêts          → 1 080 000
//   Suivi 2%/an × 6/12          → 10 000
//   Paiement final entreprise   → 1 090 000
//   Par investisseur            → 10 800
//   CA plateforme               → 70 000
// ============================================================================

export type InstrumentType = "debt" | "equity";
export type InterestPeriod = "total" | "annual"; // "total" = sur toute la durée
export type RepaymentType = "bullet" | "amortized"; // bullet = capital à la fin

export interface DebtTerms {
  principal: bigint; // montant recherché (FCFA)
  annualRate: number; // taux en % (ex: 8 pour 8%)
  ratePeriod: InterestPeriod; // "total" si le taux est sur toute la durée
  durationMonths: number; // durée du financement
  repaymentType: RepaymentType; // bullet = capital remboursé à la fin
  upfrontCommissionPct: number; // 6% par défaut
  annualFollowUpPct: number; // 2%/an par défaut
}

export interface EquityTerms {
  amountRaised: bigint; // montant levé
  valuationPre: bigint; // valorisation pré-money
  equityOfferedPct: number; // % du capital offert
}

// ---------------------------------------------------------------------------
// Calculs DETTE — reproduction exacte du scénario section 28
// ---------------------------------------------------------------------------

/**
 * Calcule les intérêts dus aux investisseurs.
 * Si ratePeriod = "total", le taux s'applique une fois sur le principal.
 * Si ratePeriod = "annual", le taux est annualisé (proratisé par durée).
 */
export function computeInvestorInterest(
  principal: bigint,
  annualRate: number,
  ratePeriod: InterestPeriod,
  durationMonths: number
): bigint {
  // On travaille en entiers (le taux est stocké en basis points: 8% = 800 bp)
  const rateBp = Math.round(annualRate * 100);
  if (ratePeriod === "total") {
    // Intérêt = principal × taux (une seule fois)
    return (principal * BigInt(rateBp)) / 10000n;
  }
  // annual : prorata sur la durée
  const months = BigInt(durationMonths);
  return (principal * BigInt(rateBp) * months) / (10000n * 12n);
}

/**
 * Commission initiale (6% du capital financé).
 */
export function computeUpfrontCommission(
  principal: bigint,
  pct: number = 6
): bigint {
  const bp = Math.round(pct * 100);
  return (principal * BigInt(bp)) / 10000n;
}

/**
 * Commission de suivi (2%/an sur le capital restant dû, prorata durée).
 * Pour 6 mois : 2% × 6/12 = 1% du principal.
 */
export function computeFollowUpCommission(
  principal: bigint,
  annualPct: number = 2,
  durationMonths: number
): bigint {
  const bp = Math.round(annualPct * 100);
  const months = BigInt(durationMonths);
  return (principal * BigInt(bp) * months) / (10000n * 12n);
}

export interface DebtSimulation {
  principal: bigint;
  investorInterest: bigint;
  capitalPlusInterest: bigint; // à répartir aux investisseurs
  upfrontCommission: bigint;
  netToCompany: bigint; // principal - upfront
  followUpCommission: bigint;
  totalCompanyPayment: bigint; // capital + intérêts + suivi
  platformRevenue: bigint; // upfront + suivi
  // Par investisseur
  perInvestorRepayment: (investmentAmount: bigint) => bigint;
}

/**
 * Simulation complète d'un financement en dette.
 * Reproduit EXACTEMENT le scénario de la section 28.
 */
export function simulateDebtFinancing(terms: DebtTerms): DebtSimulation {
  const investorInterest = computeInvestorInterest(
    terms.principal,
    terms.annualRate,
    terms.ratePeriod,
    terms.durationMonths
  );
  const capitalPlusInterest = terms.principal + investorInterest;
  const upfrontCommission = computeUpfrontCommission(
    terms.principal,
    terms.upfrontCommissionPct
  );
  const netToCompany = terms.principal - upfrontCommission;
  const followUpCommission = computeFollowUpCommission(
    terms.principal,
    terms.annualFollowUpPct,
    terms.durationMonths
  );
  const totalCompanyPayment = capitalPlusInterest + followUpCommission;
  const platformRevenue = upfrontCommission + followUpCommission;

  return {
    principal: terms.principal,
    investorInterest,
    capitalPlusInterest,
    upfrontCommission,
    netToCompany,
    followUpCommission,
    totalCompanyPayment,
    platformRevenue,
    // Pro-rata : part de chaque investisseur = capital+intérêts × (invest/principal)
    perInvestorRepayment: (investmentAmount: bigint) => {
      if (terms.principal === 0n) return 0n;
      return (capitalPlusInterest * investmentAmount) / terms.principal;
    },
  };
}

// ---------------------------------------------------------------------------
// Calculs ACTIONS — pas d'échéancier fictif
// ---------------------------------------------------------------------------

export function simulateEquityFinancing(terms: EquityTerms) {
  // % du capital obtenu par un investisseur
  const equityPctForAmount = (amount: bigint) => {
    if (terms.amountRaised === 0n) return 0;
    const postMoney = terms.valuationPre + terms.amountRaised;
    return Number((amount * 10000n) / postMoney) / 100;
  };
  return {
    postMoney: terms.valuationPre + terms.amountRaised,
    pricePerShare:
      terms.valuationPre > 0n
        ? terms.valuationPre / BigInt(1000) // convention: 1000 actions au départ
        : 0n,
    equityPctForAmount,
  };
}

// ---------------------------------------------------------------------------
// Vérification du scénario section 28 (test d'intégrité)
// ---------------------------------------------------------------------------

export function verifySection28Scenario() {
  const sim = simulateDebtFinancing({
    principal: 1_000_000n,
    annualRate: 8,
    ratePeriod: "total",
    durationMonths: 6,
    repaymentType: "bullet",
    upfrontCommissionPct: 6,
    annualFollowUpPct: 2,
  });

  const perInvestor = sim.perInvestorRepayment(10_000n);

  const checks = [
    { name: "Commission initiale 6%", expected: 60_000n, actual: sim.upfrontCommission },
    { name: "Net entreprise", expected: 940_000n, actual: sim.netToCompany },
    { name: "Intérêts investisseurs", expected: 80_000n, actual: sim.investorInterest },
    { name: "Capital + intérêts", expected: 1_080_000n, actual: sim.capitalPlusInterest },
    { name: "Suivi 2%/an × 6 mois", expected: 10_000n, actual: sim.followUpCommission },
    { name: "Paiement final entreprise", expected: 1_090_000n, actual: sim.totalCompanyPayment },
    { name: "Par investisseur (10k)", expected: 10_800n, actual: perInvestor },
    { name: "CA plateforme", expected: 70_000n, actual: sim.platformRevenue },
  ];

  const allPassed = checks.every((c) => c.actual === c.expected);
  return { checks, allPassed, simulation: sim };
}

// ---------------------------------------------------------------------------
// Formatage (entiers → FCFA lisible)
// ---------------------------------------------------------------------------

export function fmtFCFA(amount: bigint | number): string {
  const n = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

export function fmtCompact(amount: bigint | number): string {
  const n = typeof amount === "bigint" ? Number(amount) : amount;
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + " Md";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " M";
  if (n >= 1_000) return Math.round(n / 1_000) + " K";
  return String(n) + " FCFA";
}

export function fmtPct(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",") + " %";
}

export function fmtPctBp(bp: number): string {
  return (bp / 100).toFixed(2).replace(".", ",") + " %";
}
