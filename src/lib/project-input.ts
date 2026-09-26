import { COUNTRIES, SECTORS } from "./countries";

export interface ProjectTeamMember {
  fullName: string;
  role: string;
  experience: string;
}

export interface ProjectUseOfFundsItem {
  label: string;
  amount: number;
}

export interface ProjectMilestone {
  title: string;
  targetDate: string;
  outcome: string;
}

export interface ProjectFinancialForecast {
  year: number;
  revenue: number;
  operatingExpenses: number;
  netIncome: number;
  cashFlow: number;
}

export interface ProjectDocumentChecklist {
  registrationDocument: boolean;
  financialStatements: boolean;
  bankStatements: boolean;
  businessPlan: boolean;
  taxDocument: boolean;
}

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
  fundingPurpose: string | null;
  businessModel: string | null;
  marketOverview: string | null;
  competitiveAdvantage: string | null;
  traction: string | null;
  managementTeam: string | null;
  employeeCount: number | null;
  financialYear: number | null;
  annualRevenue: number | null;
  previousRevenue: number | null;
  netIncome: number | null;
  cashBalance: number | null;
  existingDebt: number | null;
  annualOperatingExpenses: number | null;
  financialForecasts: string | null;
  forecastAssumptions: string | null;
  useOfFunds: string | null;
  milestones: string | null;
  guaranteeDescription: string | null;
  shareholderStructure: string | null;
  impactObjectives: string | null;
  documentChecklist: string | null;
  declarationAccepted: boolean;
}

export type ProjectInputResult =
  | { ok: true; value: ProjectInput }
  | { ok: false; error: string };

export const PROJECT_INPUT_COLUMNS = [
  "title", "description", "longDescription", "sector", "country", "city", "imageUrl",
  "instrumentType", "fundingGoal", "companyContribution", "annualRate", "ratePeriod",
  "durationMonths", "repaymentType", "equityOfferedPct", "valuationPre", "minInvestment",
  "maxInvestment", "budgetDetail", "repaymentSource", "risksIdentified", "fundingPurpose",
  "businessModel", "marketOverview", "competitiveAdvantage", "traction", "managementTeam",
  "employeeCount", "financialYear", "annualRevenue", "previousRevenue", "netIncome",
  "cashBalance", "existingDebt", "annualOperatingExpenses", "useOfFunds", "milestones",
  "financialForecasts", "forecastAssumptions",
  "guaranteeDescription", "shareholderStructure", "impactObjectives", "documentChecklist",
  "declarationAccepted",
] as const;

export function projectInputValues(input: ProjectInput): unknown[] {
  return [
    input.title, input.description, input.longDescription, input.sector, input.country, input.city,
    input.imageUrl, input.instrumentType, input.fundingGoal, input.companyContribution,
    input.annualRate, input.ratePeriod, input.durationMonths, input.repaymentType,
    input.equityOfferedPct, input.valuationPre, input.minInvestment, input.maxInvestment,
    input.budgetDetail, input.repaymentSource, input.risksIdentified, input.fundingPurpose,
    input.businessModel, input.marketOverview, input.competitiveAdvantage, input.traction,
    input.managementTeam, input.employeeCount, input.financialYear, input.annualRevenue,
    input.previousRevenue, input.netIncome, input.cashBalance, input.existingDebt,
    input.annualOperatingExpenses, input.useOfFunds, input.milestones, input.financialForecasts,
    input.forecastAssumptions, input.guaranteeDescription,
    input.shareholderStructure, input.impactObjectives, input.documentChecklist,
    input.declarationAccepted ? 1 : 0,
  ];
}

