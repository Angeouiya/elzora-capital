import test from "node:test";
import assert from "node:assert/strict";
import { notificationActionView } from "./notification-action";

test("notification actions only resolve to known user destinations", () => {
  assert.equal(notificationActionView("portfolio"), "investor_dashboard");
  assert.equal(notificationActionView("company_dashboard"), "company_dashboard");
  assert.equal(notificationActionView("explore"), "explore");
  assert.equal(notificationActionView("https://example.com"), null);
  assert.equal(notificationActionView("admin_dashboard"), null);
  assert.equal(notificationActionView(null), null);
});
