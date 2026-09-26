export interface EquityValueScenario {
  changePct: number;
  estimatedValue: number;
  gainOrLoss: number;
}

export interface EquityValueScenarios {
  referenceChangePct: number;
  upside: EquityValueScenario;
  downside: EquityValueScenario;
}

export function buildEquityValueScenarios(
  investmentAmount: number,
  referenceChangePct = 20
): EquityValueScenarios {
  if (!Number.isSafeInteger(investmentAmount) || investmentAmount <= 0) {
    throw new Error("investment amount must be a positive safe integer");
  }
  if (!Number.isFinite(referenceChangePct) || referenceChangePct <= 0 || referenceChangePct > 100) {
    throw new Error("reference change must be between 0 and 100 percent");
  }

  const basisPoints = BigInt(Math.round(referenceChangePct * 100));
  const delta = Number((BigInt(investmentAmount) * basisPoints) / 10_000n);

  return {
    referenceChangePct,
    upside: {
      changePct: referenceChangePct,
      estimatedValue: investmentAmount + delta,
      gainOrLoss: delta,
    },
    downside: {
      changePct: -referenceChangePct,
      estimatedValue: investmentAmount - delta,
      gainOrLoss: -delta,
    },
  };
}

export function totalReturnPct(investmentAmount: number, gain: number): number {
  if (!Number.isSafeInteger(investmentAmount) || investmentAmount <= 0) return 0;
  return (gain / investmentAmount) * 100;
}
