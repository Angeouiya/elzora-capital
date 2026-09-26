import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const GOOGLE_OAUTH_COOKIES = {
  state: "x-nexora-google-state",
  nonce: "x-nexora-google-nonce",
  verifier: "x-nexora-google-verifier",
  locale: "x-nexora-google-locale",
  pending: "x-nexora-google-pending",
} as const;

export const GOOGLE_OAUTH_MAX_AGE_SECONDS = 10 * 60;
export const GOOGLE_PENDING_MAX_AGE_SECONDS = 20 * 60;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  appOrigin: string;
  redirectUri: string;
}

export interface GoogleProfile {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface GoogleTokenResponse {
  id_token?: unknown;
  error?: unknown;
  error_description?: unknown;
}

export function getGoogleOAuthConfig(requestUrl: string): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) return null;

  const requestOrigin = new URL(requestUrl).origin;
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim();
  let appOrigin = requestOrigin;
  if (configuredUrl && configuredUrl !== "https://example.com") {
    try {
      appOrigin = new URL(configuredUrl).origin;
    } catch {
      return null;
    }
  }

  return {
    clientId,
    clientSecret,
    appOrigin,
    redirectUri: new URL("/api/auth/google/callback", appOrigin).toString(),
  };
}

export function randomOAuthToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base64Url(bytes);
}

export async function createPkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function buildGoogleAuthorizationUrl(input: {
  config: GoogleOAuthConfig;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(input: {
  config: GoogleOAuthConfig;
  code: string;
  codeVerifier: string;
  expectedNonce: string;
}): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      redirect_uri: input.config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || typeof payload.id_token !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "GOOGLE_TOKEN_EXCHANGE_FAILED");
  }

  const verified = await jwtVerify(payload.id_token, GOOGLE_JWKS, {
    audience: input.config.clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    maxTokenAge: "10 minutes",
  });
  const claims = verified.payload;
  if (!constantTimeEqual(String(claims.nonce || ""), input.expectedNonce)) {
    throw new Error("GOOGLE_NONCE_MISMATCH");
  }
  if (claims.email_verified !== true || typeof claims.email !== "string" || typeof claims.sub !== "string") {
    throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
  }

  const email = claims.email.trim().toLowerCase();
  const displayName = typeof claims.name === "string" ? claims.name.trim() : "";
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = cleanName(typeof claims.given_name === "string" ? claims.given_name : nameParts[0] || "Utilisateur");
  const lastName = cleanName(
    typeof claims.family_name === "string" ? claims.family_name : nameParts.slice(1).join(" ") || "Google"
  );

  if (!email || !email.includes("@")) throw new Error("GOOGLE_EMAIL_INVALID");
  return { subject: claims.sub, email, firstName, lastName };
}

export function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80) || "Utilisateur";
}
