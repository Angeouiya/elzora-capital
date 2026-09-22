import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPayDunyaConfig } from "@/lib/payments/paydunya";

type RuntimeEnv = CloudflareEnv & Record<string, string | undefined>;

export interface PaymentCapabilities {
  providerName: string | null;
  collectionsEnabled: boolean;
  payoutsEnabled: boolean;
  collectionMethods: Array<"card" | "mobile_money">;
  payoutMethods: Array<"bank_account" | "mobile_money">;
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
  const collectionsReady = payDunyaConfigured;
  // Disbursements remain closed until the provider's separate payout contract
  // and callback flow are implemented and approved.
  const payoutsReady = false;

  return {
    providerName,
    collectionsEnabled:
      collectionsReady && enabled(env.COLLECTIONS_ENABLED),
    payoutsEnabled:
      payoutsReady && payDunyaConfigured && enabled(env.PAYOUTS_ENABLED),
    collectionMethods:
      collectionsReady ? ["card", "mobile_money"] : [],
    payoutMethods:
      payoutsReady ? ["bank_account", "mobile_money"] : [],
  };
}
