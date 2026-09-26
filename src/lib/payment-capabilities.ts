import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPayDunyaConfig } from "@/lib/payments/paydunya";
import type { CollectionPaymentMethod } from "@/lib/payment-policy";

type RuntimeEnv = CloudflareEnv & Record<string, string | undefined>;

export interface PaymentCapabilities {
  providerName: string | null;
  collectionsEnabled: boolean;
  payoutsEnabled: boolean;
  collectionMethods: CollectionPaymentMethod[];
  payoutMethods: Array<"bank_account" | "mobile_money">;
}

export interface BankTransferConfig {
  bankName: string;
  beneficiary: string;
  accountReference: string;
}

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Financial actions stay unavailable until an approved provider is explicitly
 * configured. This prevents the interface from presenting simulated payment
 * rails or accepting unverified bank and Mobile Money details.
 */
export function getPaymentCapabilities(): PaymentCapabilities {
  const env = getCloudflareContext().env as RuntimeEnv;
  const providerName = env.PAYMENT_PROVIDER_NAME?.trim() || null;
  const payDunyaConfigured = Boolean(getPayDunyaConfig());
  const bankTransferConfigured = Boolean(getBankTransferConfig());
  const collectionsReady = payDunyaConfigured || bankTransferConfigured;
  const payoutsReady = getPayDunyaConfig()?.mode === "live";

  return {
    providerName,
    collectionsEnabled:
      collectionsReady && enabled(env.COLLECTIONS_ENABLED),
    payoutsEnabled:
      payoutsReady && payDunyaConfigured && enabled(env.PAYOUTS_ENABLED),
    collectionMethods: [
      ...(payDunyaConfigured ? (["card", "mobile_money"] as CollectionPaymentMethod[]) : []),
      ...(bankTransferConfigured ? (["bank_transfer"] as CollectionPaymentMethod[]) : []),
    ],
    payoutMethods:
      payoutsReady ? ["mobile_money"] : [],
  };
}

export function getBankTransferConfig(): BankTransferConfig | null {
  const env = getCloudflareContext().env as RuntimeEnv;
  if (!enabled(env.BANK_TRANSFER_ENABLED)) return null;
  const bankName = env.BANK_TRANSFER_BANK_NAME?.trim();
  const beneficiary = env.BANK_TRANSFER_BENEFICIARY?.trim();
  const accountReference = env.BANK_TRANSFER_ACCOUNT_REFERENCE?.trim();
  if (!bankName || !beneficiary || !accountReference) return null;
  return { bankName, beneficiary, accountReference };
}
