import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitCompanyVerification,
  validateCompanyVerificationInput,
} from "./company-verification";

const complete = {
  registrationConfirmed: true,
  ownershipConfirmed: true,
  actingForCompany: true,
  owners: [
    {
      fullName: "Aminata Diop",
      birthDate: "1985-04-12",
      nationality: "SN",
      residenceCountry: "SN",
      ownershipPct: 52.5,
      controlsByOtherMeans: false,
      politicallyExposed: false,
    },
  ],
} as const;

test("company verification accepts an identified owner above 25 percent", () => {
  const result = validateCompanyVerificationInput(complete);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.owners[0].ownershipPct, 52.5);
});

test("control by other means allows an owner below the capital threshold", () => {
  assert.equal(
    validateCompanyVerificationInput({
      ...complete,
      owners: [{ ...complete.owners[0], ownershipPct: 10, controlsByOtherMeans: true }],
    }).ok,
    true
  );
});

test("incomplete declarations or unidentified control are rejected", () => {
  assert.deepEqual(
    validateCompanyVerificationInput({ ...complete, ownershipConfirmed: false }),
    { ok: false, code: "DECLARATIONS_REQUIRED" }
  );
  assert.deepEqual(
    validateCompanyVerificationInput({
      ...complete,
      owners: [{ ...complete.owners[0], ownershipPct: 25, controlsByOtherMeans: false }],
    }),
    { ok: false, code: "INVALID_OWNERS" }
  );
});

test("only signing or managing members can submit company verification", () => {
  assert.equal(canSubmitCompanyVerification("manage"), true);
  assert.equal(canSubmitCompanyVerification("sign"), true);
  assert.equal(canSubmitCompanyVerification("view"), false);
});