export function parseProjectInput(body: Record<string, unknown>, complete: boolean): ProjectInputResult {
  const instrumentType = body.instrumentType === "equity" ? "equity" : "debt";
  const managementTeam = teamMembers(body.managementTeam);
  const useOfFunds = fundItems(body.useOfFunds);
  const milestones = milestoneItems(body.milestones);
  const financialForecasts = forecastItems(body.financialForecasts);
  const documents = documentChecklist(body.documentChecklist);
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
    fundingPurpose: clean(body.fundingPurpose, 2500) || null,
    businessModel: clean(body.businessModel, 3000) || null,
    marketOverview: clean(body.marketOverview, 3000) || null,
    competitiveAdvantage: clean(body.competitiveAdvantage, 2000) || null,
    traction: clean(body.traction, 2500) || null,
    managementTeam: managementTeam.length ? JSON.stringify(managementTeam) : null,
    employeeCount: optionalInteger(body.employeeCount),
    financialYear: optionalInteger(body.financialYear),
    annualRevenue: money(body.annualRevenue),
    previousRevenue: money(body.previousRevenue),
    netIncome: signedMoney(body.netIncome),
    cashBalance: money(body.cashBalance),
    existingDebt: money(body.existingDebt),
    annualOperatingExpenses: money(body.annualOperatingExpenses),
    financialForecasts: financialForecasts.length ? JSON.stringify(financialForecasts) : null,
    forecastAssumptions: clean(body.forecastAssumptions, 4000) || null,
    useOfFunds: useOfFunds.length ? JSON.stringify(useOfFunds) : null,
    milestones: milestones.length ? JSON.stringify(milestones) : null,
    guaranteeDescription: clean(body.guaranteeDescription, 2500) || null,
    shareholderStructure: clean(body.shareholderStructure, 2500) || null,
    impactObjectives: clean(body.impactObjectives, 2500) || null,
    documentChecklist: JSON.stringify(documents),
    declarationAccepted: body.declarationAccepted === true,
  };

  if (!value.companyId) return { ok: false, error: "Entreprise requise" };
  if (!complete) return { ok: true, value };
  if (value.title.length < 3) return { ok: false, error: "Titre du projet requis" };
  if (value.description.length < 20) return { ok: false, error: "Résumé du projet trop court" };
  if (value.longDescription.length < 80) return { ok: false, error: "Présentation détaillée trop courte" };
  if (!SECTORS.includes(value.sector as (typeof SECTORS)[number])) return { ok: false, error: "Secteur invalide" };
  if (!COUNTRIES.some((country) => country.code === value.country)) return { ok: false, error: "Pays invalide" };
  if (!value.city) return { ok: false, error: "Ville requise" };
  if (!value.imageUrl || value.imageUrl === "/images/project-placeholder.svg") {
    return { ok: false, error: "Ajoutez une photo de couverture au projet" };
  }
  if (!value.businessModel || value.businessModel.length < 40) {
    return { ok: false, error: "Expliquez plus précisément comment l'entreprise gagne de l'argent" };
  }
  if (!value.marketOverview || value.marketOverview.length < 40) {
    return { ok: false, error: "Décrivez le marché visé et les clients" };
  }
  if (!value.competitiveAdvantage || value.competitiveAdvantage.length < 20) {
    return { ok: false, error: "Précisez les points forts de l'entreprise" };
  }
  if (!value.traction || value.traction.length < 20) {
    return { ok: false, error: "Présentez les résultats déjà obtenus" };
  }
  if (
    managementTeam.length === 0 ||
    managementTeam.some((member) => member.fullName.length < 3 || member.role.length < 2 || member.experience.length < 10)
  ) {
    return { ok: false, error: "Complétez le nom, le rôle et l'expérience de chaque responsable" };
  }
  if (value.employeeCount === null || value.employeeCount < 0 || value.employeeCount > 100_000) {
    return { ok: false, error: "Effectif invalide" };
  }
  const currentYear = new Date().getUTCFullYear();
  if (value.financialYear === null || value.financialYear < 2000 || value.financialYear > currentYear) {
    return { ok: false, error: "Exercice financier invalide" };
  }
  if (
    value.annualRevenue === null ||
    value.previousRevenue === null ||
    value.netIncome === null ||
    value.cashBalance === null ||
    value.existingDebt === null ||
    value.annualOperatingExpenses === null
  ) {
    return { ok: false, error: "Tous les chiffres financiers sont requis, même lorsqu'ils sont à zéro" };
  }
  if (
    financialForecasts.length < 3 ||
    financialForecasts.some(
      (forecast) =>
        forecast.year < currentYear ||
        forecast.year > currentYear + 6 ||
        forecast.revenue < 0 ||
        forecast.operatingExpenses < 0 ||
        !Number.isSafeInteger(forecast.netIncome) ||
        !Number.isSafeInteger(forecast.cashFlow)
    )
  ) {
    return { ok: false, error: "Complétez trois années de prévisions financières détaillées" };
  }
  if (new Set(financialForecasts.map((forecast) => forecast.year)).size !== financialForecasts.length) {
    return { ok: false, error: "Chaque année de prévision doit être unique" };
  }
  if (!value.forecastAssumptions || value.forecastAssumptions.length < 40) {
    return { ok: false, error: "Expliquez les hypothèses principales de vos prévisions" };
  }
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
  if (!value.fundingPurpose || value.fundingPurpose.length < 30) {
    return { ok: false, error: "Précisez l'objectif du financement" };
  }
  if (useOfFunds.length < 2 || useOfFunds.some((item) => item.label.length < 2 || item.amount <= 0)) {
    return { ok: false, error: "Détaillez au moins deux postes d'utilisation des fonds" };
  }
  const allocatedAmount = useOfFunds.reduce((sum, item) => sum + item.amount, 0);
  if (allocatedAmount !== value.fundingGoal) {
    return { ok: false, error: "La répartition des fonds doit correspondre exactement au montant recherché" };
  }
  if (
    milestones.length < 2 ||
    milestones.some(
      (item) =>
        item.title.length < 3 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.targetDate) ||
        Number.isNaN(Date.parse(`${item.targetDate}T00:00:00Z`)) ||
        item.outcome.length < 10
    )
  ) {
    return { ok: false, error: "Complétez au moins deux étapes de réalisation" };
  }
  if (!value.risksIdentified || value.risksIdentified.length < 30) {
    return { ok: false, error: "Présentez les principaux risques et les mesures prévues" };
  }
  if (instrumentType === "debt") {
    if (value.annualRate === null || value.annualRate < 0 || value.annualRate > 100) {
      return { ok: false, error: "Taux de rémunération invalide" };
    }
    if (value.durationMonths === null || value.durationMonths < 1 || value.durationMonths > 120) {
      return { ok: false, error: "Durée de financement invalide" };
    }
    if (!value.ratePeriod || !value.repaymentType) return { ok: false, error: "Conditions de remboursement incomplètes" };
    if (!value.repaymentSource || value.repaymentSource.length < 30) {
      return { ok: false, error: "Décrivez clairement la source de remboursement" };
    }
    if (!value.guaranteeDescription || value.guaranteeDescription.length < 10) {
      return { ok: false, error: "Précisez les garanties proposées ou indiquez clairement qu'il n'y en a pas" };
    }
  } else {
    if (value.equityOfferedPct === null || value.equityOfferedPct <= 0 || value.equityOfferedPct > 100) {
      return { ok: false, error: "Part du capital proposée invalide" };
    }
    if (value.valuationPre === null || value.valuationPre <= 0) return { ok: false, error: "Valorisation invalide" };
    if (!value.shareholderStructure || value.shareholderStructure.length < 30) {
      return { ok: false, error: "Décrivez la répartition actuelle du capital" };
    }
  }
  if (!documents.registrationDocument || !documents.financialStatements || !documents.bankStatements || !documents.businessPlan) {
    return { ok: false, error: "Confirmez la disponibilité des quatre pièces essentielles" };
  }
  if (!value.declarationAccepted) {
    return { ok: false, error: "La déclaration d'exactitude doit être acceptée" };
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

function signedMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
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

function objectList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      : [];
  } catch {
    return [];
  }
}

