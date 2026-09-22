export function allocateEvenly(total: number, count: number): number[] {
  assertMoney(total);
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error("Le nombre de parts doit être un entier positif");
  }
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function allocateProRata(total: number, weights: number[]): number[] {
  assertMoney(total);
  if (weights.length === 0 || weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) {
    throw new Error("Base de répartition invalide");
  }
  const weightTotal = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (weightTotal <= 0n) {
    throw new Error("Base de répartition invalide");
  }

  const allocations = weights.map((weight) =>
    Number((BigInt(total) * BigInt(weight)) / weightTotal)
  );
  let remainder = total - allocations.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % allocations.length) {
    allocations[index] += 1;
    remainder -= 1;
  }
  return allocations;
}

function assertMoney(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Le montant doit être un entier positif ou nul");
  }
}
