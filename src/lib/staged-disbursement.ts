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
  if (grossAmount <= 0n || previousGross < 0n || !Number.isFinite(commissionPct) || commissionPct < 0 || Math.round(commissionPct * 100) >= 10_000) {
    throw new Error("INVALID_STAGE_AMOUNT");
  }
  return computeUpfrontCommission(previousGross + grossAmount, commissionPct)
    - computeUpfrontCommission(previousGross, commissionPct);
}

export function stageFinancials(grossAmount: number, previousGross: number, commissionPct: number) {
  if (!Number.isSafeInteger(grossAmount) || !Number.isSafeInteger(previousGross)) throw new Error("INVALID_STAGE_AMOUNT");
  const commissionAmount = Number(stageCommission(BigInt(grossAmount), BigInt(previousGross), commissionPct));
  return { commissionAmount, netAmount: grossAmount - commissionAmount };
}

export function canPrepareStage(input: {
  status: string;
  trancheNo: number;
  previousTransferStatus: string | null;
  previousQualityStatus: string | null;
  previousReviewer: string | null;
}): boolean {
  if (input.status !== "planned" || !Number.isSafeInteger(input.trancheNo) || input.trancheNo < 1) return false;
  if (input.trancheNo === 1) return true;
  return input.previousTransferStatus === "executed" &&
    input.previousQualityStatus === "qa_passed" && Boolean(input.previousReviewer);
}

export function canSubmitStageEvidence(status: string, transferStatus: string | null): boolean {
  return transferStatus === "executed" && (status === "planned" || status === "changes_requested");
}

export function canReviewStageEvidence(status: string, transferStatus: string | null): boolean {
  return transferStatus === "executed" && status === "evidence_submitted";
}
