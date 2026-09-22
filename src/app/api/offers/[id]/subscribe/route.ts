import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { computeInvestorInterest } from "@/lib/finance";

interface OfferTermsRow {
  id: string;
  projectId: string;
  status: string;
  visibility: string;
  closingDate: string;
  fundingGoal: number;
  committedAmount: number;
  minInvestment: number;
  maxInvestment: number | null;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  instrumentType: string;
  title: string;
}

interface InvestorRow {
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: string;
}

interface InvestmentRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  projectId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  paymentConfirmedAt: string | null;
  reflectionEndsAt: string | null;
  refundableUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

async function findOffer(id: string): Promise<OfferTermsRow | null> {
  return getD1()
    .prepare(
      `SELECT o.id, o.projectId, o.status, o.visibility, o.closingDate,
              o.fundingGoal, o.committedAmount, o.minInvestment, o.maxInvestment,
              o.annualRate, o.ratePeriod, o.durationMonths,
              p.instrumentType, p.title
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       WHERE o.id = ? LIMIT 1`
    )
    .bind(id)
    .first<OfferTermsRow>();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const amount = parseMoney(req.nextUrl.searchParams.get("amount"));
  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const offer = await findOffer(id);
  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const sharePct = offer.fundingGoal > 0 ? (amount * 100) / offer.fundingGoal : 0;
  if (offer.instrumentType === "debt") {
    const interest = computeInvestorInterest(
      BigInt(amount),
      offer.annualRate || 0,
      offer.ratePeriod === "annual" ? "annual" : "total",
      offer.durationMonths || 0
    );
    return NextResponse.json({
      instrument: "debt",
      sharePct,
      expectedRepayment: amount + Number(interest),
      investorInterest: Number(interest),
      projectionLabel: "Projection contractuelle, sous réserve de remboursement par l'entreprise",
    });
  }

  return NextResponse.json({
    instrument: "equity",
    sharePct,
    note: "La valeur et la liquidité des titres ne sont pas garanties.",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const amount = parseMoney(body.amount);
  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const { id } = await params;
  const database = getD1();
  const [offer, investor] = await Promise.all([
    findOffer(id),
    database
      .prepare(`SELECT firstName, lastName, email, kycStatus FROM User WHERE id = ? LIMIT 1`)
      .bind(session.userId)
      .first<InvestorRow>(),
  ]);

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!investor) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (investor.kycStatus !== "verified") {
    return NextResponse.json(
      {
        error: "Vérification d'identité requise",
        code: "KYC_REQUIRED",
        message: "Finalisez la vérification de votre identité avant de souscrire.",
      },
      { status: 403 }
    );
  }
  if (offer.status !== "open" || new Date(offer.closingDate).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Cette offre n'est plus ouverte" }, { status: 409 });
  }
  if (offer.visibility !== "public") {
    return NextResponse.json({ error: "Accès restreint à cette offre" }, { status: 403 });
  }
  if (amount < Number(offer.minInvestment)) {
    return NextResponse.json(
      { error: `Montant minimum : ${Number(offer.minInvestment).toLocaleString("fr-FR")} FCFA` },
      { status: 400 }
    );
  }
  if (offer.maxInvestment !== null && amount > Number(offer.maxInvestment)) {
    return NextResponse.json(
      { error: `Montant maximum : ${Number(offer.maxInvestment).toLocaleString("fr-FR")} FCFA` },
      { status: 400 }
    );
  }

  const existing = await database
    .prepare(
      `SELECT * FROM Investment
       WHERE offerId = ? AND investorId = ? AND status = 'pending_payment'
       LIMIT 1`
    )
    .bind(id, session.userId)
    .first<InvestmentRow>();
  if (existing) return pendingResponse(existing, true);

  const investmentId = crypto.randomUUID();
  const now = isoNow();
  const reflectionEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const sharePct = offer.fundingGoal > 0 ? (amount * 100) / offer.fundingGoal : 0;
  const investorName = `${investor.firstName} ${investor.lastName}`.trim();

  try {
    const results = await database.batch([
      database
        .prepare(
          `INSERT INTO Investment
             (id, offerId, projectId, investorType, investorId, investorName, investorEmail,
              amount, sharePct, status, reflectionEndsAt, refundableUntil, createdAt, updatedAt)
           SELECT ?, o.id, o.projectId, 'individual', ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?
           FROM Offer o
           WHERE o.id = ?
             AND o.status = 'open'
             AND o.visibility = 'public'
             AND datetime(o.closingDate) > datetime(?)
             AND o.committedAmount + ? <= o.fundingGoal`
        )
        .bind(
          investmentId,
          session.userId,
          investorName,
          investor.email,
          amount,
          sharePct,
          reflectionEndsAt,
          reflectionEndsAt,
          now,
          now,
          id,
          now,
          amount
        ),
      database
        .prepare(
          `UPDATE Offer SET committedAmount = committedAmount + ?
           WHERE id = ? AND EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(amount, id, investmentId),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'investment_subscribed', 'investment', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          investmentId,
          JSON.stringify({ offerId: id, amount, sharePct, paymentStatus: "awaiting_provider" }),
          requestIp(req),
          now,
          investmentId
        ),
      database
        .prepare(
          `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
           SELECT ?, ?, 'investment', 'Souscription enregistrée', ?, 0, 'investor_dashboard', ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          `Votre engagement de ${amount.toLocaleString("fr-FR")} FCFA pour « ${offer.title} » est en attente de paiement.`,
          now,
          investmentId
        ),
    ]);

    if ((results[0].meta.changes || 0) !== 1) {
      return NextResponse.json({ error: "Montant indisponible ou offre clôturée" }, { status: 409 });
    }
  } catch (error) {
    const concurrent = await database
      .prepare(
        `SELECT * FROM Investment
         WHERE offerId = ? AND investorId = ? AND status = 'pending_payment'
         LIMIT 1`
      )
      .bind(id, session.userId)
      .first<InvestmentRow>();
    if (concurrent) return pendingResponse(concurrent, true);
    console.error("investment_subscribe_failed", error);
    return NextResponse.json({ error: "Souscription temporairement indisponible" }, { status: 503 });
  }

  const investment = await database
    .prepare(`SELECT * FROM Investment WHERE id = ? LIMIT 1`)
    .bind(investmentId)
    .first<InvestmentRow>();
  if (!investment) {
    return NextResponse.json({ error: "Souscription non enregistrée" }, { status: 503 });
  }
  return pendingResponse(investment, false);
}

function pendingResponse(investment: InvestmentRow, idempotent: boolean) {
  return NextResponse.json(
    {
      investment: normalizeInvestment(investment),
      idempotent,
      payment: {
        status: "awaiting_provider",
        availableMethods: [],
        message:
          "Votre engagement est enregistré. Le paiement sera proposé après activation du prestataire carte et Mobile Money.",
      },
      nextSteps: [
        "Lire le récapitulatif et les risques",
        "Signer les documents de souscription",
        "Régler via un prestataire de paiement habilité",
        "Recevoir la confirmation automatique des fonds",
      ],
    },
    { status: idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } }
  );
}

function normalizeInvestment(row: InvestmentRow) {
  return {
    ...row,
    amount: Number(row.amount),
    sharePct: Number(row.sharePct),
  };
}

function parseMoney(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isSafeInteger(amount) ? amount : null;
}
