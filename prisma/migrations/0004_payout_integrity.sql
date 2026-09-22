-- A wallet may only have one unresolved withdrawal at a time. Besides making
-- the state understandable to the investor, this guards concurrent requests
-- from reserving the same balance twice.
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_one_open_request_per_investor"
ON "Payout"("investorId")
WHERE "status" IN ('pending', 'ordered', 'uncertain');
