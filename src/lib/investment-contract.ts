import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { isoNow } from "@/lib/d1";

export const INVESTMENT_CONTRACT_VERSION = "1.0";

export interface InvestmentContractSnapshot {
  contractNumber: string;
  issuedAt: string;
  locale: "fr" | "en";
  investment: {
    id: string;
    amount: number;
    sharePct: number;
    signedAt: string;
    paymentConfirmedAt: string;
    signatureHash: string;
  };
  investor: {
    id: string;
    name: string;
    email: string;
    country: string;
  };
  offer: {
    id: string;
    version: number;
    fundingGoal: number;
    annualRate: number | null;
    ratePeriod: string | null;
    durationMonths: number | null;
    repaymentType: string | null;
    equityOfferedPct: number | null;
  };
  project: {
    id: string;
    title: string;
    instrumentType: string;
    country: string;
    city: string;
  };
  company: {
    id: string;
    legalName: string;
    tradeName: string | null;
    legalForm: string;
    country: string;
  };
  evidence: {
    agreementVersion: string;
    termsVersion: string;
    riskVersion: string;
    agreementHash: string;
    signedPayloadHash: string;
    signatureMethod: string;
  };
}

interface ContractSourceRow extends Record<string, unknown> {
  investmentId: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  investorCountry: string;
  amount: number;
  sharePct: number;
  signedAt: string;
  paymentConfirmedAt: string;
  signatureHash: string;
  offerId: string;
  offerVersion: number;
  fundingGoal: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  projectId: string;
  projectTitle: string;
  instrumentType: string;
  projectCountry: string;
  projectCity: string;
  companyId: string;
  companyLegalName: string;
  companyTradeName: string | null;
  companyLegalForm: string;
  companyCountry: string;
  agreementVersion: string;
  termsVersion: string;
  riskVersion: string;
  agreementHash: string;
  signedPayloadHash: string;
  signatureMethod: string;
  evidenceLocale: string;
}

export interface InvestmentContractRow extends Record<string, unknown> {
  id: string;
  investmentId: string;
  contractNumber: string;
  documentVersion: string;
  locale: string;
  snapshot: string;
  contentHash: string;
  issuedAt: string;
  lastDownloadedAt: string | null;
  downloadCount: number;
}

export function investmentContractNumber(investmentId: string, issuedAt: string) {
  const year = new Date(issuedAt).getUTCFullYear();
  const compact = investmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toUpperCase();
  return `NXC-${year}-${compact || "CONTRACT"}`;
}

