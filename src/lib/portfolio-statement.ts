import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { isoNow } from "@/lib/d1";
import { simulateDebtFinancing } from "@/lib/finance";

export const PORTFOLIO_STATEMENT_VERSION = "1.0";

export interface PortfolioStatementPosition {
  investmentId: string;
  projectTitle: string;
  companyName: string;
  instrumentType: "debt" | "equity";
  amount: number;
  receivedToDate: number;
  expectedRepayment: number | null;
  ownershipPct: number | null;
  contractNumber: string | null;
  certificateNo: string | null;
  confirmedAt: string;
}

export interface PortfolioStatementSnapshot {
  version: string;
  locale: "fr" | "en";
  periodEnd: string;
  investor: {
    id: string;
    name: string;
    email: string;
    country: string;
  };
  summary: {
    totalInvested: number;
    receivedTotal: number;
    availableBalance: number;
    activePositions: number;
  };
  positions: PortfolioStatementPosition[];
}

interface PortfolioSourceRow extends Record<string, unknown> {
  investmentId: string;
  amount: number;
  paymentConfirmedAt: string;
  projectTitle: string;
  instrumentType: string;
  companyLegalName: string;
  companyTradeName: string | null;
  fundingGoal: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  receivedToDate: number;
  equityDividendReceived: number;
  ownershipMicroPct: number | null;
  certificateNo: string | null;
  contractNumber: string | null;
}

interface PortfolioStatementRow extends Record<string, unknown> {
  id: string;
  userId: string;
  statementNumber: string;
  documentVersion: string;
  locale: string;
  snapshot: string;
  contentHash: string;
  periodEnd: string;
  issuedAt: string;
  lastDownloadedAt: string | null;
  downloadCount: number;
}

export async function hashPortfolioStatementSnapshot(snapshot: PortfolioStatementSnapshot) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(snapshot))
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function portfolioStatementNumber(periodEnd: string, contentHash: string) {
  const day = periodEnd.replace(/[^0-9]/g, "").slice(0, 8);
  const fingerprint = contentHash.replace(/[^a-fA-F0-9]/g, "").slice(0, 12).toUpperCase();
  return `NXS-${day || "STATEMENT"}-${fingerprint || "PORTFOLIO"}`;
}

