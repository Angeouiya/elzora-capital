import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";
import {
  createPayDunyaCheckout,
  getPayDunyaCheckoutUrl,
  getPayDunyaConfig,
} from "@/lib/payments/paydunya";

interface CompanyPaymentRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  installmentNo: number;
  dueDate: string;
  capitalDue: number;
  interestDue: number;
  followUpFeeDue: number;
  totalDue: number;
  status: string;
  paidAt: string | null;
  paidAmount: number;
  remaining: number;
  paymentRef: string | null;
  createdAt: string;
}

interface ProjectRow extends Record<string, unknown> {
  id: string;
  title: string;
  companyId: string;
}

interface PayableCompanyPaymentRow extends CompanyPaymentRow {
  projectTitle: string;
  projectStatus: string;
  companyId: string;
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
  const [payments, projects] = await Promise.all([
    database
      .prepare(
        `SELECT cp.id, cp.projectId, cp.installmentNo, cp.dueDate,
                cp.capitalDue, cp.interestDue, cp.followUpFeeDue, cp.totalDue,
                cp.status, cp.paidAt, cp.paidAmount, cp.remaining,
                cp.paymentRef, cp.createdAt
         FROM CompanyPayment cp
         JOIN Project p ON p.id = cp.projectId
         JOIN CompanyMember cm ON cm.companyId = p.companyId
         WHERE cm.userId = ?
         ORDER BY cp.dueDate ASC`
      )
      .bind(session.userId)
      .all<CompanyPaymentRow>(),
    database
      .prepare(
        `SELECT DISTINCT p.id, p.title, p.companyId
         FROM Project p
         JOIN CompanyMember cm ON cm.companyId = p.companyId
         WHERE cm.userId = ?
         ORDER BY p.createdAt DESC`
      )
      .bind(session.userId)
      .all<ProjectRow>(),
  ]);

  return NextResponse.json(
    {
      payments: payments.results,
      projects: projects.results,
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const paymentId = String(body.paymentId || "").trim();
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(paymentId)) {
    return NextResponse.json({ error: "Échéance invalide" }, { status: 400 });
  }

  const database = getD1();
  const payment = await database
    .prepare(
      `SELECT cp.id, cp.projectId, cp.installmentNo, cp.dueDate,
              cp.capitalDue, cp.interestDue, cp.followUpFeeDue, cp.totalDue,
              cp.status, cp.paidAt, cp.paidAmount, cp.remaining,
              cp.paymentRef, cp.createdAt,
              p.title AS projectTitle, p.status AS projectStatus, p.companyId,
              c.legalName AS companyLegalName,
              c.verificationStatus AS companyVerificationStatus, cm.mandate,
              u.firstName AS userFirstName, u.lastName AS userLastName,
              u.email AS userEmail, u.phone AS userPhone
       FROM CompanyPayment cp
       JOIN Project p ON p.id = cp.projectId
       JOIN Company c ON c.id = p.companyId
       JOIN CompanyMember cm ON cm.companyId = p.companyId AND cm.userId = ?
       JOIN User u ON u.id = cm.userId
       WHERE cp.id = ? LIMIT 1`
    )
    .bind(session.userId, paymentId)
    .first<PayableCompanyPaymentRow>();

  if (!payment) {
    return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  }
  if (!['manage', 'sign'].includes(payment.mandate)) {
    return NextResponse.json(
      { error: "Vous n'avez pas le mandat requis pour régler cette échéance." },
      { status: 403 }
    );
  }
  if (
    payment.companyVerificationStatus !== "verified" ||
    !['funded', 'repaying'].includes(payment.projectStatus)
  ) {
    return NextResponse.json(
      { error: "Le financement et l'entreprise doivent être validés avant tout règlement." },
      { status: 409 }
    );
  }
  if (payment.status === "paid") {
    return NextResponse.json({ error: "Cette échéance est déjà réglée." }, { status: 409 });
  }
  if (!['upcoming', 'due', 'late', 'partial', 'verifying'].includes(payment.status)) {
    return NextResponse.json({ error: "Cette échéance ne peut pas être réglée." }, { status: 409 });
  }

  if (payment.paymentRef) {
    return NextResponse.json({
      payment: {
        id: payment.id,
        status: "ready",
        checkoutUrl: getPayDunyaCheckoutUrl(payment.paymentRef, config.mode),
        availableMethods: capabilities.collectionMethods,
        provider: "PayDunya",
      },
      idempotent: true,
    });
  }

  const amount = Number(payment.remaining) > 0
    ? Number(payment.remaining)
    : Number(payment.totalDue) - Number(payment.paidAmount || 0);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Montant restant incohérent." }, { status: 409 });
  }

  try {
    const checkout = await createPayDunyaCheckout(config, {
      amount,
      description: `Échéance n°${payment.installmentNo} — ${payment.projectTitle}`,
      itemName: "Remboursement de financement privé",
      customer: {
        name: `${payment.userFirstName} ${payment.userLastName}`.trim(),
        email: payment.userEmail,
        phone: payment.userPhone,
      },
      customData: {
        flow: "company_payment",
        companyPaymentId: payment.id,
        projectId: payment.projectId,
        companyId: payment.companyId,
      },
      callbackUrl: `${config.publicAppUrl}/api/payments/paydunya/webhook`,
      returnUrl: `${config.publicAppUrl}/?payment=company-return`,
      cancelUrl: `${config.publicAppUrl}/?payment=company-cancelled`,
    });

    const now = isoNow();
    await database.batch([
      database
        .prepare(
          `UPDATE CompanyPayment
           SET paymentRef = ?, paymentEventId = NULL, status = 'verifying'
           WHERE id = ? AND paymentRef IS NULL
             AND status IN ('upcoming', 'due', 'late', 'partial')`
        )
        .bind(checkout.token, payment.id),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'company_payment_checkout_created',
                  'company_payment', ?, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM CompanyPayment WHERE id = ? AND paymentRef = ?
           )`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          payment.id,
          JSON.stringify({ projectId: payment.projectId, amount, provider: "paydunya" }),
          requestIp(req),
          now,
          payment.id,
          checkout.token
        ),
    ]);

    const stored = await database
      .prepare(`SELECT paymentRef FROM CompanyPayment WHERE id = ? LIMIT 1`)
      .bind(payment.id)
      .first<{ paymentRef: string | null }>();
    if (!stored?.paymentRef) throw new Error("payment_reference_not_stored");

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: "ready",
        checkoutUrl:
          stored.paymentRef === checkout.token
            ? checkout.checkoutUrl
            : getPayDunyaCheckoutUrl(stored.paymentRef, config.mode),
        availableMethods: capabilities.collectionMethods,
        provider: "PayDunya",
      },
      idempotent: stored.paymentRef !== checkout.token,
    });
  } catch (error) {
    console.error(
      "company_payment_checkout_failed",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json(
      { error: "Le paiement sécurisé est momentanément indisponible." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
