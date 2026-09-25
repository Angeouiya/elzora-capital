import assert from "node:assert/strict";
import test from "node:test";
import {
  createInvitationToken,
  effectivePrivateMaximum,
  hashInvitationToken,
  invitationDurationDays,
  normalizeInvitationEmail,
  parseInvitationMaximum,
} from "./private-offer-access";

test("private invitation emails are normalized and validated", () => {
  assert.equal(normalizeInvitationEmail("  AMINA@EXAMPLE.COM "), "amina@example.com");
  assert.equal(normalizeInvitationEmail("amina"), null);
});

test("private invitation validity is constrained", () => {
  assert.equal(invitationDurationDays(30), 30);
  assert.equal(invitationDurationDays(0), null);
  assert.equal(invitationDurationDays(91), null);
  assert.equal(parseInvitationMaximum("5000000"), 5_000_000);
  assert.equal(parseInvitationMaximum(""), null);
  assert.equal(parseInvitationMaximum(-10), undefined);
});

test("invitation tokens are random and stored as non-reversible fingerprints", async () => {
  const first = createInvitationToken();
  const second = createInvitationToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);
  assert.notEqual(await hashInvitationToken(first), first);
  assert.equal(await hashInvitationToken(first), await hashInvitationToken(first));
});

test("an invitation can only narrow an offer maximum", () => {
  assert.equal(effectivePrivateMaximum(10_000_000, 5_000_000), 5_000_000);
  assert.equal(effectivePrivateMaximum(null, 5_000_000), 5_000_000);
  assert.equal(effectivePrivateMaximum(10_000_000, null), 10_000_000);
});
