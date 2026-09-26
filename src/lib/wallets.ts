export const WALLET_TYPES = ["investment", "reserve"] as const;

export type InvestorWalletType = (typeof WALLET_TYPES)[number];

export function parseWalletType(value: unknown): InvestorWalletType | null {
  return value === "investment" || value === "reserve" ? value : null;
}

export function walletAccountType(wallet: InvestorWalletType) {
  return wallet === "investment" ? "investor_wallet" : "investor_reserve_wallet";
}

export function walletFromAccountType(accountType: string): InvestorWalletType | null {
  if (accountType === "investor_wallet") return "investment";
  if (accountType === "investor_reserve_wallet") return "reserve";
  return null;
}

export function parseWalletAmount(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function validWalletRequestKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{12,100}$/.test(value);
}
