import { getCloudflareContext } from "@opennextjs/cloudflare";

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
  const providerConfigured = Boolean(providerName && env.PAYMENT_PROVIDER_KEY?.trim());
  // This flag becomes true only in the same release that ships the signed
  // provider requests and verified webhooks. Environment variables alone must
  // never make unfinished payment rails visible to customers.
  const adapterReady = false;

  return {
    providerName,
    collectionsEnabled:
      adapterReady && providerConfigured && enabled(env.COLLECTIONS_ENABLED),
    payoutsEnabled:
      adapterReady && providerConfigured && enabled(env.PAYOUTS_ENABLED),
    collectionMethods:
      adapterReady && providerConfigured ? ["card", "mobile_money"] : [],
    payoutMethods:
      adapterReady && providerConfigured ? ["bank_account", "mobile_money"] : [],
  };
}
