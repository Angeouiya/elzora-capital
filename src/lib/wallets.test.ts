import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWalletAmount,
  parseWalletType,
  validWalletRequestKey,
  walletAccountType,
  walletFromAccountType,
} from "./wallets";

test("maps the two investor wallets to distinct ledger accounts", () => {
  assert.equal(walletAccountType("investment"), "investor_wallet");
  assert.equal(walletAccountType("reserve"), "investor_reserve_wallet");
  assert.equal(walletFromAccountType("investor_wallet"), "investment");
  assert.equal(walletFromAccountType("investor_reserve_wallet"), "reserve");
});

test("rejects unknown wallets and invalid amounts", () => {
  assert.equal(parseWalletType("reserve"), "reserve");
  assert.equal(parseWalletType("savings"), null);
  assert.equal(parseWalletAmount(25_000), 25_000);
  assert.equal(parseWalletAmount(0), null);
  assert.equal(parseWalletAmount(12.5), null);
});

test("accepts bounded idempotency keys", () => {
  assert.equal(validWalletRequestKey("transfer_1234567890"), true);
  assert.equal(validWalletRequestKey("short"), false);
  assert.equal(validWalletRequestKey("invalid key with spaces"), false);
});
