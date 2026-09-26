export const PASSWORD_RESET_TTL_MINUTES = 30;
export const PASSWORD_RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createPasswordResetToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashPasswordResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export async function hashResetRateLimitKey(value: string, namespace: "email" | "ip"): Promise<string> {
  const secret = process.env.AUTH_SECRET || "nexora-local-rate-limit";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${namespace}:${value}`));
  return toBase64Url(new Uint8Array(digest));
}

export function normalizeResetEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

export function isResetEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildPasswordResetUrl(token: string, locale: "fr" | "en"): string {
  const base = new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000");
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("PASSWORD_RESET_URL_INSECURE");
  }
  base.pathname = "/";
  base.search = "";
  base.hash = "";
  base.searchParams.set("auth", "password_reset");
  base.searchParams.set("token", token);
  base.searchParams.set("locale", locale);
  return base.toString();
}

