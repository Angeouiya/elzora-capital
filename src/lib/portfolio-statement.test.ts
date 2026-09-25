import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  buildPortfolioStatementPdf,
  hashPortfolioStatementSnapshot,
  portfolioStatementNumber,
  type PortfolioStatementSnapshot,
} from "./portfolio-statement";

const snapshot: PortfolioStatementSnapshot = {
  version: "1.0",
  locale: "fr",
  periodEnd: "2026-09-25",
  investor: {
    id: "investor_1",
    name: "Awa Ndiaye",
    email: "awa@example.com",
    country: "SN",
  },
  summary: {
    totalInvested: 1750000,
    receivedTotal: 210000,
    availableBalance: 125000,
    activePositions: 2,
  },
  positions: [
    {
      investmentId: "investment_debt_1",
      projectTitle: "Plateforme frigorifique pour les filières locales",
      companyName: "Naya Logistique",
      instrumentType: "debt",
      amount: 750000,
      receivedToDate: 210000,
      expectedRepayment: 905000,
      ownershipPct: null,
      contractNumber: "NXC-2026-DEBT1",
      certificateNo: null,
      confirmedAt: "2026-06-01T09:00:00.000Z",
    },
    {
      investmentId: "investment_equity_1",
      projectTitle: "Unité régionale de consommables médicaux",
      companyName: "Kora Santé",
      instrumentType: "equity",
      amount: 1000000,
      receivedToDate: 0,
      expectedRepayment: null,
      ownershipPct: 0.0625,
      contractNumber: "NXC-2026-EQUITY1",
      certificateNo: "NXS-EQ-2026-001",
      confirmedAt: "2026-07-15T11:00:00.000Z",
    },
  ],
};

test("portfolio statement fingerprints and references are deterministic", async () => {
  const first = await hashPortfolioStatementSnapshot(snapshot);
  const second = await hashPortfolioStatementSnapshot(snapshot);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.match(portfolioStatementNumber(snapshot.periodEnd, first), /^NXS-20260925-[A-F0-9]{12}$/);
});

test("portfolio statement renders as a valid branded PDF", async () => {
  const contentHash = await hashPortfolioStatementSnapshot(snapshot);
  const statementNumber = portfolioStatementNumber(snapshot.periodEnd, contentHash);
  const bytes = await buildPortfolioStatementPdf(
    snapshot,
    contentHash,
    statementNumber,
    "2026-09-25T12:00:00.000Z",
    "fr"
  );
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 1);
  assert.equal(pdf.getTitle(), `Releve de portefeuille ${statementNumber}`);
});
