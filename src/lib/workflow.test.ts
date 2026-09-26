import test from "node:test";
import assert from "node:assert/strict";
import { canActorTransition } from "./workflow";

test("only the company can confirm harmonised offer terms", () => {
  assert.equal(canActorTransition("offer_prepared", "offer_confirmed", "company"), true);
  assert.equal(canActorTransition("offer_prepared", "offer_confirmed", "superadmin"), false);
  assert.equal(canActorTransition("offer_prepared", "offer_confirmed", "analyst"), false);
});

test("superadmin keeps oversight on administrative transitions", () => {
  assert.equal(canActorTransition("under_review", "approved", "superadmin"), true);
});
