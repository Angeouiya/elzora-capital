import assert from "node:assert/strict";
import test from "node:test";
import { convertFromXOF, formatDisplayMoney } from "./display-money";

test("convertFromXOF converts the display value to euros and US dollars", () => {
  assert.equal(convertFromXOF(655.957, "EUR"), 1);
  assert.equal(convertFromXOF(655.957, "USD"), 1.149);
  assert.equal(convertFromXOF(655.957, "XOF"), 655.957);
});

test("formatDisplayMoney uses the selected display currency", () => {
  assert.match(formatDisplayMoney(655.957, "EUR", "fr"), /1,00/);
  assert.match(formatDisplayMoney(655.957, "USD", "en"), /1\.15/);
  assert.match(formatDisplayMoney(10_000, "XOF", "fr"), /10\s?000/);
});
