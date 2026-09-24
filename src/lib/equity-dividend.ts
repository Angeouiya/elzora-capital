import { allocateProRata } from "@/lib/money-allocation";
import { MAX_EQUITY_MICRO_PERCENT } from "@/lib/equity-allocation";

export interface DividendAllocationInput {
  id: string;
  ownershipMicroPct: number;
}

export interface DividendAllocationAmount {
  id: string;
  grossAmount: number;
  withholdingAmount: number;
  netAmount: number;
}

export function calculatePlatformDividendPool(
  totalDeclaredAmount: number,
  totalOwnershipMicroPct: number
): number {
  assertMoney(totalDeclaredAmount, "Le dividende total déclaré");
  if (
    !Number.isSafeInteger(totalOwnershipMicroPct) ||
    totalOwnershipMicroPct <= 0 ||
    totalOwnershipMicroPct > MAX_EQUITY_MICRO_PERCENT
  ) {
    throw new Error("Pourcentage de détention invalide");
  }

  const numerator =
    BigInt(totalDeclaredAmount) * BigInt(totalOwnershipMicroPct);
  const denominator = BigInt(MAX_EQUITY_MICRO_PERCENT);
  const rounded = (numerator + denominator / 2n) / denominator;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error("Le dividende attribuable aux investisseurs est trop faible");
  }
  return result;
}

export function allocateDividendAmounts(
  platformGrossAmount: number,
  withholdingAmount: number,
  allocations: DividendAllocationInput[]
): DividendAllocationAmount[] {
  assertMoney(platformGrossAmount, "Le montant brut attribuable");
  if (
    !Number.isSafeInteger(withholdingAmount) ||
    withholdingAmount < 0 ||
    withholdingAmount >= platformGrossAmount
  ) {
    throw new Error("La retenue doit être inférieure au dividende brut");
  }
  if (allocations.length === 0) {
    throw new Error("Aucune participation émise à rémunérer");
  }

  const weights = allocations.map(({ ownershipMicroPct }) => {
    if (!Number.isSafeInteger(ownershipMicroPct) || ownershipMicroPct <= 0) {
      throw new Error("Détention invalide");
    }
    return ownershipMicroPct;
  });
  const grossParts = allocateProRata(platformGrossAmount, weights);
  const withholdingParts =
    withholdingAmount === 0
      ? weights.map(() => 0)
      : allocateProRata(withholdingAmount, weights);

  return allocations.map((allocation, index) => {
    const grossAmount = grossParts[index];
    const tax = withholdingParts[index];
    if (grossAmount <= 0 || tax > grossAmount) {
      throw new Error("Le montant déclaré est trop faible pour chaque participation");
    }
    return {
      id: allocation.id,
      grossAmount,
      withholdingAmount: tax,
      netAmount: grossAmount - tax,
    };
  });
}

function assertMoney(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} doit être un entier positif en FCFA`);
  }
}
