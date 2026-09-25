import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInvestmentContractPdf,
  hashInvestmentContractSnapshot,
  investmentContractNumber,
  type InvestmentContractSnapshot,
} from "./investment-contract";

const snapshot: InvestmentContractSnapshot = {
  contractNumber: "NXC-2026-INVESTMENT123",
  issuedAt: "2026-09-25T12:00:00.000Z",
  locale: "fr",
  investment: {
    id: "investment-123",
    amount: 1_000_000,
    sharePct: 0.2,
    signedAt: "2026-09-25T11:55:00.000Z",
    paymentConfirmedAt: "2026-09-25T12:00:00.000Z",
    signatureHash: "a".repeat(64),
  },
  investor: {
    id: "investor-1",
    name: "Aïssatou Diallo",
    email: "investor@example.com",
    country: "SN",
  },
  offer: {
    id: "offer-1",
    version: 1,
    fundingGoal: 500_000_000,
    annualRate: null,
    ratePeriod: null,
    durationMonths: null,
    repaymentType: null,
    equityOfferedPct: 15,
  },
  project: {
    id: "project-1",
    title: "Nouvelle unité de transformation du cacao",
    instrumentType: "equity",
    country: "CI",
    city: "Abidjan",
  },
  company: {
    id: "company-1",
    legalName: "Nova Cacao CI",
    tradeName: "Nova Cacao",
    legalForm: "SAS",
    country: "CI",
  },
  evidence: {
    agreementVersion: "1.0",
    termsVersion: "1.0",
    riskVersion: "1.0",
    agreementHash: "b".repeat(64),
    signedPayloadHash: "c".repeat(64),
    signatureMethod: "authenticated_clickwrap",
  },
};

test("investment contract identifiers are stable and filesystem-safe", () => {
  assert.equal(
    investmentContractNumber("investment-123", "2026-09-25T12:00:00.000Z"),
    "NXC-2026-INVESTMENT123"
  );
});

test("investment contract content fingerprint is deterministic", async () => {
  const first = await hashInvestmentContractSnapshot(snapshot);
  const second = await hashInvestmentContractSnapshot(snapshot);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("confirmed investment contract renders as a real PDF", async () => {
  const hash = await hashInvestmentContractSnapshot(snapshot);
  const pdf = await buildInvestmentContractPdf(snapshot, hash, "fr");
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  assert.ok(pdf.byteLength > 2_000);
});
