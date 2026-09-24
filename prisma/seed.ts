import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./db/custom.db",
});
const db = new PrismaClient({ adapter });

// ============================================================================
// SEED NEXORA CAPITAL — cohérent avec le nouveau schéma (LedgerEntry, etc.)
// ============================================================================

async function main() {
  console.log("🌱 Seed NEXORA Capital (v2)…");

  // Clean
  await db.ledgerEntry.deleteMany();
  await db.equityAllocation.deleteMany();
  await db.equityIssuance.deleteMany();
  await db.distribution.deleteMany();
  await db.companyPayment.deleteMany();
  await db.payout.deleteMany();
  await db.subscriptionEvidence.deleteMany();
  await db.investment.deleteMany();
  await db.offer.deleteMany();
  await db.projectEvent.deleteMany();
  await db.projectDocument.deleteMany();
  await db.disbursement.deleteMany();
  await db.project.deleteMany();
  await db.notification.deleteMany();
  await db.userSession.deleteMany();
  await db.companyMember.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();
  await db.adminUser.deleteMany();
  await db.auditLog.deleteMany();

  // --- Utilisateur investisseur de démo ---
  const investor = await db.user.create({
    data: {
      email: "investisseur@demo.nexora",
      phone: "+22177000001",
      passwordHash: "demo",
      firstName: "Aïssatou",
      lastName: "Diallo",
      country: "SN",
      language: "fr",
      kycStatus: "verified",
      kycVerifiedAt: new Date(),
    },
  });

  // --- Entreprise emprunteuse (scénario section 28) ---
  const company = await db.company.create({
    data: {
      legalName: "Société Coopérative Téranga Commerce",
      tradeName: "Téranga Commerce",
      legalForm: "SARL",
      country: "SN",
      address: "Avenue Léopold Sédar Senghor, Dakar",
      registrationNo: "SN-DKR-2024-B-12345",
      taxId: "NINEA-12345678",
      activity: "Commerce de gros et distribution",
      foundedYear: 2019,
      verificationStatus: "verified",
      verifiedAt: new Date(),
      verifiedBankAccount: "Bank of Africa - SN01 2345 6789",
      bankAccountVerifiedAt: new Date(),
    },
  });

  await db.companyMember.create({
    data: {
      userId: investor.id,
      companyId: company.id,
      role: "legal_representative",
      mandate: "manage",
    },
  });

  // --- Projet / Offre de RÉFÉRENCE (scénario section 28) ---
  const refProject = await db.project.create({
    data: {
      companyId: company.id,
      submittedBy: investor.id,
      title: "Extension réseau de distribution — Dakar",
      description:
        "Financement du stock de démarrage et de l'extension à 3 nouveaux points de vente dans la presqu'île.",
      longDescription:
        "Téranga Commerce, spécialisée dans la distribution de produits de consommation courante, souhaite étendre son réseau à 3 nouveaux points de vente dans la presqu'île de Dakar. Le financement couvre le stock initial, l'aménagement des points de vente et le fonds de roulement sur 6 mois. Source de remboursement : marge sur ventes (20% moyenne) et encaissements quotidiens.",
      sector: "Commerce",
      country: "SN",
      city: "Dakar",
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
      instrumentType: "debt",
      fundingGoal: 1_000_000n,
      companyContribution: 100_000n,
      annualRate: 8.0,
      ratePeriod: "total",
      durationMonths: 6,
      repaymentType: "bullet",
      gracePeriodMonths: 0,
      minInvestment: 10_000n,
      maxInvestment: 100_000n,
      budgetDetail: "Stock 600k, Aménagement 250k, FdR 150k",
      repaymentSource: "Marge sur ventes (20%)",
      risksIdentified: "Concentration géographique, dépendance fournisseurs",
      status: "funding", // en collecte
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    },
  });

  // ProjectEvent — workflow complet tracé
  for (const ev of [
    { eventType: "submitted", description: "Dossier soumis", days: 30 },
    { eventType: "under_review", description: "Analyse démarrée", days: 28 },
    { eventType: "approved", description: "Dossier approuvé par l'analyse", days: 25 },
    { eventType: "offer_prepared", description: "Offre préparée (conditions figées)", days: 23 },
    { eventType: "offer_confirmed", description: "Conditions confirmées par l'entreprise", days: 21 },
    { eventType: "published", description: "Offre publiée", days: 20 },
  ]) {
    await db.projectEvent.create({
      data: {
        projectId: refProject.id,
        eventType: ev.eventType,
        description: ev.description,
        actor: "system",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * ev.days),
      },
    });
  }

  const refOffer = await db.offer.create({
    data: {
      projectId: refProject.id,
      version: 1,
      fundingGoal: 1_000_000n,
      minInvestment: 10_000n,
      maxInvestment: 100_000n,
      annualRate: 8.0,
      ratePeriod: "total",
      durationMonths: 6,
      repaymentType: "bullet",
      upfrontCommissionPct: 6,
      annualFollowUpPct: 2,
      raisedAmount: 600_000n,
      committedAmount: 600_000n,
      backersCount: 60,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      closingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      visibility: "public",
      status: "open",
    },
  });

  // --- Investissement existant de l'investisseur de démo (confirmé) ---
  const inv1 = await db.investment.create({
    data: {
      offerId: refOffer.id,
      projectId: refProject.id,
      investorType: "individual",
      investorId: investor.id,
      investorName: "Aïssatou Diallo",
      investorEmail: "investisseur@demo.nexora",
      amount: 50_000n,
      sharePct: 5,
      status: "confirmed",
      signedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      paymentConfirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    },
  });

  // Ledger entries pour cet investissement confirmé (escrow)
  await db.ledgerEntry.create({
    data: {
      idemKey: `inv:${inv1.id}:debit`,
      accountType: "investor_external",
      accountId: investor.id,
      counterpartyType: "investor_locked",
      counterpartyId: investor.id,
      amount: -50_000n,
      sourceType: "investment",
      sourceId: inv1.id,
      description: "Investissement confirmé sur offre Extension réseau Dakar",
    },
  });
  await db.ledgerEntry.create({
    data: {
      idemKey: `inv:${inv1.id}:credit`,
      accountType: "escrow",
      accountId: refOffer.id,
      counterpartyType: "investor_external",
      counterpartyId: investor.id,
      amount: 50_000n,
      sourceType: "investment",
      sourceId: inv1.id,
      description: "Fonds reçus en séquestre — investissement Aïssatou Diallo",
    },
  });

  // --- 3 autres offres (equity, immobilier, énergie) ---
  const company2 = await db.company.create({
    data: {
      legalName: "AgriTech Solutions Afrique",
      tradeName: "AgriTech Afrique",
      legalForm: "SAS",
      country: "CI",
      address: "Cocody, Abidjan",
      registrationNo: "CI-ABJ-2023-C-9876",
      activity: "Technologie agricole",
      foundedYear: 2021,
      verificationStatus: "verified",
      verifiedAt: new Date(),
    },
  });
  const eqProject = await db.project.create({
    data: {
      companyId: company2.id,
      submittedBy: investor.id,
      title: "Plateforme SaaS pour coopératives agricoles",
      description: "Levée en capital pour accélérer le déploiement dans 5 pays UEMOA.",
      longDescription:
        "AgriTech Afrique édite une plateforme SaaS de gestion des coopératives agricoles. 18 000 producteurs déjà utilisateurs. Levée en capital pour étendre à 5 pays. Pas d'échéancier de remboursement : sortie envisagée à 5 ans par cession secondaire ou rachat.",
      sector: "Technologie",
      country: "CI",
      city: "Abidjan",
      imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80",
      instrumentType: "equity",
      fundingGoal: 500_000_000n,
      companyContribution: 0n,
      equityOfferedPct: 15,
      valuationPre: 2_500_000_000n,
      minInvestment: 1_000_000n,
      maxInvestment: 50_000_000n,
      budgetDetail: "R&D 200M, Commercial 150M, Expansion 150M",
      repaymentSource: "Sortie cession à 5 ans (non garantie)",
      risksIdentified: "Risque de dilution, pas de garantie de rendement",
      status: "funding",
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40),
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    },
  });
  await db.offer.create({
    data: {
      projectId: eqProject.id,
      version: 1,
      fundingGoal: 500_000_000n,
      minInvestment: 1_000_000n,
      maxInvestment: 50_000_000n,
      equityOfferedPct: 15,
      valuationPre: 2_500_000_000n,
      upfrontCommissionPct: 6,
      annualFollowUpPct: 0,
      raisedAmount: 180_000_000n,
      committedAmount: 180_000_000n,
      backersCount: 12,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      closingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      visibility: "public",
      status: "open",
    },
  });

  const company3 = await db.company.create({
    data: {
      legalName: "Immobilière Plateau",
      tradeName: "Immobilier Plateau",
      legalForm: "SA",
      country: "CI",
      address: "Plateau, Abidjan",
      registrationNo: "CI-ABJ-2018-A-2222",
      activity: "Promotion immobilière",
      foundedYear: 2018,
      verificationStatus: "verified",
      verifiedAt: new Date(),
    },
  });
  const imProject = await db.project.create({
    data: {
      companyId: company3.id,
      submittedBy: investor.id,
      title: "Résidence Les Baobabs — 24 logements",
      description: "Programme immobilier abordable à Bingerville, Côte d'Ivoire.",
      longDescription:
        "Construction de 24 logements T2/T3 à Bingerville. Ventes sur plan à 80%. Financement pour terminer la phase 1 (12 logements). Garantie hypothécaire sur le terrain.",
      sector: "Immobilier",
      country: "CI",
      city: "Bingerville",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce090597ffa9?w=1200&q=80",
      instrumentType: "debt",
      fundingGoal: 200_000_000n,
      companyContribution: 50_000_000n,
      annualRate: 10,
      ratePeriod: "annual",
      durationMonths: 18,
      repaymentType: "bullet",
      minInvestment: 500_000n,
      maxInvestment: 20_000_000n,
      budgetDetail: "Travaux 150M, Foncier 30M, Frais 20M",
      repaymentSource: "Ventes sur plan",
      risksIdentified: "Retard travaux, variation coûts matériaux",
      status: "funding",
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50),
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    },
  });
  await db.offer.create({
    data: {
      projectId: imProject.id,
      version: 1,
      fundingGoal: 200_000_000n,
      minInvestment: 500_000n,
      maxInvestment: 20_000_000n,
      annualRate: 10,
      ratePeriod: "annual",
      durationMonths: 18,
      repaymentType: "bullet",
      upfrontCommissionPct: 6,
      annualFollowUpPct: 2,
      raisedAmount: 80_000_000n,
      committedAmount: 80_000_000n,
      backersCount: 28,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      closingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
      visibility: "public",
      status: "open",
    },
  });

  // --- Un projet EN ANALYSE (pour montrer le workflow admin) ---
  const pendingProject = await db.project.create({
    data: {
      companyId: company.id,
      submittedBy: investor.id,
      title: "Extension ligne de production — Touba",
      description: "Achat d'équipements pour doubler la capacité de conditionnement.",
      longDescription:
        "Téranga Commerce souhaite ouvrir une unité de conditionnement à Touba. Le financement couvre l'acquisition de 2 lignes de production et le fonds de roulement.",
      sector: "Commerce",
      country: "SN",
      city: "Touba",
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
      instrumentType: "debt",
      fundingGoal: 2_500_000n,
      companyContribution: 500_000n,
      annualRate: 9,
      ratePeriod: "annual",
      durationMonths: 12,
      repaymentType: "amortized",
      minInvestment: 50_000n,
      maxInvestment: 500_000n,
      budgetDetail: "Équipements 1.8M, FdR 700k",
      repaymentSource: "Marge commerciale",
      risksIdentified: "Concurrence, dépendance transport",
      status: "under_review",
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  });
  await db.projectEvent.create({
    data: {
      projectId: pendingProject.id,
      eventType: "submitted",
      description: "Dossier soumis par l'entreprise",
      actor: investor.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  });
  await db.projectEvent.create({
    data: {
      projectId: pendingProject.id,
      eventType: "under_review",
      description: "Analyse démarrée par l'équipe",
      actor: "system",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  });

  // --- Admin de démo ---
  await db.adminUser.create({
    data: {
      email: "admin@nexora",
      passwordHash: "demo",
      firstName: "Ousmane",
      lastName: "Fall",
      role: "superadmin",
      permissions: JSON.stringify(["all"]),
    },
  });

  // --- Notifications démo ---
  await db.notification.create({
    data: {
      userId: investor.id,
      type: "verification",
      title: "Identité vérifiée",
      message: "Votre identité a été vérifiée. Vous pouvez maintenant investir.",
      read: true,
    },
  });
  await db.notification.create({
    data: {
      userId: investor.id,
      type: "payment",
      title: "Investissement confirmé",
      message: "Votre investissement de 50 000 FCFA sur « Extension réseau Dakar » est confirmé.",
      read: false,
    },
  });

  console.log("✅ Seed v2 terminé : 1 investisseur, 3 entreprises, 3 offres publiées + 1 projet en analyse");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
