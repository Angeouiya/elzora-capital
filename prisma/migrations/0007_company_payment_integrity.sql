ALTER TABLE "CompanyPayment" ADD COLUMN "paymentEventId" TEXT;

CREATE UNIQUE INDEX "CompanyPayment_paymentEventId_key"
ON "CompanyPayment"("paymentEventId");

CREATE UNIQUE INDEX "Distribution_companyPaymentId_investmentId_key"
ON "Distribution"("companyPaymentId", "investmentId");
