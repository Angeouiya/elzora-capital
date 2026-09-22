-- A legal entity may only be registered once per jurisdiction.
CREATE UNIQUE INDEX IF NOT EXISTS "Company_country_registrationNo_key"
ON "Company"("country", "registrationNo");
