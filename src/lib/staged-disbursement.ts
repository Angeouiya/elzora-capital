import { computeUpfrontCommission } from "@/lib/finance";

export interface StageInput {
  title: string;
  grossAmount: number;
  targetDate: string;
  qualityCriteria: string;
}

export type PlanResult =
  | { ok: true; stages: StageInput[] }
  | { ok: false; error: string };

export function parseStagePlan(value: unknown, fundedAmount: number): PlanResult {
  if (!Number.isSafeInteger(fundedAmount) || fundedAmount <= 0) {
    return { ok: false, error: "Le montant collecté est invalide." };
  }
  if (!Array.isArray(value) || value.length < 2 || value.length > 12) {
    return { ok: false, error: "Prévoyez entre 2 et 12 étapes de versement." };
  }
  let total = 0n;
  let previousDate = "";
  const stages: StageInput[] = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `L’étape ${index + 1} est incomplète.` };
    }
    const row = entry as Record<string, unknown>;
    const title = String(row.title ?? "").trim().replace(/\s+/g, " ");
    const qualityCriteria = String(row.qualityCriteria ?? "").trim().replace(/\s+/g, " ");
    const targetDate = String(row.targetDate ?? "").trim();
    const grossAmount = Number(row.grossAmount);
    if (title.length < 4 || title.length > 120 || qualityCriteria.length < 20 || qualityCriteria.length > 1000) {
      return { ok: false, error: `Précisez le résultat et les critères vérifiables de l’étape ${index + 1}.` };
    }
    if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
      return { ok: false, error: `Le montant de l’étape ${index + 1} doit être positif.` };
    }
    const date = new Date(`${targetDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== targetDate || targetDate < previousDate) {
      return { ok: false, error: `La date de l’étape ${index + 1} est invalide ou précède l’étape précédente.` };
    }
    previousDate = targetDate;
    total += BigInt(grossAmount);
    stages.push({ title, grossAmount, targetDate, qualityCriteria });
  }
  if (total !== BigInt(fundedAmount)) {
    return { ok: false, error: "La somme des étapes doit correspondre exactement au montant collecté." };
  }
  return { ok: true, stages };
}

export function stageCommission(grossAmount: bigint, previousGross: bigint, commissionPct: number): bigint {
  if (grossAmount <= 0n || previousGross < 0n) throw new Error("INVALID_STAGE_AMOUNT");
  return computeUpfrontCommission(previousGross + grossAmount, commissionPct)
    - computeUpfrontCommission(previousGross, commissionPct);
}

export function canPrepareStage(input: {
  status: string;
  trancheNo: number;
  previousStatus: string | null;
}): boolean {
  return input.status === "qa_passed" &&
    (input.trancheNo === 1 || input.previousStatus === "executed");
}
