import assert from "node:assert/strict";
import test from "node:test";
import { getCancellationEligibility } from "./investment-cancellation";

const now = new Date("2026-09-24T12:00:00.000Z");

test("an unpaid subscription can be cancelled during its reflection period", () => {
  assert.deepEqual(
    getCancellationEligibility(
      {
        status: "pending_payment",
        reflectionEndsAt: "2026-10-01T12:00:00.000Z",
        paymentRef: null,
      },
      now
    ),
    {
      allowed: true,
      code: "AVAILABLE",
      deadline: "2026-10-01T12:00:00.000Z",
    }
  );
});

test("an active provider checkout cannot be cancelled locally", () => {
  const result = getCancellationEligibility(
    {
      status: "payment_pending",
      reflectionEndsAt: "2026-10-01T12:00:00.000Z",
      paymentRef: "checkout-token",
    },
    now
  );
  assert.equal(result.allowed, false);
  assert.equal(result.code, "PAYMENT_IN_PROGRESS");
});

test("a paid or expired subscription cannot be cancelled", () => {
  assert.equal(
    getCancellationEligibility(
      { status: "confirmed", reflectionEndsAt: "2026-10-01T12:00:00.000Z" },
      now
    ).code,
    "PAYMENT_CONFIRMED"
  );
  assert.equal(
    getCancellationEligibility(
      { status: "pending_payment", reflectionEndsAt: "2026-09-20T12:00:00.000Z" },
      now
    ).code,
    "WINDOW_EXPIRED"
  );
});
