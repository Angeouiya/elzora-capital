import test from "node:test";
import assert from "node:assert/strict";
import { decodeWalletCursor, encodeWalletCursor } from "./wallet-history";

test("wallet cursors preserve stable financial history pagination", () => {
  const cursor = { createdAt: "2026-09-25T10:30:00.000Z", id: "entry_01-test" };
  assert.deepEqual(decodeWalletCursor(encodeWalletCursor(cursor)), cursor);
});

test("wallet cursors reject malformed or unsafe values", () => {
  assert.equal(decodeWalletCursor("not-a-cursor"), null);
  assert.equal(decodeWalletCursor("2026-09-25T10:30:00.000Z|entry/unsafe"), null);
  assert.equal(decodeWalletCursor(`${"x".repeat(181)}|entry`), null);
});
