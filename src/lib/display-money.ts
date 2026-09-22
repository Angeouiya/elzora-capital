import type { DisplayCurrency, Locale } from "@/lib/store";

// Le franc CFA BCEAO est arrimé à l'euro à la parité fixe de 655,957 XOF pour 1 EUR.
const XOF_PER_EUR = 655.957;

export function convertFromXOF(amount: bigint | number, currency: DisplayCurrency): number {
  const value = typeof amount === "bigint" ? Number(amount) : amount;
  return currency === "EUR" ? value / XOF_PER_EUR : value;
}

export function formatDisplayMoney(
  amount: bigint | number,
  currency: DisplayCurrency,
  locale: Locale,
  compact = false
): string {
  const value = convertFromXOF(amount, currency);
  const language = locale === "en" ? "en-GB" : "fr-FR";
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: currency === "XOF" ? 0 : compact ? 1 : 2,
  }).format(value);
}
