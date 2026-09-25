import { COUNTRIES } from "@/lib/countries";
import type { SessionAdmin } from "@/lib/auth";

const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));
export const MAX_BENEFICIAL_OWNERS = 20;

export interface BeneficialOwnerInput {
  fullName: string;
  birthDate: string;
  nationality: string;
  residenceCountry: string;
  ownershipPct: number;
  controlsByOtherMeans: boolean;
  politicallyExposed: boolean;
}

export interface CompanyVerificationInput {
  registrationConfirmed: true;
  ownershipConfirmed: true;
  actingForCompany: true;
  owners: BeneficialOwnerInput[];
}

export type CompanyVerificationValidation =
  | { ok: true; value: CompanyVerificationInput }
  | { ok: false; code: "DECLARATIONS_REQUIRED" | "INVALID_OWNERS" };

export function validateCompanyVerificationInput(input: unknown): CompanyVerificationValidation {
  if (!input || typeof input !== "object") return { ok: false, code: "INVALID_OWNERS" };
  const value = input as Record<string, unknown>;
  if (
    value.registrationConfirmed !== true ||
    value.ownershipConfirmed !== true ||
    value.actingForCompany !== true
  ) {
    return { ok: false, code: "DECLARATIONS_REQUIRED" };
  }
  if (!Array.isArray(value.owners) || value.owners.length < 1 || value.owners.length > MAX_BENEFICIAL_OWNERS) {
    return { ok: false, code: "INVALID_OWNERS" };
  }

  const owners: BeneficialOwnerInput[] = [];
  for (const raw of value.owners) {
    if (!raw || typeof raw !== "object") return { ok: false, code: "INVALID_OWNERS" };
    const owner = raw as Record<string, unknown>;
    const fullName = clean(owner.fullName, 160);
    const birthDate = clean(owner.birthDate, 10);
    const nationality = clean(owner.nationality, 2).toUpperCase();
    const residenceCountry = clean(owner.residenceCountry, 2).toUpperCase();
    const ownershipPct = Number(owner.ownershipPct);
    const controlsByOtherMeans = owner.controlsByOtherMeans === true;
    const politicallyExposed = owner.politicallyExposed === true;
    const birthTime = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? new Date(`${birthDate}T00:00:00.000Z`).getTime() : Number.NaN;

    if (
      fullName.length < 3 ||
      !Number.isFinite(birthTime) ||
      birthTime > Date.now() ||
      !COUNTRY_CODES.has(nationality) ||
      !COUNTRY_CODES.has(residenceCountry) ||
      !Number.isFinite(ownershipPct) ||
      ownershipPct < 0 ||
      ownershipPct > 100 ||
      (ownershipPct <= 25 && !controlsByOtherMeans)
    ) {
      return { ok: false, code: "INVALID_OWNERS" };
    }
    owners.push({
      fullName,
      birthDate,
      nationality,
      residenceCountry,
      ownershipPct: Math.round(ownershipPct * 100) / 100,
      controlsByOtherMeans,
      politicallyExposed,
    });
  }

  return {
    ok: true,
    value: {
      registrationConfirmed: true,
      ownershipConfirmed: true,
      actingForCompany: true,
      owners,
    },
  };
}

export function canReadCompanyVerification(admin: SessionAdmin): boolean {
  return (
    ["superadmin", "compliance", "auditor"].includes(admin.role) ||
    admin.permissions.includes("all") ||
    admin.permissions.includes("companies:read") ||
    admin.permissions.includes("companies:decide")
  );
}

export function canDecideCompanyVerification(admin: SessionAdmin): boolean {
  return (
    ["superadmin", "compliance"].includes(admin.role) ||
    admin.permissions.includes("all") ||
    admin.permissions.includes("companies:decide")
  );
}

export function canSubmitCompanyVerification(mandate: string): boolean {
  return ["manage", "sign"].includes(mandate);
}

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}
