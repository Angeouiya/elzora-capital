import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken,
  isResetEmailValid,
  PASSWORD_RESET_TOKEN_PATTERN,
} from "./password-reset";

test("reset tokens are random, URL-safe and only stored as hashes", async () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();
  assert.match(first, PASSWORD_RESET_TOKEN_PATTERN);
  assert.match(second, PASSWORD_RESET_TOKEN_PATTERN);
  assert.notEqual(first, second);
  assert.notEqual(await hashPasswordResetToken(first), first);
  assert.notEqual(await hashPasswordResetToken(first), await hashPasswordResetToken(second));
});

test("reset URLs use the configured origin and locale", () => {
  const previous = process.env.PUBLIC_APP_URL;
  process.env.PUBLIC_APP_URL = "https://nexora.example/base";
  try {
    const url = new URL(buildPasswordResetUrl("a".repeat(43), "fr"));
    assert.equal(url.origin, "https://nexora.example");
    assert.equal(url.pathname, "/");
    assert.equal(url.searchParams.get("auth"), "password_reset");
    assert.equal(url.searchParams.get("token"), "a".repeat(43));
    assert.equal(url.searchParams.get("locale"), "fr");
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  }
});

test("reset email validation rejects malformed addresses", () => {
  assert.equal(isResetEmailValid("client@example.com"), true);
  assert.equal(isResetEmailValid("client.example.com"), false);
});
