CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminSession_adminId_idx" ON "AdminSession"("adminId");
CREATE INDEX IF NOT EXISTS "AdminSession_lastActiveAt_idx" ON "AdminSession"("lastActiveAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Disbursement_one_open_tranche"
ON "Disbursement"("projectId", "trancheNo")
WHERE "status" IN ('pending', 'approved');
