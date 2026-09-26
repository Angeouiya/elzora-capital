ALTER TABLE "Project" ADD COLUMN "financialForecasts" TEXT;
ALTER TABLE "Project" ADD COLUMN "forecastAssumptions" TEXT;
ALTER TABLE "Investment" ADD COLUMN "paymentMethod" TEXT;

CREATE TABLE "ProjectDocumentChunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "data" BLOB NOT NULL,
  CONSTRAINT "ProjectDocumentChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ProjectDocument" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectDocumentChunk_documentId_sequence_key"
  ON "ProjectDocumentChunk"("documentId", "sequence");
CREATE INDEX "ProjectDocumentChunk_documentId_idx"
  ON "ProjectDocumentChunk"("documentId");

CREATE TABLE "ProjectOfferConfirmation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "confirmedBy" TEXT NOT NULL,
  "termsSnapshot" TEXT NOT NULL,
  "termsHash" TEXT NOT NULL,
  "confirmedAt" DATETIME NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectOfferConfirmation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectOfferConfirmation_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectOfferConfirmation_confirmedBy_fkey"
    FOREIGN KEY ("confirmedBy") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectOfferConfirmation_projectId_key"
  ON "ProjectOfferConfirmation"("projectId");
CREATE UNIQUE INDEX "ProjectOfferConfirmation_termsHash_key"
  ON "ProjectOfferConfirmation"("termsHash");
CREATE INDEX "ProjectOfferConfirmation_companyId_confirmedAt_idx"
  ON "ProjectOfferConfirmation"("companyId", "confirmedAt");

CREATE TRIGGER "ProjectOfferConfirmation_immutable"
BEFORE UPDATE ON "ProjectOfferConfirmation"
BEGIN
  SELECT RAISE(ABORT, 'project offer confirmation is immutable');
END;

PRAGMA optimize;
