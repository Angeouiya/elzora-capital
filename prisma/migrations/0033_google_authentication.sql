-- Google authentication without storing Google access or refresh tokens.
-- New users complete the regulatory onboarding before a User row is created.

CREATE TABLE "ExternalIdentity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL,
  "lastLoginAt" DATETIME NOT NULL,
  CONSTRAINT "ExternalIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExternalIdentity_provider_check"
    CHECK ("provider" IN ('google'))
);

CREATE UNIQUE INDEX "ExternalIdentity_provider_subject_key"
  ON "ExternalIdentity"("provider", "subject");
CREATE INDEX "ExternalIdentity_userId_idx"
  ON "ExternalIdentity"("userId");
CREATE INDEX "ExternalIdentity_email_idx"
  ON "ExternalIdentity"("email");

CREATE TABLE "ExternalAuthPending" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "createdAt" DATETIME NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  CONSTRAINT "ExternalAuthPending_provider_check"
    CHECK ("provider" IN ('google')),
  CONSTRAINT "ExternalAuthPending_locale_check"
    CHECK ("locale" IN ('fr', 'en'))
);

CREATE UNIQUE INDEX "ExternalAuthPending_provider_subject_key"
  ON "ExternalAuthPending"("provider", "subject");
CREATE INDEX "ExternalAuthPending_expiresAt_idx"
  ON "ExternalAuthPending"("expiresAt");

PRAGMA optimize;