export async function ensurePortfolioStatement(
  database: D1Database,
  userId: string,
  requestedLocale: "fr" | "en"
) {
  const [user, positionResult, balanceRow] = await Promise.all([
    database
      .prepare(
        `SELECT id, firstName, lastName, email, country, language
         FROM User WHERE id = ? LIMIT 1`
      )
      .bind(userId)
      .first<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        country: string;
        language: string;
      }>(),
    database
      .prepare(
        `SELECT i.id AS investmentId, i.amount, i.paymentConfirmedAt,
                p.title AS projectTitle, p.instrumentType,
                c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
                o.fundingGoal, o.annualRate, o.ratePeriod, o.durationMonths,
                o.repaymentType, o.upfrontCommissionPct, o.annualFollowUpPct,
                COALESCE((
                  SELECT SUM(d.amount) FROM Distribution d
                  WHERE d.investmentId = i.id AND d.status = 'available'
                ), 0) AS receivedToDate,
                COALESCE((
                  SELECT SUM(eda.netAmount) FROM EquityDividendAllocation eda
                  WHERE eda.investmentId = i.id AND eda.status = 'available'
                ), 0) AS equityDividendReceived,
                ea.ownershipMicroPct, ea.certificateNo, ic.contractNumber
         FROM Investment i
         JOIN Project p ON p.id = i.projectId
         JOIN Company c ON c.id = p.companyId
         JOIN Offer o ON o.id = i.offerId
         LEFT JOIN EquityAllocation ea ON ea.investmentId = i.id
         LEFT JOIN InvestmentContract ic ON ic.investmentId = i.id
         WHERE i.investorId = ? AND i.status = 'confirmed'
           AND i.paymentConfirmedAt IS NOT NULL
         ORDER BY i.paymentConfirmedAt ASC, i.id ASC`
      )
      .bind(userId)
      .all<PortfolioSourceRow>(),
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM LedgerEntry
         WHERE accountType = 'investor_wallet' AND accountId = ?`
      )
      .bind(userId)
      .first<{ balance: number }>(),
  ]);

  if (!user) throw new Error("portfolio_statement_user_missing");
  const positions = positionResult.results.map<PortfolioStatementPosition>((row) => {
    const amount = Number(row.amount);
    const receivedToDate =
      Number(row.receivedToDate || 0) + Number(row.equityDividendReceived || 0);
    let expectedRepayment: number | null = null;
    if (row.instrumentType === "debt") {
      const simulation = simulateDebtFinancing({
        principal: BigInt(Number(row.fundingGoal)),
        annualRate: Number(row.annualRate || 0),
        ratePeriod: row.ratePeriod === "annual" ? "annual" : "total",
        durationMonths: Number(row.durationMonths || 0),
        repaymentType: row.repaymentType === "amortized" ? "amortized" : "bullet",
        upfrontCommissionPct: Number(row.upfrontCommissionPct),
        annualFollowUpPct: Number(row.annualFollowUpPct),
      });
      expectedRepayment = Number(simulation.perInvestorRepayment(BigInt(amount)));
    }
    return {
      investmentId: row.investmentId,
      projectTitle: row.projectTitle,
      companyName: row.companyTradeName || row.companyLegalName,
      instrumentType: row.instrumentType === "equity" ? "equity" : "debt",
      amount,
      receivedToDate,
      expectedRepayment,
      ownershipPct:
        row.instrumentType === "equity" && row.ownershipMicroPct !== null
          ? Number(row.ownershipMicroPct) / 1_000_000
          : null,
      contractNumber: row.contractNumber,
      certificateNo: row.certificateNo,
      confirmedAt: row.paymentConfirmedAt,
    };
  });
  const locale = requestedLocale === "en" ? "en" : "fr";
  const periodEnd = isoNow().slice(0, 10);
  const snapshot: PortfolioStatementSnapshot = {
    version: PORTFOLIO_STATEMENT_VERSION,
    locale,
    periodEnd,
    investor: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email,
      email: user.email,
      country: user.country,
    },
    summary: {
      totalInvested: positions.reduce((sum, position) => sum + position.amount, 0),
      receivedTotal: positions.reduce((sum, position) => sum + position.receivedToDate, 0),
      availableBalance: Number(balanceRow?.balance || 0),
      activePositions: positions.length,
    },
    positions,
  };
  const contentHash = await hashPortfolioStatementSnapshot(snapshot);
  const existing = await database
    .prepare(
      `SELECT id, userId, statementNumber, documentVersion, locale, snapshot,
              contentHash, periodEnd, issuedAt, lastDownloadedAt, downloadCount
       FROM PortfolioStatement WHERE userId = ? AND contentHash = ? LIMIT 1`
    )
    .bind(userId, contentHash)
    .first<PortfolioStatementRow>();
  if (existing) return existing;

  const issuedAt = isoNow();
  const statementNumber = portfolioStatementNumber(periodEnd, contentHash);
  const statementId = crypto.randomUUID();
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO PortfolioStatement
         (id, userId, statementNumber, documentVersion, locale, snapshot,
          contentHash, periodEnd, issuedAt, lastDownloadedAt, downloadCount,
          createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`
    )
    .bind(
      statementId,
      userId,
      statementNumber,
      PORTFOLIO_STATEMENT_VERSION,
      locale,
      JSON.stringify(snapshot),
      contentHash,
      periodEnd,
      issuedAt,
      issuedAt,
      issuedAt
    )
    .run();

  if ((inserted.meta.changes || 0) === 1) {
    await database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, createdAt)
         VALUES (?, 'system', 'portfolio-service', 'portfolio_statement_issued',
                 'PortfolioStatement', ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        statementId,
        JSON.stringify({ userId, statementNumber, contentHash, periodEnd }),
        issuedAt
      )
      .run();
  }

  const statement = await database
    .prepare(
      `SELECT id, userId, statementNumber, documentVersion, locale, snapshot,
              contentHash, periodEnd, issuedAt, lastDownloadedAt, downloadCount
       FROM PortfolioStatement WHERE userId = ? AND contentHash = ? LIMIT 1`
    )
    .bind(userId, contentHash)
    .first<PortfolioStatementRow>();
  if (!statement) throw new Error("portfolio_statement_issue_failed");
  return statement;
}

