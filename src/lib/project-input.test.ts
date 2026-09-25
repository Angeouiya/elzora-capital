import test from "node:test";
import assert from "node:assert/strict";
import { parseProjectInput } from "./project-input";

function completeDebtProject() {
  return {
    companyId: "company-1",
    title: "Extension du réseau de distribution",
    description: "Ouverture de trois nouveaux points de distribution urbains.",
    longDescription:
      "Le projet finance trois points de distribution afin de rapprocher les produits des clients, réduire les délais de livraison et soutenir la croissance commerciale.",
    sector: "Commerce",
    country: "CI",
    city: "Abidjan",
    imageUrl: "/api/projects/documents/cover-1",
    instrumentType: "debt",
    fundingGoal: 10_000_000,
    companyContribution: 1_000_000,
    annualRate: 9,
    ratePeriod: "annual",
    durationMonths: 18,
    repaymentType: "amortized",
    minInvestment: 50_000,
    maxInvestment: 1_000_000,
    businessModel:
      "L'entreprise achète des produits auprès de fabricants locaux et les revend avec une marge moyenne sur chaque commande.",
    marketOverview:
      "Les clients sont des commerces de proximité à Abidjan, sur un marché en croissance porté par la demande de livraison rapide.",
    competitiveAdvantage: "Un réseau direct de fournisseurs et une livraison en moins de vingt-quatre heures.",
    traction: "Plus de cent clients actifs, trois contrats annuels et une croissance continue des commandes.",
    managementTeam: [
      {
        fullName: "Aminata Koné",
        role: "Directrice générale",
        experience: "Dix années de gestion commerciale et logistique.",
      },
    ],
    employeeCount: 14,
    financialYear: 2025,
    annualRevenue: 85_000_000,
    previousRevenue: 62_000_000,
    netIncome: 7_000_000,
    cashBalance: 5_000_000,
    existingDebt: 2_000_000,
    annualOperatingExpenses: 70_000_000,
    fundingPurpose:
      "Financer le stock initial, l'aménagement des points de vente et les équipements de livraison.",
    useOfFunds: [
      { label: "Stock initial", amount: 6_000_000 },
      { label: "Aménagement et équipements", amount: 4_000_000 },
    ],
    milestones: [
      {
        title: "Ouverture du premier point",
        targetDate: "2027-02-28",
        outcome: "Un point de vente opérationnel avec vingt clients actifs.",
      },
      {
        title: "Déploiement complet",
        targetDate: "2027-06-30",
        outcome: "Trois points ouverts et cinquante nouveaux clients récurrents.",
      },
    ],
    repaymentSource:
      "Les remboursements seront couverts par la marge mensuelle sur les ventes des trois nouveaux points.",
    guaranteeDescription:
      "Nantissement du stock financé et engagement personnel du dirigeant.",
    risksIdentified:
      "Une hausse des prix fournisseurs peut réduire la marge. Des accords-cadres et plusieurs fournisseurs limiteront ce risque.",
    documentChecklist: {
      registrationDocument: true,
      financialStatements: true,
      bankStatements: true,
      businessPlan: true,
      taxDocument: false,
    },
    declarationAccepted: true,
  };
}

test("accepts a complete repayable funding application", () => {
  const result = parseProjectInput(completeDebtProject(), true);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(JSON.parse(result.value.useOfFunds ?? "[]").length, 2);
  assert.equal(JSON.parse(result.value.managementTeam ?? "[]")[0].fullName, "Aminata Koné");
});

test("preserves partial structured rows in a draft", () => {
  const result = parseProjectInput(
    {
      companyId: "company-1",
      managementTeam: [{ fullName: "Aminata", role: "", experience: "" }],
      useOfFunds: [{ label: "Stock", amount: "" }],
      milestones: [{ title: "Ouverture", targetDate: "", outcome: "" }],
    },
    false
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(JSON.parse(result.value.managementTeam ?? "[]").length, 1);
  assert.equal(JSON.parse(result.value.useOfFunds ?? "[]").length, 1);
  assert.equal(JSON.parse(result.value.milestones ?? "[]").length, 1);
});

test("rejects an allocation that does not match the amount sought", () => {
  const body = completeDebtProject();
  body.useOfFunds[1].amount = 3_000_000;
  const result = parseProjectInput(body, true);
  assert.deepEqual(result, {
    ok: false,
    error: "La répartition des fonds doit correspondre exactement au montant recherché",
  });
});

test("requires the essential review documents", () => {
  const body = completeDebtProject();
  body.documentChecklist.bankStatements = false;
  const result = parseProjectInput(body, true);
  assert.deepEqual(result, {
    ok: false,
    error: "Confirmez la disponibilité des quatre pièces essentielles",
  });
});

test("requires ownership information for an equity application", () => {
  const body = {
    ...completeDebtProject(),
    instrumentType: "equity",
    annualRate: null,
    durationMonths: null,
    repaymentType: null,
    equityOfferedPct: 12,
    valuationPre: 75_000_000,
    shareholderStructure: "",
  };
  const result = parseProjectInput(body, true);
  assert.deepEqual(result, {
    ok: false,
    error: "Décrivez la répartition actuelle du capital",
  });
});
