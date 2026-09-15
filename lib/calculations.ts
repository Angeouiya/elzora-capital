/**
 * Règles métier et calculs financiers — Nexora Capital
 * Tous les montants sont en entiers (FCFA) pour éviter les erreurs de flottants.
 */

/** Commission initiale : 6% du capital effectivement financé */
export function calculateInitialCommission(financedAmount: number): number {
  return Math.round(financedAmount * 0.06);
}

/** Suivi annuel : 2% du capital restant, au prorata de la durée en mois */
export function calculateAnnualFee(remainingCapital: number, durationMonths: number): number {
  const annualFee = Math.round(remainingCapital * 0.02);
  return Math.round(annualFee * (durationMonths / 12));
}

/** Intérêts investisseurs pour une offre de type dette */
export function calculateInvestorInterest(
  investedAmount: number,
  rateBps: number,
  period: "TOTAL" | "ANNUAL",
  durationMonths: number
): number {
  const rate = rateBps / 10000; // convertir points de base en décimal
  if (period === "TOTAL") {
    return Math.round(investedAmount * rate);
  }
  // ANNUAL : prorata sur la durée
  return Math.round(investedAmount * rate * (durationMonths / 12));
}

/** Montant net reçu par l'entreprise après commission initiale */
export function calculateNetReceived(financedAmount: number): {
  commission: number;
  netReceived: number;
} {
  const commission = calculateInitialCommission(financedAmount);
  return {
    commission,
    netReceived: financedAmount - commission,
  };
}

/** Échéancier mensuel pour un financement dette */
export function generateRepaymentSchedule(
  principal: number,
  rateBps: number,
  ratePeriod: "TOTAL" | "ANNUAL",
  durationMonths: number
): Array<{
  month: number;
  date: Date;
  capital: number;
  interest: number;
  fee: number;
  total: number;
}> {
  const schedule: Array<{
    month: number;
    date: Date;
    capital: number;
    interest: number;
    fee: number;
    total: number;
  }> = [];

  const totalInterest = calculateInvestorInterest(principal, rateBps, ratePeriod, durationMonths);
  const totalFee = calculateAnnualFee(principal, durationMonths);

  // Remboursement in fine : intérêts + capital à la fin
  const monthlyInterest = Math.round(totalInterest / durationMonths);
  const monthlyFee = Math.round(totalFee / durationMonths);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 1);

  for (let i = 1; i <= durationMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i - 1);

    const isLastMonth = i === durationMonths;
    const capital = isLastMonth ? principal : 0;
    const interest = isLastMonth
      ? totalInterest - monthlyInterest * (durationMonths - 1)
      : monthlyInterest;
    const fee = isLastMonth
      ? totalFee - monthlyFee * (durationMonths - 1)
      : monthlyFee;

    schedule.push({
      month: i,
      date,
      capital,
      interest,
      fee,
      total: capital + interest + fee,
    });
  }

  return schedule;
}

/** Répartition d'un remboursement entre investisseurs au prorata */
export function calculateDistribution(
  investmentAmount: number,
  totalCollected: number,
  repaymentCapital: number,
  repaymentInterest: number
): { capital: number; interest: number; total: number } {
  const ratio = investmentAmount / totalCollected;
  const capital = Math.round(repaymentCapital * ratio);
  const interest = Math.round(repaymentInterest * ratio);
  return { capital, interest, total: capital + interest };
}

/** Coût total du financement pour l'entreprise */
export function calculateTotalCostForEnterprise(
  financedAmount: number,
  rateBps: number,
  ratePeriod: "TOTAL" | "ANNUAL",
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
  return {
    initialCommission,
    annualFee,
    investorInterest,
    totalCost,
    totalPayment: financedAmount + totalCost,
  };
}

/** Formater un montant en FCFA */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

/** Formater un taux depuis les points de base */
export function formatRate(rateBps: number): string {
  return (rateBps / 100).toFixed(1).replace(".", ",") + " %";
}

/** Générer une référence unique de paiement */
export function generatePaymentReference(prefix: string = "NX"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
