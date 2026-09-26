import assert from "node:assert/strict";
import test from "node:test";
import { renderPasswordResetEmail } from "./email";

test("password reset email is bilingual, accessible and escapes user data", () => {
  const rendered = renderPasswordResetEmail({
    firstName: "<Ézéchiel>",
    locale: "fr",
    resetUrl: "https://nexora.example/?auth=password_reset&token=secret",
  });
  assert.match(rendered.subject, /mot de passe NEXORA/i);
  assert.match(rendered.html, /Modifier mon mot de passe/);
  assert.match(rendered.html, /&lt;Ézéchiel&gt;/);
  assert.doesNotMatch(rendered.html, /<Ézéchiel>/);
  assert.match(rendered.text, /expire dans 30 minutes/);
});

