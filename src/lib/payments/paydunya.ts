import { getCloudflareContext } from "@opennextjs/cloudflare";

type RuntimeEnv = CloudflareEnv & Record<string, string | undefined>;

export type PayDunyaMode = "sandbox" | "live";

export interface PayDunyaConfig {
  masterKey: string;
  privateKey: string;
  token: string;
  mode: PayDunyaMode;
  publicAppUrl: string;
}

export interface PayDunyaCheckoutInput {
  amount: number;
  description: string;
  itemName: string;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  customData: Record<string, string>;
  callbackUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayDunyaTransaction {
  response_code?: string;
  response_text?: string;
  hash?: string;
  status?: string;
  invoice?: {
    token?: string;
    total_amount?: number | string;
  };
  custom_data?: Record<string, unknown>;
  fail_reason?: string;
}

const PAYDUNYA_HOST = "app.paydunya.com";

export function getPayDunyaConfig(): PayDunyaConfig | null {
  const env = getCloudflareContext().env as RuntimeEnv;
  if (env.PAYMENT_PROVIDER_NAME?.trim().toLowerCase() !== "paydunya") return null;

  const masterKey = env.PAYDUNYA_MASTER_KEY?.trim();
  const privateKey = env.PAYDUNYA_PRIVATE_KEY?.trim();
  const token = env.PAYDUNYA_TOKEN?.trim();
  const publicAppUrl = env.PUBLIC_APP_URL?.trim();
  if (!masterKey || !privateKey || !token || !publicAppUrl) return null;

  let parsedAppUrl: URL;
  try {
    parsedAppUrl = new URL(publicAppUrl);
  } catch {
    return null;
  }
  if (parsedAppUrl.protocol !== "https:") return null;

  return {
    masterKey,
    privateKey,
    token,
    mode: env.PAYDUNYA_MODE?.trim().toLowerCase() === "live" ? "live" : "sandbox",
    publicAppUrl: parsedAppUrl.origin,
  };
}

export function getPayDunyaCheckoutUrl(token: string, mode: PayDunyaMode): string {
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(token)) {
    throw new Error("Référence de paiement invalide");
  }
  const path = mode === "live" ? "checkout" : "sandbox-checkout";
  return `https://${PAYDUNYA_HOST}/${path}/invoice/${encodeURIComponent(token)}`;
}

export async function createPayDunyaCheckout(
  config: PayDunyaConfig,
  input: PayDunyaCheckoutInput
): Promise<{ token: string; checkoutUrl: string }> {
  const base = config.mode === "live" ? "api" : "sandbox-api";
  const response = await fetch(
    `https://${PAYDUNYA_HOST}/${base}/v1/checkout-invoice/create`,
    {
      method: "POST",
      headers: payDunyaHeaders(config),
      body: JSON.stringify({
        invoice: {
          items: {
            item_0: {
              name: input.itemName,
              quantity: 1,
              unit_price: input.amount,
              total_price: input.amount,
              description: input.description,
            },
          },
          customer: {
            name: input.customer.name,
            email: input.customer.email,
            ...(input.customer.phone ? { phone: input.customer.phone } : {}),
          },
          total_amount: input.amount,
          description: input.description,
        },
        store: { name: "Elzora Capital" },
        custom_data: input.customData,
        actions: {
          callback_url: input.callbackUrl,
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
      cache: "no-store",
    }
  );

  const payload = await readJson<Record<string, unknown>>(response);
  const token = typeof payload.token === "string" ? payload.token : "";
  const checkoutUrl =
    typeof payload.response_text === "string" ? payload.response_text : "";

  if (!response.ok || payload.response_code !== "00" || !token) {
    throw new Error("Le prestataire de paiement n'a pas pu créer la transaction");
  }

  const parsedUrl = new URL(checkoutUrl);
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== PAYDUNYA_HOST) {
    throw new Error("L'adresse de paiement retournée est invalide");
  }
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(token)) {
    throw new Error("La référence de paiement retournée est invalide");
  }

  return { token, checkoutUrl: parsedUrl.toString() };
}

export async function confirmPayDunyaCheckout(
  config: PayDunyaConfig,
  token: string
): Promise<PayDunyaTransaction> {
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(token)) {
    throw new Error("Référence de paiement invalide");
  }
  const base = config.mode === "live" ? "api" : "sandbox-api";
  const response = await fetch(
    `https://${PAYDUNYA_HOST}/${base}/v1/checkout-invoice/confirm/${encodeURIComponent(token)}`,
    { headers: payDunyaHeaders(config), cache: "no-store" }
  );
  const payload = await readJson<PayDunyaTransaction>(response);
  if (!response.ok || payload.response_code !== "00") {
    throw new Error("Le statut du paiement n'a pas pu être vérifié");
  }
  if (!(await verifyPayDunyaHash(payload.hash, config.masterKey))) {
    throw new Error("La signature du prestataire est invalide");
  }
  return payload;
}

export async function verifyPayDunyaHash(
  receivedHash: unknown,
  masterKey: string
): Promise<boolean> {
  if (typeof receivedHash !== "string" || !/^[a-fA-F0-9]{128}$/.test(receivedHash)) {
    return false;
  }
  const bytes = new TextEncoder().encode(masterKey);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  let difference = 0;
  const actual = receivedHash.toLowerCase();
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return difference === 0;
}

function payDunyaHeaders(config: PayDunyaConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Réponse invalide du prestataire de paiement");
  }
}