function teamMembers(value: unknown): ProjectTeamMember[] {
  return objectList(value)
    .slice(0, 12)
    .map((item) => ({
      fullName: clean(item.fullName, 120),
      role: clean(item.role, 120),
      experience: clean(item.experience, 600),
    }))
    .filter((item) => !!item.fullName || !!item.role || !!item.experience);
}

function fundItems(value: unknown): ProjectUseOfFundsItem[] {
  return objectList(value)
    .slice(0, 20)
    .map((item) => ({ label: clean(item.label, 160), amount: money(item.amount) ?? 0 }))
    .filter((item) => !!item.label || item.amount > 0);
}

function milestoneItems(value: unknown): ProjectMilestone[] {
  return objectList(value)
    .slice(0, 20)
    .map((item) => ({
      title: clean(item.title, 180),
      targetDate: clean(item.targetDate, 10),
      outcome: clean(item.outcome, 500),
    }))
    .filter((item) => !!item.title || !!item.targetDate || !!item.outcome);
}

function forecastItems(value: unknown): ProjectFinancialForecast[] {
  return objectList(value)
    .slice(0, 5)
    .map((item) => ({
      year: optionalInteger(item.year) ?? 0,
      revenue: money(item.revenue) ?? -1,
      operatingExpenses: money(item.operatingExpenses) ?? -1,
      netIncome: signedMoney(item.netIncome) ?? Number.NaN,
      cashFlow: signedMoney(item.cashFlow) ?? Number.NaN,
    }))
    .filter(
      (item) =>
        item.year > 0 ||
        item.revenue >= 0 ||
        item.operatingExpenses >= 0 ||
        Number.isFinite(item.netIncome) ||
        Number.isFinite(item.cashFlow)
    );
}

function documentChecklist(value: unknown): ProjectDocumentChecklist {
  let item: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) item = value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) item = parsed as Record<string, unknown>;
    } catch {
      item = {};
    }
  }
  return {
    registrationDocument: item.registrationDocument === true,
    financialStatements: item.financialStatements === true,
    bankStatements: item.bankStatements === true,
    businessPlan: item.businessPlan === true,
    taxDocument: item.taxDocument === true,
  };
}
