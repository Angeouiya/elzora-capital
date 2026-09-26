-- Single-use, hashed password-reset links and privacy-preserving request limits.

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "consumeKey" TEXT,
  "requestedIpHash" TEXT,
  CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_consumeKey_key"
  ON "PasswordResetToken"("consumeKey");
CREATE INDEX "PasswordResetToken_userId_createdAt_idx"
  ON "PasswordResetToken"("userId", "createdAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

CREATE TABLE "PasswordResetAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "emailHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "delivered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL
);

CREATE INDEX "PasswordResetAttempt_emailHash_createdAt_idx"
  ON "PasswordResetAttempt"("emailHash", "createdAt");
CREATE INDEX "PasswordResetAttempt_ipHash_createdAt_idx"
  ON "PasswordResetAttempt"("ipHash", "createdAt");

PRAGMA optimize;
