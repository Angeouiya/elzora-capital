import { allocateProRata } from "@/lib/money-allocation";

export const EQUITY_MICRO_PERCENT_SCALE = 1_000_000;
export const MAX_EQUITY_MICRO_PERCENT = 100 * EQUITY_MICRO_PERCENT_SCALE;

export interface EquityInvestmentWeight {
  investmentId: string;
  amount: number;
}

export interface EquityAllocationResult extends EquityInvestmentWeight {
  ownershipMicroPct: number;
  ownershipPct: number;
}

export function equityPctToMicroPct(value: number): number {
  const scaled = Math.round(value * EQUITY_MICRO_PERCENT_SCALE);
  if (!Number.isFinite(value) || scaled <= 0 || scaled > MAX_EQUITY_MICRO_PERCENT) {
    throw new Error("Pourcentage de capital invalide");
  }
  return scaled;
}

export function microPctToEquityPct(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_EQUITY_MICRO_PERCENT) {
    throw new Error("Unité de participation invalide");
  }
  return value / EQUITY_MICRO_PERCENT_SCALE;
}

export function allocateEquityOwnership(
  equityOfferedPct: number,
  investments: EquityInvestmentWeight[]
): EquityAllocationResult[] {
  if (
    investments.length === 0 ||
    investments.some(
      (investment) =>
        !investment.investmentId ||
        !Number.isSafeInteger(investment.amount) ||
        investment.amount <= 0
    )
  ) {
    throw new Error("Souscriptions en capital invalides");
  }
  const totalMicroPct = equityPctToMicroPct(equityOfferedPct);
  const allocations = allocateProRata(
    totalMicroPct,
    investments.map((investment) => investment.amount)
  );
  return investments.map((investment, index) => ({
    ...investment,
    ownershipMicroPct: allocations[index],
    ownershipPct: microPctToEquityPct(allocations[index]),
  }));
}

export function equityCertificateNumber(offerId: string, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new Error("Séquence de certificat invalide");
  }
  const prefix = offerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() || "EQUITY";
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
