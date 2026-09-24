import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  allocateDividendAmounts,
  calculatePlatformDividendPool,
} from "@/lib/equity-dividend";
import { microPctToEquityPct } from "@/lib/equity-allocation";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";
import {
  createPayDunyaCheckout,
  getPayDunyaCheckoutUrl,
  getPayDunyaConfig,
} from "@/lib/payments/paydunya";

interface EligibleIssuanceRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  companyId: string;
  totalOwnershipMicroPct: number;
  shareClass: string;
  issuedAt: string;
  projectTitle: string;
  companyLegalName: string;
  companyTradeName: string | null;
  mandate: string;
  companyVerificationStatus: string;
}

interface IssuedAllocationRow extends Record<string, unknown> {
  id: string;
  investmentId: string;
  investorType: string;
  investorId: string;
  ownershipMicroPct: number;
}

interface CompanyDividendRow extends Record<string, unknown> {
  id: string;
  issuanceId: string;
  projectId: string;
  companyId: string;
  totalDeclaredAmount: number;
  platformGrossAmount: number;
  withholdingAmount: number;
  netPayableAmount: number;
  currency: string;
  recordDate: string;
  resolutionRef: string;
  resolutionDate: string;
  taxReference: string | null;
  status: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  projectTitle: string;
  companyLegalName: string;
  companyTradeName: string | null;
  allocationCount: number;
}

