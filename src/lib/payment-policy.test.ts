import test from "node:test";
import assert from "node:assert/strict";
import {
  assessCollectionPayment,
  DEFAULT_MOBILE_MONEY_LIMIT_XOF,
} from "./payment-policy";

test("Mobile Money accepts the operational limit", () => {
  assert.deepEqual(
    assessCollectionPayment({
      amount: DEFAULT_MOBILE_MONEY_LIMIT_XOF,
      method: "mobile_money",
    }),
    {
      ok: true,
      method: "mobile_money",
      limit: DEFAULT_MOBILE_MONEY_LIMIT_XOF,
    }
  );
});

test("Mobile Money rejects amounts above the operational limit", () => {
  assert.deepEqual(
    assessCollectionPayment({
      amount: DEFAULT_MOBILE_MONEY_LIMIT_XOF + 1,
      method: "mobile_money",
    }),
    {
      ok: false,
      code: "MOBILE_MONEY_LIMIT_EXCEEDED",
      method: "mobile_money",
      limit: DEFAULT_MOBILE_MONEY_LIMIT_XOF,
    }
  );
});

test("card stays available above the Mobile Money limit", () => {
  assert.equal(
    assessCollectionPayment({ amount: 20_000_000, method: "card" }).ok,
    true
  );
});
