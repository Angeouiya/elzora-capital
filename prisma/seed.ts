import { PrismaClient } from "../lib/generated/prisma/client.js";
import { PrismaD1 } from "@prisma/adapter-d1";
import bcrypt from "bcryptjs";

/**
 * Seed du D1 local (miniflare) via getPlatformProxy — même emplacement
 * que `wrangler d1 execute --local` (.wrangler/state).
 */
async function createPrismaClient(): Promise<PrismaClient> {
  const { getPlatformProxy } = await import("wrangler");
  const { env } = await getPlatformProxy();
  return new PrismaClient({
    adapter: new PrismaD1(env.DB as ConstructorParameters<typeof PrismaD1>[0]),
  });
}

const prisma = await createPrismaClient();

async function main() {
  console.log("Nexora Capital — Seed de démonstration");

  await prisma.distribution.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.disbursement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.project.deleteMany();
  await prisma.company.deleteMany();
  await prisma.kYCDocument.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  const investor = await prisma.user.create({
    data: {
      email: "investisseur@nexora.ci",
      password: hash,
      firstName: "Amadou",
      lastName: "Koné",
      role: "INVESTOR",
      accountType: "INDIVIDUAL",
      country: "CI",
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
  });

  const entrepreneur = await prisma.user.create({
    data: {
      email: "entreprise@nexora.ci",
      password: hash,
      firstName: "Fatou",
      lastName: "Diallo",
      role: "ENTERPRISE",
      accountType: "COMPANY",
      country: "CI",
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@nexora.ci",
      password: hash,
      firstName: "Marie",
      lastName: "Diop",
      role: "ADMIN",
      accountType: "INDIVIDUAL",
      country: "SN",
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "Agro-Alliance SARL",
      legalForm: "SARL",
      country: "CI",
      registrationNumber: "CI-ABJ-2019-B-12345",
      taxId: "1234567890",
      sector: "Agriculture",
      address: "Zone Industrielle, Abidjan",
      description: "Transformation et export de produits agricoles",
      status: "VERIFIED",
      userId: entrepreneur.id,
    },
  });

  const project1 = await prisma.project.create({
    data: {
      companyId: company.id,
      title: "Financement campagne anacarde 2025",
      description: "Financement de la campagne de collecte et transformation de noix de cajou pour la saison 2025.",
      sector: "Agriculture",
      country: "CI",
      city: "Abidjan",
      totalAmount: 60000000,
      ownContribution: 10000000,
      requestedAmount: 50000000,
      budget: JSON.stringify({ achat_matieres: 35000000, fonctionnement: 10000000, equipement: 5000000 }),
      usageDescription: "Achat de noix de cajou brutes et fonctionnement de l'unité de transformation",
      status: "PUBLISHED",
      submittedAt: new Date("2025-03-01"),
      approvedAt: new Date("2025-03-15"),
    },
  });

  const offer1 = await prisma.offer.create({
    data: {
      projectId: project1.id,
      type: "DEBT",
      rate: 750,
      ratePeriod: "TOTAL",
      duration: 12,
      minTicket: 25000,
      maxTicket: 5000000,
      targetAmount: 50000000,
      collectedAmount: 42000000,
      investorCount: 84,
      status: "PUBLISHED",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-07-01"),
      publishedAt: new Date("2025-03-20"),
    },
  });

  const inv1 = await prisma.investment.create({
    data: {
      userId: investor.id,
      offerId: offer1.id,
      amount: 500000,
      status: "CONFIRMED",
      signedAt: new Date("2025-03-25"),
      paidAt: new Date("2025-03-26"),
    },
  });

  await prisma.payment.create({
    data: {
      investmentId: inv1.id,
      reference: "NX-INV-2025-001",
      amount: 500000,
      method: "TRANSFER",
      status: "CONFIRMED",
      providerRef: "SGCI-RTGS-2025032601",
      confirmedAt: new Date("2025-03-26"),
    },
  });

  for (let i = 1; i <= 12; i++) {
    const date = new Date("2025-05-01");
    date.setMonth(date.getMonth() + i - 1);
    const isLast = i === 12;
    const interest = isLast ? 37500 - Math.round(37500 / 12) * 11 : Math.round(37500 / 12);
    const capital = isLast ? 500000 : 0;
    const status = i <= 2 ? "PAID" : i === 3 ? "DUE" : "UPCOMING";
    await prisma.repayment.create({
      data: {
        offerId: offer1.id,
        scheduleDate: date,
        capitalAmount: capital,
        interestAmount: interest,
        feeAmount: 0,
        status,
        paidAmount: status === "PAID" ? capital + interest : 0,
        paidAt: status === "PAID" ? date : null,
        reference: "NX-AGR04-E" + String(i).padStart(2, "0"),
      },
    });
  }

  /* Deuxième dossier : collecte réussie → décaissements + échéancier actif */
  const project2 = await prisma.project.create({
    data: {
      companyId: company.id,
      title: "Modernisation de l'unité d'export cacao",
      description:
        "Acquisition d'équipements de conditionnement et certification pour l'export direct de fèves de cacao vers l'Europe.",
      sector: "Agriculture",
      country: "CI",
      city: "San-Pédro",
      totalAmount: 30000000,
      ownContribution: 10000000,
      requestedAmount: 20000000,
      budget: JSON.stringify({
        equipement: 15000000,
        certification: 5000000,
        fonds_roulement: 10000000,
      }),
      usageDescription:
        "Équipements de conditionnement, certification UTZ et fonds de roulement de campagne",
      status: "PUBLISHED",
      submittedAt: new Date("2025-04-01"),
      approvedAt: new Date("2025-04-20"),
    },
  });

  const offer2 = await prisma.offer.create({
    data: {
      projectId: project2.id,
      type: "DEBT",
      rate: 800,
      ratePeriod: "TOTAL",
      duration: 6,
      minTicket: 25000,
      maxTicket: 5000000,
      targetAmount: 20000000,
      collectedAmount: 20000000,
      investorCount: 42,
      status: "CLOSED_SUCCESS",
      startDate: new Date("2025-05-01"),
      endDate: new Date("2025-05-31"),
      publishedAt: new Date("2025-04-25"),
    },
  });

  /* Échéancier offre 2 : 8 % au total sur 6 mois, capital remboursé in fine */
  for (let i = 1; i <= 6; i++) {
    const date = new Date("2025-06-01");
    date.setMonth(date.getMonth() + i - 1);
    const isLast = i === 6;
    const interest = isLast
      ? 1600000 - Math.round(1600000 / 6) * 5
      : Math.round(1600000 / 6);
    const capital = isLast ? 20000000 : 0;
    const status = i === 1 ? "PAID" : i === 2 ? "DUE" : "UPCOMING";
    await prisma.repayment.create({
      data: {
        offerId: offer2.id,
        scheduleDate: date,
        capitalAmount: capital,
        interestAmount: interest,
        feeAmount: 0,
        status,
        paidAmount: status === "PAID" ? capital + interest : 0,
        paidAt: status === "PAID" ? date : null,
        reference: "NX-CAC25-E" + String(i).padStart(2, "0"),
      },
    });
  }

  /* Décaissements offre 2 : net reçu = 18 800 000 FCFA (commission 6 % déduite) */
  await prisma.disbursement.create({
    data: {
      offerId: offer2.id,
      amount: 10000000,
      tranche: 1,
      status: "EXECUTED",
      approvedBy: admin.id,
      executedAt: new Date("2025-06-10"),
      createdAt: new Date("2025-06-02"),
    },
  });
  await prisma.disbursement.create({
    data: {
      offerId: offer2.id,
      amount: 5000000,
      tranche: 2,
      status: "APPROVED",
      approvedBy: admin.id,
      createdAt: new Date("2025-06-20"),
    },
  });
  await prisma.disbursement.create({
    data: {
      offerId: offer2.id,
      amount: 2000000,
      tranche: 3,
      status: "PENDING",
      createdAt: new Date("2025-07-01"),
    },
  });

  await prisma.kYCDocument.create({
    data: {
      userId: investor.id,
      type: "IDENTITY",
      fileName: "cni_amadou_kone.pdf",
      status: "VERIFIED",
      verifiedAt: new Date("2025-02-15"),
    },
  });

  await prisma.notification.create({
    data: {
      userId: investor.id,
      type: "PAYMENT",
      title: "Echéance reçue",
      message: "Votre échéance de mars pour Agro-Alliance a été versée : 3 125 FCFA",
      read: false,
    },
  });

  console.log("Seed terminé");
  console.log("  Investisseur : investisseur@nexora.ci / password123");
  console.log("  Entreprise   : entreprise@nexora.ci / password123");
  console.log("  Admin        : admin@nexora.ci / password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
