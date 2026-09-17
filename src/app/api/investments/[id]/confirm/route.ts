import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { postLedgerEntry, genIdemKey } from "@/lib/ledger";

// ============================================================================
// POST /api/investments/[id]/confirm
// ----------------------------------------------------------------------------
// ⚠️ MODE DÉMONSTRATION : cet endpoint est appelé par l'investisseur lui-même
// pour SIMULER le webhook d'un prestataire de paiement habilité.
// EN PRODUCTION : cet endpoint ne doit être appelé QUE par le prestataire de
// paiement, avec un webhook signé (HMAC) et une vérification de l'origine.
//
// - Vérifie que l'investissement existe et est "pending_payment"
// - Idempotence : si déjà confirmé → retourne l'existante
// - Update Investment: status="confirmed", paymentConfirmedAt, paymentRef
// - Incrément Offer.raisedAmount (≠ committedAmount) + backersCount
// - Ledger: investor_locked → escrow (les fonds entrent au séquestre)
// - Si raisedAmount >= fundingGoal → offer.status="funded",
//   project.status="funded", project.fundedAt=now
// - ProjectEvent + AuditLog + Notification
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
  const investment = await db.investment.findUnique({
    where: { id },
    include: { offer: { include: { project: true } } },
  });
  if (!investment) {
    return NextResponse.json(
      { error: "Investissement introuvable" },
      { status: 404 }
    );
  }

  // En démo : seul l'investisseur propriétaire peut confirmer (simule le webhook).
  // En production : pas de vérification de session mais vérification HMAC du webhook.
  if (investment.investorId !== session.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas confirmer cet investissement" },
      { status: 403 }
    );
  }

  // Idempotence : déjà confirmé ?
  if (investment.status === "confirmed") {
    return NextResponse.json({
      investment: ser(investment),
      idempotent: true,
      message: "Investissement déjà confirmé",
    });
  }

  if (investment.status !== "pending_payment") {
    return NextResponse.json(
      {
        error: `Investissement non confirmable au statut « ${investment.status} »`,
      },
      { status: 400 }
    );
  }

  const paymentRef = genIdemKey("pay", investment.id);
  const now = new Date();

  // Transaction atomique : update investment + incrément offer.raisedAmount + backersCount
  const result = await db.$transaction(async (tx) => {
    const updatedInv = await tx.investment.update({
      where: { id: investment.id },
      data: {
        status: "confirmed",
        paymentConfirmedAt: now,
        paymentRef,
        signedAt: investment.signedAt || now,
      },
      include: { offer: { include: { project: true } } },
    });

    const offer = await tx.offer.update({
      where: { id: investment.offerId },
      data: {
        raisedAmount: { increment: investment.amount },
        backersCount: { increment: 1 },
      },
      include: { project: true },
    });

    return { investment: updatedInv, offer };
  });

  // Ledger : investor_locked → escrow (fonds au séquestre)
  const ledgerIdem = genIdemKey("pay-ledger", investment.id);
  await postLedgerEntry(
    {
      accountType: "investor_locked",
      accountId: session.userId,
      amount: investment.amount,
      counterpartyType: "escrow",
      counterpartyId: result.offer.id,
      sourceType: "investment",
      sourceId: investment.id,
      description: `Confirmation paiement - investissement ${investment.id}`,
      idemKey: ledgerIdem,
    },
    {
      accountType: "escrow",
      accountId: result.offer.id,
      amount: investment.amount,
      counterpartyType: "investor_locked",
      counterpartyId: session.userId,
      sourceType: "investment",
      sourceId: investment.id,
      description: `Fonds reçus au séquestre - investissement ${investment.id}`,
      idemKey: ledgerIdem + ":credit",
    }
  );

  // Si raisedAmount >= fundingGoal → funded
  if (result.offer.raisedAmount >= result.offer.fundingGoal) {
    await db.offer.update({
      where: { id: result.offer.id },
      data: { status: "funded" },
    });
    await db.project.update({
      where: { id: result.offer.projectId },
      data: { status: "funded", fundedAt: now },
    });
    await db.projectEvent.create({
      data: {
        projectId: result.offer.projectId,
        eventType: "funded",
        description: `Objectif de financement atteint (${result.offer.raisedAmount} FCFA).`,
        actor: "system",
      },
    });
  }

  // ProjectEvent : investment_confirmed
  await db.projectEvent.create({
    data: {
      projectId: result.offer.projectId,
      eventType: "investment_confirmed",
      description: `Investissement confirmé : ${investment.amount} FCFA par ${session.email}`,
      actor: session.userId,
    },
  });

  // AuditLog
  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: "investment_confirmed",
      entityType: "investment",
      entityId: investment.id,
      metadata: JSON.stringify({
        offerId: result.offer.id,
        amount: investment.amount.toString(),
        paymentRef,
      }),
    },
  });

  // Notification à l'investisseur
  await db.notification.create({
    data: {
      userId: session.userId,
      type: "payment",
      title: "Investissement confirmé",
      message: `Votre investissement de ${investment.amount} FCFA sur « ${result.offer.project.title} » est confirmé.`,
      actionUrl: "investor_dashboard",
    },
  });

  return NextResponse.json({
    investment: ser(result.investment),
    offer: ser(result.offer),
    demoNotice:
      "Mode démonstration : la confirmation a été simulée côté serveur. " +
      "En production, ce webhook serait déclenché par le prestataire de paiement " +
      "habilité après vérification de la réception des fonds.",
  });
}
