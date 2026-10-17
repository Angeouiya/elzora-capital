CREATE TABLE "DisbursementStage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "trancheNo" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL,
  "targetDate" TEXT NOT NULL,
  "qualityCriteria" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "plannedBy" TEXT NOT NULL,
  "progressNote" TEXT,
  "evidenceDocumentId" TEXT,
  "submittedBy" TEXT,
  "submittedAt" DATETIME,
  "qaBy" TEXT,
  "qaAt" DATETIME,
  "qaNote" TEXT,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DisbursementStage_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DisbursementStage_evidenceDocumentId_fkey"
    FOREIGN KEY ("evidenceDocumentId") REFERENCES "ProjectDocument" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "DisbursementStage_projectId_trancheNo_key"
  ON "DisbursementStage"("projectId", "trancheNo");
CREATE INDEX "DisbursementStage_projectId_status_idx"
  ON "DisbursementStage"("projectId", "status");
CREATE INDEX "DisbursementStage_evidenceDocumentId_idx"
  ON "DisbursementStage"("evidenceDocumentId");

CREATE UNIQUE INDEX "Disbursement_project_tranche_unique"
  ON "Disbursement"("projectId", "trancheNo");
