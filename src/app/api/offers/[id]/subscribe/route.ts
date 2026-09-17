import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { postLedgerEntry, genIdemKey } from "@/lib/ledger";

// ============================================================================
// GET /api/offers/[id]/subscribe?amount=...
// ----------------------------------------------------------------------------
// Simulateur d'investissement (inchangé côté client).
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const amount = Number(req.nextUrl.searchParams.get("amount") || "0");

  const offer = await db.offer.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!offer)
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const sharePct =
    offer.fundingGoal > 0n
      ? Number((BigInt(amount) * 10000n) / offer.fundingGoal) / 100
      : 0;

  // Pour la dette : on simule le remboursement pro-rata (en mode "attendu")
  if (offer.project.instrumentType === "debt") {
    const annualRate = offer.annualRate || 0;
    const months = offer.durationMonths || 0;
    let interest = 0n;
    if ((offer.ratePeriod || "total") === "total") {
      interest = (BigInt(amount) * BigInt(Math.round(annualRate * 100))) / 10000n;
    } else {
      interest =
        (BigInt(amount) * BigInt(Math.round(annualRate * 100)) * BigInt(months)) /
        (10000n * 12n);
    }
    return NextResponse.json(
      ser({
        instrument: "debt",
        sharePct,
        expectedRepayment: BigInt(amount) + interest,
        investorInterest: interest,
      })
    );
  }

  return NextResponse.json(
    ser({
      instrument: "equity",
      sharePct,
      note: "Aucun échéancier de remboursement pour les actions. Sortie envisagée à terme, non garantie.",
    })
  );
}

// ============================================================================
// POST /api/offers/[id]/subscribe
// ----------------------------------------------------------------------------
// Body: { amount, investorName, investorEmail, investorId, investorType }
//
// - requireUser(req) → 401 si non connecté
// - offer.status === "open" && closingDate > now
// - amount >= minInvestment && <= maxInvestment
// - amount <= (fundingGoal - committedAmount)  ← committed, pas raised
// - Idempotence : si l'utilisateur a déjà une souscription pending_payment
//   sur cette offre → on retourne l'existante (pas de doublon)
// - Création Investment (status="pending_payment")
// - Incrément atomic Offer.committedAmount
// - Ledger: investor_external → investor_locked (réservation des fonds)
// - AuditLog
// ============================================================================
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

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const amount = toBigIntSafe(body.amount);
  if (!amount || amount <= 0n) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const offer = await db.offer.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!offer)
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  // Vérification ouverture
  if (offer.status !== "open") {
    return NextResponse.json({ error: "Offre non ouverte" }, { status: 400 });
  }
  if (new Date(offer.closingDate).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Offre clôturée" }, { status: 400 });
  }

  // Vérification montant
  if (amount < offer.minInvestment) {
    return NextResponse.json(
      { error: `Montant minimum : ${offer.minInvestment} FCFA` },
      { status: 400 }
    );
  }
  if (offer.maxInvestment && amount > offer.maxInvestment) {
    return NextResponse.json(
      { error: `Montant maximum : ${offer.maxInvestment} FCFA` },
      { status: 400 }
    );
  }

  // Disponibilité = fundingGoal - committedAmount (committed inclut pending)
  const remaining = offer.fundingGoal - offer.committedAmount;
  if (amount > remaining) {
    return NextResponse.json(
      { error: "Disponibilité insuffisante" },
      { status: 400 }
    );
  }

  // IDEMPOTENCE : l'utilisateur a-t-il déjà une souscription pending_payment ?
  const existing = await db.investment.findFirst({
    where: {
      offerId: offer.id,
      investorId: session.userId,
      status: "pending_payment",
    },
  });
  if (existing) {
    return NextResponse.json({
      investment: ser(existing),
      idempotent: true,
      demoNotice:
        "Vous avez déjà une souscription en attente de paiement sur cette offre.",
      nextSteps: ["Confirmer le paiement via l'interface dédiée."],
    });
  }

  const sharePct =
    offer.fundingGoal > 0n
      ? Number((amount * 10000n) / offer.fundingGoal) / 100
      : 0;

  const reflectionEnds = new Date();
  reflectionEnds.setDate(reflectionEnds.getDate() + 14);

  // Création atomique + incrément committedAmount
  const investment = await db.$transaction(async (tx) => {
    const inv = await tx.investment.create({
      data: {
        offerId: offer.id,
        projectId: offer.project.id,
        investorType: body.investorType || "individual",
        investorId: session.userId, // TOUJOURS depuis la session, jamais du body
        investorName:
          body.investorName || `${session.email}`,
        investorEmail: session.email, // TOUJOURS depuis la session
        amount,
        sharePct,
        status: "pending_payment",
        reflectionEndsAt: reflectionEnds,
        refundableUntil: reflectionEnds,
      },
    });

    // Incrément atomique du committedAmount
    await tx.offer.update({
      where: { id: offer.id },
      data: { committedAmount: { increment: amount } },
    });

    return inv;
  });

  // Ledger : investor_external → investor_locked (réservation)
  const idemKey = genIdemKey("sub", investment.id);
  await postLedgerEntry(
    {
      accountType: "investor_external",
      accountId: session.userId,
      amount,
      counterpartyType: "investor_locked",
      counterpartyId: session.userId,
      sourceType: "investment",
      sourceId: investment.id,
      description: `Réservation fonds - souscription ${investment.id}`,
      idemKey,
    },
    {
      accountType: "investor_locked",
      accountId: session.userId,
      amount,
      counterpartyType: "investor_external",
      counterpartyId: session.userId,
      sourceType: "investment",
      sourceId: investment.id,
      description: `Fonds réservés - souscription ${investment.id}`,
      idemKey: idemKey + ":credit",
    }
  );

  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: "investment_subscribed",
      entityType: "investment",
      entityId: investment.id,
      metadata: JSON.stringify({
        offerId: offer.id,
        amount: amount.toString(),
        sharePct,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // ⚠️ MODE DÉMONSTRATION : pas de paiement réel
  return NextResponse.json({
    investment: ser(investment),
    demoNotice:
      "Mode démonstration. Aucun paiement réel n'est traité. " +
      "La mise en production nécessite un prestataire de paiement habilité " +
      "(validation contractuelle et réglementaire requise).",
    nextSteps: [
      "Présentation du récapitulatif et des risques",
      "Signature électronique du contrat",
      "Paiement via prestataire habilité (virement ou Mobile Money)",
      "Confirmation serveur de la réception des fonds",
    ],
  });
}

function toBigIntSafe(v: unknown): bigint | null {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isInteger(v)) return null;
    return BigInt(v);
  }
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return BigInt(n);
  }
  return null;
}
