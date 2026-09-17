// Sérialisation BigInt → number pour JSON (les montants FCFA restent exacts
// tant qu'ils ne dépassent pas Number.MAX_SAFE_INTEGER ≈ 9 × 10^15)

export function ser<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}