function pdfSafe(value: string) {
  return value
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/…/g, "...")
    .replace(/[\u00a0\u202f]/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfSafe(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildPortfolioStatementPdf(
  snapshot: PortfolioStatementSnapshot,
  contentHash: string,
  statementNumber: string,
  issuedAt: string,
  requestedLocale?: "fr" | "en"
) {
  const locale = requestedLocale ?? snapshot.locale;
  const fr = locale === "fr";
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 44;
  const width = pageSize[0] - margin * 2;
  const purple = rgb(0.329, 0.071, 0.286);
  const deep = rgb(0.078, 0.016, 0.063);
  const dark = rgb(0.09, 0.07, 0.09);
  const muted = rgb(0.39, 0.36, 0.39);
  const line = rgb(0.88, 0.82, 0.87);
  const soft = rgb(0.982, 0.965, 0.977);
  let page: PDFPage;
  let y = 0;

  pdf.setTitle(`${fr ? "Releve de portefeuille" : "Portfolio statement"} ${statementNumber}`);
  pdf.setAuthor("NEXORA Capital");
  pdf.setSubject(fr ? "Situation consolidee du portefeuille" : "Consolidated portfolio position");
  pdf.setCreator("NEXORA Capital");
  pdf.setProducer("NEXORA Capital");
  pdf.setCreationDate(new Date(issuedAt));
  pdf.setModificationDate(new Date(issuedAt));

  const addPage = () => {
    page = pdf.addPage(pageSize);
    page.drawRectangle({ x: 0, y: pageSize[1] - 92, width: pageSize[0], height: 92, color: deep });
    page.drawRectangle({ x: 0, y: pageSize[1] - 92, width: 7, height: 92, color: purple });
    page.drawText("NEXORA", { x: margin, y: pageSize[1] - 48, size: 19, font: bold, color: rgb(1, 1, 1) });
    page.drawText(fr ? "CAPITAL PRIVE" : "PRIVATE CAPITAL", { x: margin, y: pageSize[1] - 65, size: 7.5, font: bold, color: rgb(0.91, 0.68, 0.86) });
    page.drawText(statementNumber, { x: 388, y: pageSize[1] - 55, size: 7.5, font: regular, color: rgb(0.87, 0.79, 0.85) });
    y = pageSize[1] - 122;
  };
  addPage();

  const ensureSpace = (height: number) => {
    if (y - height < 62) addPage();
  };
  const text = (
    value: string,
    options?: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; x?: number; maxWidth?: number }
  ) => {
    const size = options?.size ?? 9;
    const font = options?.font ?? regular;
    const maxWidth = options?.maxWidth ?? width;
    const lines = wrapText(value, font, size, maxWidth);
    ensureSpace(lines.length * (size + 4) + (options?.gap ?? 5));
    for (const item of lines) {
      page.drawText(item, { x: options?.x ?? margin, y, size, font, color: options?.color ?? muted });
      y -= size + 4;
    }
    y -= options?.gap ?? 5;
  };
  const money = (value: number) =>
    new Intl.NumberFormat(fr ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(value);

  text(fr ? "RELEVE DE PORTEFEUILLE" : "PORTFOLIO STATEMENT", { size: 18, font: bold, color: dark, gap: 4 });
  text(
    fr
      ? `Situation au ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${snapshot.periodEnd}T00:00:00Z`))}`
      : `Position as of ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${snapshot.periodEnd}T00:00:00Z`))}`,
    { size: 8.5, color: muted, gap: 14 }
  );

  text(snapshot.investor.name, { size: 12, font: bold, color: purple, gap: 2 });
  text(`${snapshot.investor.email}  |  ${snapshot.investor.country}`, { size: 8.5, gap: 13 });

  ensureSpace(88);
  const cardGap = 8;
  const cardWidth = (width - cardGap * 2) / 3;
  const cards = [
    [fr ? "CAPITAL ENGAGE" : "COMMITTED CAPITAL", money(snapshot.summary.totalInvested)],
    [fr ? "REVENUS RECUS" : "RETURNS RECEIVED", money(snapshot.summary.receivedTotal)],
    [fr ? "SOLDE DISPONIBLE" : "AVAILABLE BALANCE", money(snapshot.summary.availableBalance)],
  ];
  cards.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + cardGap);
    page.drawRectangle({ x, y: y - 58, width: cardWidth, height: 58, color: soft, borderColor: line, borderWidth: 0.6 });
    page.drawText(label, { x: x + 10, y: y - 19, size: 6.8, font: bold, color: muted });
    page.drawText(pdfSafe(value), { x: x + 10, y: y - 42, size: 11, font: bold, color: purple });
  });
  y -= 78;

  text(fr ? `POSITIONS CONFIRMEES (${snapshot.positions.length})` : `CONFIRMED POSITIONS (${snapshot.positions.length})`, {
    size: 10,
    font: bold,
    color: dark,
    gap: 8,
  });

  if (snapshot.positions.length === 0) {
    text(fr ? "Aucune position confirmee a la date du releve." : "No confirmed position as of the statement date.", { gap: 16 });
  }

  snapshot.positions.forEach((position, index) => {
    const titleLines = wrapText(position.projectTitle, bold, 10, width - 20);
    const companyLines = wrapText(position.companyName, regular, 8, width - 20);
    const blockHeight = Math.max(98, 70 + (titleLines.length + companyLines.length) * 11);
    ensureSpace(blockHeight + 12);
    page.drawRectangle({ x: margin, y: y - blockHeight, width, height: blockHeight, color: rgb(1, 1, 1), borderColor: line, borderWidth: 0.7 });
    page.drawRectangle({ x: margin, y: y - blockHeight, width: 5, height: blockHeight, color: index % 2 === 0 ? purple : rgb(0.48, 0.15, 0.43) });
    let blockY = y - 18;
    for (const titleLine of titleLines) {
      page.drawText(titleLine, { x: margin + 15, y: blockY, size: 10, font: bold, color: dark });
      blockY -= 13;
    }
    for (const companyLine of companyLines) {
      page.drawText(companyLine, { x: margin + 15, y: blockY, size: 8, font: regular, color: muted });
      blockY -= 11;
    }
    blockY -= 4;
    const instrument = position.instrumentType === "equity"
      ? fr ? "Capital" : "Equity"
      : fr ? "Financement avec remboursement" : "Repayable financing";
    page.drawText(instrument, { x: margin + 15, y: blockY, size: 7.5, font: bold, color: purple });
    page.drawText(`${fr ? "Engage" : "Committed"}: ${pdfSafe(money(position.amount))}`, { x: margin + 15, y: blockY - 18, size: 8.2, font: bold, color: dark });
    page.drawText(`${fr ? "Recu" : "Received"}: ${pdfSafe(money(position.receivedToDate))}`, { x: margin + 190, y: blockY - 18, size: 8.2, font: regular, color: muted });
    const participation = position.instrumentType === "equity"
      ? `${fr ? "Participation" : "Ownership"}: ${position.ownershipPct === null ? "-" : `${position.ownershipPct.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} %`}`
      : `${fr ? "Montant attendu" : "Expected amount"}: ${position.expectedRepayment === null ? "-" : money(position.expectedRepayment)}`;
    page.drawText(pdfSafe(participation), { x: margin + 15, y: blockY - 34, size: 8.2, font: regular, color: muted });
    const reference = position.certificateNo || position.contractNumber || position.investmentId;
    page.drawText(pdfSafe(`${fr ? "Reference" : "Reference"}: ${reference}`), { x: margin + 15, y: blockY - 50, size: 7.5, font: regular, color: muted });
    y -= blockHeight + 12;
  });

  ensureSpace(100);
  text(fr ? "TRAÇABILITE" : "TRACEABILITY", { size: 10, font: bold, color: dark, gap: 5 });
  text(`${fr ? "Reference du releve" : "Statement reference"}: ${statementNumber}`, { size: 7.6, gap: 2 });
  text(`${fr ? "Empreinte du contenu" : "Content fingerprint"}: ${contentHash}`, { size: 7.2, gap: 8 });
  text(
    fr
      ? "Ce releve reprend les positions confirmees et les mouvements disponibles dans votre portefeuille a la date indiquee. Les rendements futurs, la liquidite des titres et la valeur de sortie ne sont pas garantis."
      : "This statement reflects confirmed positions and available movements in your portfolio as of the stated date. Future returns, share liquidity and exit value are not guaranteed.",
    { size: 8, gap: 12 }
  );

  const pages = pdf.getPages();
  pages.forEach((statementPage, index) => {
    statementPage.drawLine({ start: { x: margin, y: 43 }, end: { x: pageSize[0] - margin, y: 43 }, thickness: 0.5, color: line });
    statementPage.drawText(pdfSafe(fr ? "Document personnel - conserver une copie" : "Personal document - retain a copy"), {
      x: margin,
      y: 27,
      size: 7.2,
      font: regular,
      color: muted,
    });
    statementPage.drawText(`${index + 1} / ${pages.length}`, {
      x: pageSize[0] - margin - 28,
      y: 27,
      size: 7.2,
      font: regular,
      color: muted,
    });
  });
  return pdf.save({ useObjectStreams: false });
}
