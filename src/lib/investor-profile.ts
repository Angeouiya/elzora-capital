export const INVESTOR_PROFILE_VERSION = "2026-09-25";
export const INVESTOR_PROFILE_VALIDITY_DAYS = 365;

export const INVESTMENT_EXPERIENCES = ["first_time", "occasional", "experienced"] as const;
export const INVESTMENT_OBJECTIVES = ["income", "growth", "diversify"] as const;
export const INVESTMENT_HORIZONS = ["under_1y", "one_to_three", "three_to_five", "over_five"] as const;
export const INVESTABLE_CAPITAL_RANGES = ["under_100k", "100k_500k", "500k_2m", "2m_10m", "over_10m"] as const;
export const LOSS_CAPACITIES = ["limited", "partial", "substantial"] as const;
export const RISK_COMFORTS = ["cautious", "balanced", "dynamic"] as const;

export interface InvestorProfileInput {
  experience: (typeof INVESTMENT_EXPERIENCES)[number];
  objective: (typeof INVESTMENT_OBJECTIVES)[number];
  horizon: (typeof INVESTMENT_HORIZONS)[number];
  investableCapitalRange: (typeof INVESTABLE_CAPITAL_RANGES)[number];
  lossCapacity: (typeof LOSS_CAPACITIES)[number];
  riskComfort: (typeof RISK_COMFORTS)[number];
  understandsCapitalLoss: true;
  understandsIlliquidity: true;
}

export type InvestorProfileValidation =
  | { ok: true; value: InvestorProfileInput }
  | { ok: false; code: "INVALID_PROFILE" | "RISK_ACKNOWLEDGEMENT_REQUIRED" };

export function validateInvestorProfileInput(input: unknown): InvestorProfileValidation {
  if (!input || typeof input !== "object") return { ok: false, code: "INVALID_PROFILE" };
  const value = input as Record<string, unknown>;
  if (
    !includes(INVESTMENT_EXPERIENCES, value.experience) ||
    !includes(INVESTMENT_OBJECTIVES, value.objective) ||
    !includes(INVESTMENT_HORIZONS, value.horizon) ||
    !includes(INVESTABLE_CAPITAL_RANGES, value.investableCapitalRange) ||
    !includes(LOSS_CAPACITIES, value.lossCapacity) ||
    !includes(RISK_COMFORTS, value.riskComfort)
  ) {
    return { ok: false, code: "INVALID_PROFILE" };
  }
  if (value.understandsCapitalLoss !== true || value.understandsIlliquidity !== true) {
    return { ok: false, code: "RISK_ACKNOWLEDGEMENT_REQUIRED" };
  }
  return {
    ok: true,
    value: {
      experience: value.experience,
      objective: value.objective,
      horizon: value.horizon,
      investableCapitalRange: value.investableCapitalRange,
      lossCapacity: value.lossCapacity,
      riskComfort: value.riskComfort,
      understandsCapitalLoss: true,
      understandsIlliquidity: true,
    },
  };
}

export function investorProfileExpiresAt(completedAt = new Date()): string {
  return new Date(
    completedAt.getTime() + INVESTOR_PROFILE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

export function isInvestorProfileCurrent(
  profile: { completedAt?: string | null; expiresAt?: string | null } | null | undefined,
  now = new Date()
): boolean {
  if (!profile?.completedAt || !profile.expiresAt) return false;
  const expiresAt = new Date(profile.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt >= now.getTime();
}

export function declaredInvestableCapitalMax(range: string | null | undefined): number | null {
  switch (range) {
    case "under_100k":
      return 99_999;
    case "100k_500k":
      return 500_000;
    case "500k_2m":
      return 2_000_000;
    case "2m_10m":
      return 10_000_000;
    case "over_10m":
      return null;
    default:
      return 0;
  }
}

export function investorAttentionLevel(profile: Pick<InvestorProfileInput, "experience" | "horizon" | "lossCapacity" | "riskComfort">): "standard" | "heightened" {
  return profile.experience === "first_time" ||
    profile.horizon === "under_1y" ||
    profile.lossCapacity === "limited" ||
    profile.riskComfort === "cautious"
    ? "heightened"
    : "standard";
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}
