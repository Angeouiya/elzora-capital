import test from "node:test";
import assert from "node:assert/strict";
import { cleanIdentityNumber, hasValidMagic, hashIdentityNumber, safeFileName } from "./kyc";

test("identity numbers are normalized and hashed per user", async () => {
  assert.equal(cleanIdentityNumber(" ab 12 34 "), "AB1234");
  assert.equal(await hashIdentityNumber("u1", "AB 1234"), await hashIdentityNumber("u1", "ab1234"));
  assert.notEqual(await hashIdentityNumber("u1", "AB1234"), await hashIdentityNumber("u2", "AB1234"));
});

test("document signatures are checked", () => {
  assert.equal(hasValidMagic(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf"), true);
  assert.equal(hasValidMagic(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png"), true);
  assert.equal(hasValidMagic(new Uint8Array([0x00, 0x50, 0x4e, 0x47]), "image/png"), false);
});

test("uploaded filenames are made storage-safe", () => {
  assert.equal(safeFileName("Pièce d'identité.pdf"), "Piece-d-identite.pdf");
});
