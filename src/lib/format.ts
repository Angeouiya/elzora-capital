// Formatage des montants en FCFA (franc CFA ouest-africain)

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(2).replace(".00", "") + " Md FCFA";
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(".0", "") + " M FCFA";
  }
  if (amount >= 1_000) {
    return Math.round(amount / 1_000) + " K FCFA";
  }
  return amount + " FCFA";
}

export function formatPct(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",") + " %";
}

export function progressPct(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 1000) / 10);
}

export function daysLeft(createdAt: Date, durationMonths: number): number {
  const end = new Date(createdAt);
  end.setMonth(end.getMonth() + durationMonths);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export const SECTORS = [
  "Agro-industrie",
  "FinTech",
  "Énergie",
  "Santé",
  "Éducation",
  "Immobilier",
  "Logistique",
  "Commerce",
] as const;

export const COUNTRIES = [
  "Sénégal",
  "Côte d'Ivoire",
  "Mali",
  "Burkina Faso",
  "Niger",
  "Togo",
  "Bénin",
  "Guinée-Bissau",
  "Ghana",
  "Nigeria",
] as const;

export const RISK_LABELS: Record<string, { label: string; color: string }> = {
  Faible: { label: "Faible", color: "text-emerald-600" },
  Modéré: { label: "Modéré", color: "text-amber-600" },
  Élevé: { label: "Élevé", color: "text-rose-600" },
};
