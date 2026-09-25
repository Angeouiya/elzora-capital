const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PRIVATE_INVESTOR_LIMIT = 100;

export function normalizeInvitationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function invitationDurationDays(value: unknown): number | null {
  const days = typeof value === "number" ? value : Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 90 ? days : null;
}

export function parseInvitationMaximum(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) return undefined;
  return amount;
}

export function createInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function hashInvitationToken(token: string): Promise<string> {
  const normalized = token.trim();
  if (normalized.length < 32 || normalized.length > 256) return "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized)
  );
  return base64Url(new Uint8Array(digest));
}

export function effectivePrivateMaximum(
  offerMaximum: number | null,
  invitationMaximum: number | null
): number | null {
  if (offerMaximum === null) return invitationMaximum;
  if (invitationMaximum === null) return offerMaximum;
  return Math.min(offerMaximum, invitationMaximum);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