export async function hashInvestmentContractSnapshot(snapshot: InvestmentContractSnapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureInvestmentContract(database: D1Database, investmentId: string) {
  const existing = await database
    .prepare(
      `SELECT id, investmentId, contractNumber, documentVersion, locale, snapshot,
              contentHash, issuedAt, lastDownloadedAt, downloadCount
       FROM InvestmentContract WHERE investmentId = ? LIMIT 1`
    )
    .bind(investmentId)
    .first<InvestmentContractRow>();
  if (existing) return existing;

  const source = await database
    .prepare(
      `SELECT i.id AS investmentId, i.investorId, i.investorName, i.investorEmail,
              u.country AS investorCountry, i.amount, i.sharePct, i.signedAt,
              i.paymentConfirmedAt, i.signatureHash,
              o.id AS offerId, o.version AS offerVersion, o.fundingGoal,
              o.annualRate, o.ratePeriod, o.durationMonths, o.repaymentType,
              o.equityOfferedPct,
              p.id AS projectId, p.title AS projectTitle, p.instrumentType,
              p.country AS projectCountry, p.city AS projectCity,
              c.id AS companyId, c.legalName AS companyLegalName,
              c.tradeName AS companyTradeName, c.legalForm AS companyLegalForm,
              c.country AS companyCountry,
              se.agreementVersion, se.termsVersion, se.riskVersion,
              se.agreementHash, se.signedPayloadHash, se.signatureMethod,
              se.locale AS evidenceLocale
       FROM Investment i
       JOIN User u ON u.id = i.investorId
       JOIN Offer o ON o.id = i.offerId
       JOIN Project p ON p.id = i.projectId
       JOIN Company c ON c.id = p.companyId
       JOIN SubscriptionEvidence se ON se.investmentId = i.id
       WHERE i.id = ? AND i.status = 'confirmed'
         AND i.paymentConfirmedAt IS NOT NULL
         AND i.signedAt IS NOT NULL
         AND i.signatureHash IS NOT NULL
       LIMIT 1`
    )
    .bind(investmentId)
    .first<ContractSourceRow>();
  if (!source) throw new Error("confirmed_investment_contract_source_missing");

  const issuedAt = source.paymentConfirmedAt;
  const contractNumber = investmentContractNumber(source.investmentId, issuedAt);
  const locale = source.evidenceLocale === "en" ? "en" : "fr";
  const snapshot: InvestmentContractSnapshot = {
    contractNumber,
    issuedAt,
    locale,
    investment: {
      id: source.investmentId,
      amount: Number(source.amount),
      sharePct: Number(source.sharePct),
      signedAt: source.signedAt,
      paymentConfirmedAt: source.paymentConfirmedAt,
      signatureHash: source.signatureHash,
    },
    investor: {
      id: source.investorId,
      name: source.investorName,
      email: source.investorEmail,
      country: source.investorCountry,
    },
    offer: {
      id: source.offerId,
      version: Number(source.offerVersion),
      fundingGoal: Number(source.fundingGoal),
      annualRate: source.annualRate === null ? null : Number(source.annualRate),
      ratePeriod: source.ratePeriod,
      durationMonths: source.durationMonths === null ? null : Number(source.durationMonths),
      repaymentType: source.repaymentType,
      equityOfferedPct: source.equityOfferedPct === null ? null : Number(source.equityOfferedPct),
    },
    project: {
      id: source.projectId,
      title: source.projectTitle,
      instrumentType: source.instrumentType,
      country: source.projectCountry,
      city: source.projectCity,
    },
    company: {
      id: source.companyId,
      legalName: source.companyLegalName,
      tradeName: source.companyTradeName,
      legalForm: source.companyLegalForm,
      country: source.companyCountry,
    },
    evidence: {
      agreementVersion: source.agreementVersion,
      termsVersion: source.termsVersion,
      riskVersion: source.riskVersion,
      agreementHash: source.agreementHash,
      signedPayloadHash: source.signedPayloadHash,
      signatureMethod: source.signatureMethod,
    },
  };
  const contentHash = await hashInvestmentContractSnapshot(snapshot);
  const contractId = crypto.randomUUID();
  const now = isoNow();
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO InvestmentContract
         (id, investmentId, contractNumber, documentVersion, locale, snapshot,
          contentHash, issuedAt, lastDownloadedAt, downloadCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`
    )
    .bind(
      contractId,
      investmentId,
      contractNumber,
      INVESTMENT_CONTRACT_VERSION,
      locale,
      JSON.stringify(snapshot),
      contentHash,
      issuedAt,
      now,
      now
    )
    .run();

  if ((inserted.meta.changes || 0) === 1) {
    await database.batch([
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, createdAt)
           VALUES (?, 'system', 'contract-service', 'investment_contract_issued',
                   'InvestmentContract', ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          contractId,
          JSON.stringify({ investmentId, contractNumber, contentHash }),
          now
        ),
      database
        .prepare(
          `INSERT INTO Notification
             (id, userId, type, title, message, read, actionUrl, createdAt)
           VALUES (?, ?, 'contract', 'Votre contrat est disponible',
                   'Le contrat de votre souscription confirmée peut maintenant être téléchargé.',
                   0, 'investor_dashboard', ?)`
        )
        .bind(crypto.randomUUID(), source.investorId, now),
    ]);
  }

  const contract = await database
    .prepare(
      `SELECT id, investmentId, contractNumber, documentVersion, locale, snapshot,
              contentHash, issuedAt, lastDownloadedAt, downloadCount
       FROM InvestmentContract WHERE investmentId = ? LIMIT 1`
    )
    .bind(investmentId)
    .first<InvestmentContractRow>();
  if (!contract) throw new Error("investment_contract_issue_failed");
  return contract;
}

function pdfSafe(value: string) {
  return value
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfSafe(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildInvestmentContractPdf(
  snapshot: InvestmentContractSnapshot,
  contentHash: string,
  requestedLocale?: "fr" | "en"
) {
  const locale = requestedLocale ?? snapshot.locale;
  const fr = locale === "fr";
  const pdf = await PDFDocument.create();
  const issuedAt = new Date(snapshot.issuedAt);
  pdf.setTitle(`${fr ? "Contrat de souscription" : "Investment agreement"} ${snapshot.contractNumber}`);
  pdf.setAuthor("NEXORA Capital");
  pdf.setSubject(fr ? "Convention d'investissement confirmée" : "Confirmed investment agreement");
  pdf.setCreator("NEXORA Capital");
  pdf.setProducer("NEXORA Capital");
  pdf.setCreationDate(issuedAt);
  pdf.setModificationDate(issuedAt);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 48;
  const width = pageSize[0] - margin * 2;
  const purple = rgb(0.329, 0.071, 0.286);
  const dark = rgb(0.09, 0.07, 0.09);
  const muted = rgb(0.38, 0.35, 0.38);
  let page: PDFPage;
  let y: number;
  let pageNo = 0;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    pageNo += 1;
    page.drawRectangle({ x: 0, y: pageSize[1] - 86, width: pageSize[0], height: 86, color: purple });
    page.drawText("NEXORA", { x: margin, y: pageSize[1] - 48, size: 19, font: bold, color: rgb(1, 1, 1) });
    page.drawText(fr ? "CAPITAL PRIVE" : "PRIVATE CAPITAL", { x: margin, y: pageSize[1] - 64, size: 7.5, font: bold, color: rgb(0.92, 0.73, 0.88) });
    page.drawText(`${snapshot.contractNumber}  |  ${pageNo}`, { x: 388, y: pageSize[1] - 55, size: 8, font: regular, color: rgb(0.92, 0.83, 0.9) });
    y = pageSize[1] - 118;
  };
  addPage();

  const ensureSpace = (height: number) => {
    if (y - height < 58) addPage();
  };
  const heading = (text: string) => {
    ensureSpace(32);
    page.drawText(pdfSafe(text), { x: margin, y, size: 11, font: bold, color: purple });
    y -= 19;
  };
  const paragraph = (text: string, options?: { bold?: boolean; size?: number; gap?: number }) => {
    const size = options?.size ?? 9.5;
    const font = options?.bold ? bold : regular;
    const lines = wrapText(text, font, size, width);
    ensureSpace(lines.length * 14 + (options?.gap ?? 8));
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font, color: options?.bold ? dark : muted });
      y -= 14;
    }
    y -= options?.gap ?? 8;
  };

  const companyName = snapshot.company.tradeName || snapshot.company.legalName;
  const money = new Intl.NumberFormat(fr ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(snapshot.investment.amount);
  const signedDate = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(snapshot.investment.signedAt));
  const paidDate = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(snapshot.investment.paymentConfirmedAt));

  paragraph(
    fr
      ? snapshot.project.instrumentType === "equity"
        ? "CONTRAT DE SOUSCRIPTION AU CAPITAL"
        : "CONVENTION DE FINANCEMENT"
      : snapshot.project.instrumentType === "equity"
        ? "EQUITY SUBSCRIPTION AGREEMENT"
        : "FINANCING AGREEMENT",
    { bold: true, size: 17, gap: 5 }
  );
  paragraph(fr ? `Référence ${snapshot.contractNumber}` : `Reference ${snapshot.contractNumber}`, { size: 9, gap: 18 });

  heading(fr ? "1. Parties et projet" : "1. Parties and project");
  paragraph(
    fr
      ? `${snapshot.investor.name} (${snapshot.investor.email}), ci-après l'Investisseur, souscrit au projet "${snapshot.project.title}" porté par ${companyName}, ${snapshot.company.legalForm}, ci-après l'Entreprise.`
      : `${snapshot.investor.name} (${snapshot.investor.email}), the Investor, subscribes to the project "${snapshot.project.title}" carried by ${companyName}, ${snapshot.company.legalForm}, the Company.`
  );

  heading(fr ? "2. Souscription confirmée" : "2. Confirmed subscription");
  paragraph(
    fr
      ? `Montant versé : ${money}. Participation : ${snapshot.investment.sharePct.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} %. Offre ${snapshot.offer.id}, version ${snapshot.offer.version}. Paiement confirmé le ${paidDate}.`
      : `Amount paid: ${money}. Participation: ${snapshot.investment.sharePct.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}%. Offer ${snapshot.offer.id}, version ${snapshot.offer.version}. Payment confirmed on ${paidDate}.`
  );
  if (snapshot.project.instrumentType === "debt") {
    paragraph(
      fr
        ? `La rémunération de référence est de ${snapshot.offer.annualRate ?? 0} % (${snapshot.offer.ratePeriod === "annual" ? "par an" : "sur la durée"}) sur ${snapshot.offer.durationMonths ?? 0} mois. Tout rendement reste soumis au remboursement effectif de l'Entreprise.`
        : `The reference return is ${snapshot.offer.annualRate ?? 0}% (${snapshot.offer.ratePeriod === "annual" ? "per year" : "over the term"}) over ${snapshot.offer.durationMonths ?? 0} months. Any return remains subject to effective repayment by the Company.`
    );
  } else {
    paragraph(
      fr
        ? `La participation correspond à une souscription au capital. L'émission juridique des titres, leur liquidité et leur valeur future ne sont pas garanties.`
        : `This participation is an equity subscription. Legal issuance, liquidity and future value of the shares are not guaranteed.`
    );
  }

  heading(fr ? "3. Consentement et risques" : "3. Consent and risks");
  paragraph(
    fr
      ? `L'Investisseur confirme avoir consulté les informations de l'offre, compris le risque de perte partielle ou totale du capital et accepté les conditions applicables. Consentement électronique enregistré le ${signedDate}.`
      : `The Investor confirms having reviewed the offer information, understood the risk of partial or total capital loss and accepted the applicable terms. Electronic consent was recorded on ${signedDate}.`
  );

  heading(fr ? "4. Preuve et traçabilité" : "4. Evidence and traceability");
  paragraph(`${fr ? "Identifiant de souscription" : "Investment ID"}: ${snapshot.investment.id}`, { size: 8.5, gap: 3 });
  paragraph(`${fr ? "Empreinte du consentement" : "Consent fingerprint"}: ${snapshot.evidence.signedPayloadHash}`, { size: 8.5, gap: 3 });
  paragraph(`${fr ? "Empreinte du contrat" : "Contract fingerprint"}: ${contentHash}`, { size: 8.5, gap: 12 });

  heading(fr ? "5. Conservation" : "5. Retention");
  paragraph(
    fr
      ? "Le présent document est généré à partir des informations figées lors de la confirmation du paiement. La plateforme conserve la preuve du consentement, la confirmation de paiement, l'empreinte du contenu et l'historique des téléchargements."
      : "This document is generated from information fixed when payment was confirmed. The platform retains evidence of consent, payment confirmation, the content fingerprint and download history."
  );

  paragraph(
    fr
      ? "Signature électronique de l'Investisseur : consentement authentifié et horodaté. Validation NEXORA : paiement rapproché et contrat émis automatiquement."
      : "Investor electronic signature: authenticated and timestamped consent. NEXORA validation: payment reconciled and agreement automatically issued.",
    { bold: true, size: 9, gap: 16 }
  );

  for (const contractPage of pdf.getPages()) {
    contractPage.drawLine({ start: { x: margin, y: 43 }, end: { x: pageSize[0] - margin, y: 43 }, thickness: 0.5, color: rgb(0.85, 0.8, 0.84) });
    contractPage.drawText(pdfSafe(fr ? "Document personnel - conserver une copie" : "Personal document - retain a copy"), {
      x: margin,
      y: 28,
      size: 7.5,
      font: regular,
      color: muted,
    });
  }

  return pdf.save({ useObjectStreams: false });
}
