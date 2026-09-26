import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleAuthorizationUrl,
  constantTimeEqual,
  createPkceChallenge,
  randomOAuthToken,
} from "./google-oauth";

test("Google authorization URL requests only identity scopes and PKCE", () => {
  const url = new URL(
    buildGoogleAuthorizationUrl({
      config: {
        clientId: "client-id",
        clientSecret: "not-exposed",
        appOrigin: "https://example.test",
        redirectUri: "https://example.test/api/auth/google/callback",
      },
      state: "state-token",
      nonce: "nonce-token",
      codeChallenge: "challenge-token",
    })
  );

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), "challenge-token");
  assert.equal(url.searchParams.get("state"), "state-token");
  assert.equal(url.searchParams.get("nonce"), "nonce-token");
  assert.equal(url.searchParams.has("client_secret"), false);
});

test("PKCE verifier produces a stable base64url challenge", async () => {
  assert.equal(
    await createPkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});

test("OAuth state comparison handles equal and unequal values", () => {
  assert.equal(constantTimeEqual("same-state", "same-state"), true);
  assert.equal(constantTimeEqual("same-state", "other-state"), false);
  assert.equal(constantTimeEqual("short", "shorter"), false);
});

test("OAuth tokens are URL-safe and unpredictable in shape", () => {
  const first = randomOAuthToken();
  const second = randomOAuthToken();
  assert.match(first, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(first, second);
});