interface PayableDividendRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  companyId: string;
  netPayableAmount: number;
  status: string;
  paymentRef: string | null;
  resolutionRef: string;
  projectTitle: string;
  companyLegalName: string;
  companyVerificationStatus: string;
  mandate: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string | null;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const capabilities = getPaymentCapabilities();
  const [issuanceResult, dividendResult] = await Promise.all([
    database
      .prepare(
        `SELECT e.id, e.projectId, e.companyId, e.totalOwnershipMicroPct,
                e.shareClass, e.issuedAt, p.title AS projectTitle,
                c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
                c.verificationStatus AS companyVerificationStatus, cm.mandate
         FROM EquityIssuance e
         JOIN Project p ON p.id = e.projectId
         JOIN Company c ON c.id = e.companyId
         JOIN CompanyMember cm ON cm.companyId = e.companyId AND cm.userId = ?
         WHERE e.status = 'issued'
         ORDER BY e.issuedAt DESC`
      )
      .bind(session.userId)
      .all<EligibleIssuanceRow>(),
    database
      .prepare(
        `SELECT d.id, d.issuanceId, d.projectId, d.companyId,
                d.totalDeclaredAmount, d.platformGrossAmount,
                d.withholdingAmount, d.netPayableAmount, d.currency,
                d.recordDate, d.resolutionRef, d.resolutionDate,
                d.taxReference, d.status, d.reviewedAt, d.approvedAt,
                d.paidAt, d.createdAt, p.title AS projectTitle,
                c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
                COUNT(a.id) AS allocationCount
         FROM EquityDividend d
         JOIN Project p ON p.id = d.projectId
         JOIN Company c ON c.id = d.companyId
         JOIN CompanyMember cm ON cm.companyId = d.companyId AND cm.userId = ?
         LEFT JOIN EquityDividendAllocation a ON a.dividendId = d.id
         GROUP BY d.id
         ORDER BY d.createdAt DESC`
      )
      .bind(session.userId)
      .all<CompanyDividendRow>(),
  ]);

  return NextResponse.json(
    {
      issuances: issuanceResult.results.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        companyId: row.companyId,
        ownershipPct: microPctToEquityPct(Number(row.totalOwnershipMicroPct)),
        shareClass: row.shareClass,
        issuedAt: row.issuedAt,
        mandate: row.mandate,
        companyVerificationStatus: row.companyVerificationStatus,
        project: {
          title: row.projectTitle,
          company: {
            legalName: row.companyLegalName,
            tradeName: row.companyTradeName,
          },
        },
      })),
      dividends: dividendResult.results.map((row) => ({
        ...row,
        totalDeclaredAmount: Number(row.totalDeclaredAmount),
        platformGrossAmount: Number(row.platformGrossAmount),
        withholdingAmount: Number(row.withholdingAmount),
        netPayableAmount: Number(row.netPayableAmount),
        allocationCount: Number(row.allocationCount),
        project: {
          title: row.projectTitle,
          company: {
            legalName: row.companyLegalName,
            tradeName: row.companyTradeName,
          },
        },
      })),
      collectionsEnabled: capabilities.collectionsEnabled,
      providerName: capabilities.providerName,
      collectionMethods: capabilities.collectionMethods,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const issuanceId = textValue(body.issuanceId, 160);
  const totalDeclaredAmount = moneyValue(body.totalDeclaredAmount);
  const withholdingAmount = nonNegativeMoneyValue(body.withholdingAmount);
  const resolutionRef = textValue(body.resolutionRef, 180);
  const resolutionDate = dateValue(body.resolutionDate);
  const recordDate = dateValue(body.recordDate);
  const taxReference = textValue(body.taxReference, 180, true);
  if (
    !issuanceId ||
    !totalDeclaredAmount ||
    withholdingAmount === null ||
    !resolutionRef ||
    !resolutionDate ||
    !recordDate
  ) {
    return NextResponse.json(
      { error: "Décision sociale, dates et montants valides requis." },
      { status: 400 }
    );
  }
  if (resolutionDate > recordDate) {
    return NextResponse.json(
      { error: "La date de référence ne peut pas précéder la décision sociale." },
      { status: 400 }
    );
  }
  if (withholdingAmount > 0 && !taxReference) {
    return NextResponse.json(
      { error: "Une référence fiscale est requise lorsqu'une retenue est déclarée." },
      { status: 400 }
    );
  }

  const database = getD1();
  const issuance = await database
    .prepare(
      `SELECT e.id, e.projectId, e.companyId, e.totalOwnershipMicroPct,
              e.shareClass, e.issuedAt, p.title AS projectTitle,
              c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              c.verificationStatus AS companyVerificationStatus, cm.mandate
       FROM EquityIssuance e
       JOIN Project p ON p.id = e.projectId
       JOIN Company c ON c.id = e.companyId
       JOIN CompanyMember cm ON cm.companyId = e.companyId AND cm.userId = ?
       WHERE e.id = ? AND e.status = 'issued' LIMIT 1`
    )
    .bind(session.userId, issuanceId)
    .first<EligibleIssuanceRow>();
  if (!issuance) {
    return NextResponse.json({ error: "Participation émise introuvable." }, { status: 404 });
  }
  if (!["sign", "manage"].includes(issuance.mandate)) {
    return NextResponse.json(
      { error: "Un mandat de signature est requis pour déclarer un dividende." },
      { status: 403 }
    );
  }
  if (issuance.companyVerificationStatus !== "verified") {
    return NextResponse.json(
      { error: "L'entreprise doit être vérifiée avant toute distribution." },
      { status: 409 }
    );
  }
  if (recordDate < issuance.issuedAt.slice(0, 10)) {
    return NextResponse.json(
      { error: "La date de référence doit être postérieure à l'émission des titres." },
      { status: 400 }
    );
  }

  const allocationResult = await database
    .prepare(
      `SELECT id, investmentId, investorType, investorId, ownershipMicroPct
       FROM EquityAllocation
       WHERE issuanceId = ? AND status = 'issued'
         AND date(issuedAt) <= date(?)
       ORDER BY createdAt ASC, id ASC`
    )
    .bind(issuance.id, recordDate)
    .all<IssuedAllocationRow>();
  if (allocationResult.results.length === 0) {
    return NextResponse.json(
      { error: "Aucun associé inscrit à la date de référence." },
      { status: 409 }
    );
  }
  const ownershipTotal = allocationResult.results.reduce(
    (sum, row) => sum + Number(row.ownershipMicroPct),
    0
  );
  if (ownershipTotal !== Number(issuance.totalOwnershipMicroPct)) {
    return NextResponse.json(
      { error: "Le registre des participations doit être rapproché avant la distribution." },
      { status: 409 }
    );
  }

  let platformGrossAmount: number;
  let amounts: ReturnType<typeof allocateDividendAmounts>;
  try {
    platformGrossAmount = calculatePlatformDividendPool(
      totalDeclaredAmount,
      ownershipTotal
    );
    amounts = allocateDividendAmounts(
      platformGrossAmount,
      withholdingAmount,
      allocationResult.results.map((row) => ({
        id: row.id,
        ownershipMicroPct: Number(row.ownershipMicroPct),
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Répartition invalide." },
      { status: 400 }
    );
  }

  const netPayableAmount = platformGrossAmount - withholdingAmount;
  const dividendId = crypto.randomUUID();
  const now = isoNow();
  const amountByAllocation = new Map(amounts.map((item) => [item.id, item]));
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT INTO EquityDividend
         (id, issuanceId, projectId, companyId, totalDeclaredAmount,
          platformGrossAmount, withholdingAmount, netPayableAmount, currency,
          recordDate, resolutionRef, resolutionDate, taxReference, status,
          submittedBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'XOF', ?, ?, ?, ?, 'submitted', ?, ?, ?)`
      )
      .bind(
        dividendId,
        issuance.id,
        issuance.projectId,
        issuance.companyId,
        totalDeclaredAmount,
        platformGrossAmount,
        withholdingAmount,
        netPayableAmount,
        recordDate,
        resolutionRef,
        resolutionDate,
        taxReference,
        session.userId,
        now,
        now
      ),
  ];
  allocationResult.results.forEach((allocation) => {
    const amount = amountByAllocation.get(allocation.id);
    if (!amount) throw new Error("Répartition interne incomplète");
    statements.push(
      database
        .prepare(
          `INSERT INTO EquityDividendAllocation
           (id, dividendId, equityAllocationId, investmentId, investorType,
            investorId, ownershipMicroPct, grossAmount, withholdingAmount,
            netAmount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          dividendId,
          allocation.id,
          allocation.investmentId,
          allocation.investorType,
          allocation.investorId,
          allocation.ownershipMicroPct,
          amount.grossAmount,
          amount.withholdingAmount,
          amount.netAmount,
          now,
          now
        )
    );
  });
  statements.push(
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'equity_dividend_submitted', 'equity_dividend', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        dividendId,
        JSON.stringify({
          issuanceId,
          totalDeclaredAmount,
          platformGrossAmount,
          withholdingAmount,
          netPayableAmount,
          recordDate,
          resolutionRef,
        }),
        requestIp(req),
        now
      ),
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         VALUES (?, ?, 'equity_dividend_submitted',
                 'Déclaration de dividende transmise pour contrôle', ?, ?)`
      )
      .bind(crypto.randomUUID(), issuance.projectId, session.userId, now)
  );

  try {
    await database.batch(statements);
  } catch (error) {
    const duplicate = await database
      .prepare(
        `SELECT id FROM EquityDividend
         WHERE issuanceId = ? AND resolutionRef = ? LIMIT 1`
      )
      .bind(issuance.id, resolutionRef)
      .first<{ id: string }>();
    if (duplicate) {
      return NextResponse.json(
        { error: "Cette décision sociale a déjà été enregistrée." },
        { status: 409 }
      );
    }
    console.error(
      "equity_dividend_creation_failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json(
      { error: "La déclaration n'a pas pu être enregistrée." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      dividend: {
        id: dividendId,
        status: "submitted",
        totalDeclaredAmount,
        platformGrossAmount,
        withholdingAmount,
        netPayableAmount,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const capabilities = getPaymentCapabilities();
  const config = getPayDunyaConfig();
  if (!capabilities.collectionsEnabled || !config) {
    return NextResponse.json(
      {
        error:
          "Les paiements par carte et Mobile Money sont en cours d'activation avec un prestataire agréé. Aucun paiement n'a été enregistré.",
        code: "COLLECTIONS_NOT_CONFIGURED",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  const body = await readBody(req);
  const dividendId = body ? textValue(body.dividendId, 160) : null;
  if (!dividendId) {
    return NextResponse.json({ error: "Déclaration invalide." }, { status: 400 });
  }

  const database = getD1();
  const dividend = await database
    .prepare(
      `SELECT d.id, d.projectId, d.companyId, d.netPayableAmount,
              d.status, d.paymentRef, d.resolutionRef,
              p.title AS projectTitle, c.legalName AS companyLegalName,
              c.verificationStatus AS companyVerificationStatus, cm.mandate,
              u.firstName AS userFirstName, u.lastName AS userLastName,
              u.email AS userEmail, u.phone AS userPhone
       FROM EquityDividend d
       JOIN Project p ON p.id = d.projectId
       JOIN Company c ON c.id = d.companyId
       JOIN CompanyMember cm ON cm.companyId = d.companyId AND cm.userId = ?
       JOIN User u ON u.id = cm.userId
       WHERE d.id = ? LIMIT 1`
    )
    .bind(session.userId, dividendId)
    .first<PayableDividendRow>();
  if (!dividend) {
    return NextResponse.json({ error: "Déclaration introuvable." }, { status: 404 });
  }
  if (!["sign", "manage"].includes(dividend.mandate)) {
    return NextResponse.json({ error: "Mandat de paiement requis." }, { status: 403 });
  }
  if (dividend.companyVerificationStatus !== "verified") {
    return NextResponse.json({ error: "Entreprise non vérifiée." }, { status: 409 });
  }
  if (dividend.status === "paid") {
    return NextResponse.json({ error: "Ce dividende est déjà réglé." }, { status: 409 });
  }
  if (!dividend.paymentRef && dividend.status !== "approved") {
    return NextResponse.json(
      { error: "Les contrôles juridique et financier doivent être terminés." },
      { status: 409 }
    );
  }
  if (dividend.paymentRef) {
    return NextResponse.json({
      payment: {
        id: dividend.id,
        status: "ready",
        checkoutUrl: getPayDunyaCheckoutUrl(dividend.paymentRef, config.mode),
        provider: "PayDunya",
        availableMethods: capabilities.collectionMethods,
      },
      idempotent: true,
    });
  }

  const amount = Number(dividend.netPayableAmount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Montant net incohérent." }, { status: 409 });
  }

  try {
    const checkout = await createPayDunyaCheckout(config, {
      amount,
      description: `Dividende ${dividend.resolutionRef} — ${dividend.projectTitle}`,
      itemName: "Distribution de dividendes privés",
      customer: {
        name: `${dividend.userFirstName} ${dividend.userLastName}`.trim(),
        email: dividend.userEmail,
        phone: dividend.userPhone,
      },
      customData: {
        flow: "equity_dividend",
        equityDividendId: dividend.id,
        projectId: dividend.projectId,
        companyId: dividend.companyId,
      },
      callbackUrl: `${config.publicAppUrl}/api/payments/paydunya/webhook`,
      returnUrl: `${config.publicAppUrl}/?payment=dividend-return`,
      cancelUrl: `${config.publicAppUrl}/?payment=dividend-cancelled`,
    });
    const now = isoNow();
    const results = await database.batch([
      database
        .prepare(
          `UPDATE EquityDividend
           SET paymentRef = ?, paymentEventId = NULL,
               status = 'verifying', updatedAt = ?
           WHERE id = ? AND paymentRef IS NULL AND status = 'approved'`
        )
        .bind(checkout.token, now, dividend.id),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'equity_dividend_checkout_created',
                  'equity_dividend', ?, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM EquityDividend
             WHERE id = ? AND paymentRef = ? AND status = 'verifying'
           )`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          dividend.id,
          JSON.stringify({ amount, provider: "paydunya" }),
          requestIp(req),
          now,
          dividend.id,
          checkout.token
        ),
    ]);
    if ((results[0].meta.changes || 0) !== 1) {
      const current = await database
        .prepare(`SELECT paymentRef FROM EquityDividend WHERE id = ? LIMIT 1`)
        .bind(dividend.id)
        .first<{ paymentRef: string | null }>();
      if (!current?.paymentRef) throw new Error("payment_reference_not_stored");
      return NextResponse.json({
        payment: {
          id: dividend.id,
          status: "ready",
          checkoutUrl: getPayDunyaCheckoutUrl(current.paymentRef, config.mode),
          provider: "PayDunya",
          availableMethods: capabilities.collectionMethods,
        },
        idempotent: true,
      });
    }
    return NextResponse.json({
      payment: {
        id: dividend.id,
        status: "ready",
        checkoutUrl: checkout.checkoutUrl,
        provider: "PayDunya",
        availableMethods: capabilities.collectionMethods,
      },
    });
  } catch (error) {
    console.error(
      "equity_dividend_checkout_failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json(
      { error: "Le paiement sécurisé est momentanément indisponible." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function textValue(
  value: unknown,
  maxLength: number,
  optional = false
): string | null {
  if (value === undefined || value === null || value === "") return optional ? null : null;
  if (typeof value !== "string") return null;
  const result = value.trim();
  if (!result) return optional ? null : null;
  return result.length <= maxLength ? result : null;
}

function moneyValue(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

function nonNegativeMoneyValue(value: unknown): number | null {
  const result = value === undefined || value === "" ? 0 : Number(value);
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}

function dateValue(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 24 * 60 * 60 * 1000) return null;
  return new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}
