import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordChecks, isStrongPassword } from "./password-policy";

test("password policy accepts a varied passphrase", () => {
  assert.equal(isStrongPassword("Nexora-2026-capital"), true);
});

test("password policy rejects short or repetitive passwords", () => {
  assert.equal(isStrongPassword("Short1!"), false);
  assert.equal(isStrongPassword("aaaaaaaaaaaa"), false);
});

test("password checks expose each visible rule", () => {
  assert.deepEqual(getPasswordChecks("Nexora-2026"), {
    length: true,
    uppercase: true,
    lowercase: true,
    number: true,
    symbol: true,
  });
});

