ALTER TABLE "Company" ADD COLUMN "verificationSubmittedAt" DATETIME;
ALTER TABLE "Company" ADD COLUMN "verificationReason" TEXT;

CREATE TABLE "CompanyVerificationProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "registrationConfirmed" INTEGER NOT NULL DEFAULT 0,
  "ownershipConfirmed" INTEGER NOT NULL DEFAULT 0,
  "actingForCompany" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" DATETIME NOT NULL,
  "reviewedAt" DATETIME,
  "reviewedBy" TEXT,
  "decidedBy" TEXT,
  "decisionReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CompanyVerificationProfile_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompanyVerificationProfile_companyId_key"
  ON "CompanyVerificationProfile"("companyId");

CREATE TABLE "CompanyBeneficialOwner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "birthDate" TEXT NOT NULL,
  "nationality" TEXT NOT NULL,
  "residenceCountry" TEXT NOT NULL,
  "ownershipPct" REAL NOT NULL,
  "controlsByOtherMeans" INTEGER NOT NULL DEFAULT 0,
  "politicallyExposed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CompanyBeneficialOwner_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyBeneficialOwner_ownershipPct_check"
    CHECK ("ownershipPct" >= 0 AND "ownershipPct" <= 100),
  CONSTRAINT "CompanyBeneficialOwner_control_check"
    CHECK ("ownershipPct" > 25 OR "controlsByOtherMeans" = 1)
);

CREATE INDEX "CompanyBeneficialOwner_companyId_idx"
  ON "CompanyBeneficialOwner"("companyId");
