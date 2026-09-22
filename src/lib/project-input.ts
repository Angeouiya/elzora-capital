import { COUNTRIES, SECTORS } from "./countries";

export interface ProjectInput {
  companyId: string;
  projectId: string | null;
  title: string;
  description: string;
  longDescription: string;
  sector: string;
  country: string;
  city: string;
  imageUrl: string;
  instrumentType: "debt" | "equity";
  fundingGoal: number;
  companyContribution: number;
  annualRate: number | null;
  ratePeriod: "total" | "annual" | null;
  durationMonths: number | null;
  repaymentType: "bullet" | "amortized" | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  budgetDetail: string | null;
  repaymentSource: string | null;
  risksIdentified: string | null;
}

export type ProjectInputResult =
  | { ok: true; value: ProjectInput }
  | { ok: false; error: string };

export function parseProjectInput(body: Record<string, unknown>, complete: boolean): ProjectInputResult {
  const instrumentType = body.instrumentType === "equity" ? "equity" : "debt";
  const value: ProjectInput = {
    companyId: clean(body.companyId, 80),
    projectId: clean(body.projectId, 80) || null,
    title: clean(body.title, 160),
    description: clean(body.description, 500),
    longDescription: clean(body.longDescription, 6000),
    sector: clean(body.sector, 80),
    country: clean(body.country, 2).toUpperCase(),
    city: clean(body.city, 100),
    imageUrl: clean(body.imageUrl, 1000) || "/images/project-placeholder.svg",
    instrumentType,
    fundingGoal: money(body.fundingGoal) ?? 0,
    companyContribution: money(body.companyContribution) ?? 0,
    annualRate: optionalNumber(body.annualRate),
    ratePeriod: body.ratePeriod === "annual" ? "annual" : body.ratePeriod === "total" ? "total" : null,
    durationMonths: optionalInteger(body.durationMonths),
    repaymentType:
      body.repaymentType === "amortized" ? "amortized" : body.repaymentType === "bullet" ? "bullet" : null,
    equityOfferedPct: optionalNumber(body.equityOfferedPct),
    valuationPre: money(body.valuationPre),
    minInvestment: money(body.minInvestment) ?? 0,
    maxInvestment: money(body.maxInvestment),
    budgetDetail: clean(body.budgetDetail, 4000) || null,
    repaymentSource: clean(body.repaymentSource, 2000) || null,
    risksIdentified: clean(body.risksIdentified, 4000) || null,
  };

  if (!value.companyId) return { ok: false, error: "Entreprise requise" };
  if (!complete) return { ok: true, value };
  if (value.title.length < 3) return { ok: false, error: "Titre du projet requis" };
  if (value.description.length < 20) return { ok: false, error: "Résumé du projet trop court" };
  if (value.longDescription.length < 80) return { ok: false, error: "Présentation détaillée trop courte" };
  if (!SECTORS.includes(value.sector as (typeof SECTORS)[number])) return { ok: false, error: "Secteur invalide" };
  if (!COUNTRIES.some((country) => country.code === value.country)) return { ok: false, error: "Pays invalide" };
  if (!value.city) return { ok: false, error: "Ville requise" };
  if (value.fundingGoal <= 0) return { ok: false, error: "Montant recherché invalide" };
  if (value.companyContribution < 0 || value.companyContribution > value.fundingGoal) {
    return { ok: false, error: "Apport de l'entreprise invalide" };
  }
  if (value.minInvestment <= 0 || value.minInvestment > value.fundingGoal) {
    return { ok: false, error: "Investissement minimum invalide" };
  }
  if (value.maxInvestment !== null && (value.maxInvestment < value.minInvestment || value.maxInvestment > value.fundingGoal)) {
    return { ok: false, error: "Investissement maximum invalide" };
  }
  if (!value.budgetDetail || !value.repaymentSource || !value.risksIdentified) {
    return { ok: false, error: "Budget, source de remboursement et risques sont requis" };
  }
  if (instrumentType === "debt") {
    if (value.annualRate === null || value.annualRate < 0 || value.annualRate > 100) {
      return { ok: false, error: "Taux de rémunération invalide" };
    }
    if (value.durationMonths === null || value.durationMonths < 1 || value.durationMonths > 120) {
      return { ok: false, error: "Durée de financement invalide" };
    }
    if (!value.ratePeriod || !value.repaymentType) return { ok: false, error: "Conditions de remboursement incomplètes" };
  } else {
    if (value.equityOfferedPct === null || value.equityOfferedPct <= 0 || value.equityOfferedPct > 100) {
      return { ok: false, error: "Part du capital proposée invalide" };
    }
    if (value.valuationPre === null || value.valuationPre <= 0) return { ok: false, error: "Valorisation invalide" };
  }
  return { ok: true, value };
}

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalInteger(value: unknown): number | null {
  const number = optionalNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}
