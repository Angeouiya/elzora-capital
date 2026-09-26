import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { getCancellationEligibility } from "@/lib/investment-cancellation";

interface InvestmentCancellationRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  investorId: string;
  amount: number;
  status: string;
  paymentRef: string | null;
  reflectionEndsAt: string | null;
  cancellationEventId: string | null;
  cancelledAt: string | null;
  projectTitle: string;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const { id } = await params;
  const database = getD1();
  const investment = await findInvestment(database, id, session.userId);
  if (!investment) {
    return NextResponse.json({ error: "Engagement introuvable" }, { status: 404, headers: noStore });
  }

  if (investment.status === "cancelled") {
    return NextResponse.json(
      {
        cancelled: true,
        idempotent: true,
        investment: cancellationResult(investment),
      },
      { headers: noStore }
    );
  }

  const eligibility = getCancellationEligibility(investment);
  if (!eligibility.allowed) {
    return NextResponse.json(
      {
        error: cancellationError(eligibility.code),
        code: eligibility.code,
        deadline: eligibility.deadline,
      },
      { status: 409, headers: noStore }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = String(body.reason || "withdrawn_during_reflection")
    .trim()
    .slice(0, 240) || "withdrawn_during_reflection";
  const now = isoNow();
  const eventId = crypto.randomUUID();
  const amount = Number(investment.amount);

  const results = await database.batch([
    database
      .prepare(
        `UPDATE Investment
         SET status = 'cancelled', cancellationEventId = ?, cancelledAt = ?,
             cancellationReason = ?, updatedAt = ?
         WHERE id = ? AND investorId = ?
           AND status IN ('pending_payment', 'payment_pending')
           AND paymentRef IS NULL
           AND reflectionEndsAt IS NOT NULL
           AND datetime(reflectionEndsAt) >= datetime(?)`
      )
      .bind(eventId, now, reason, now, id, session.userId, now),
    database
      .prepare(
        `UPDATE Offer SET committedAmount = MAX(0, committedAmount - ?)
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM Investment
           WHERE id = ? AND cancellationEventId = ? AND status = 'cancelled'
         )`
      )
      .bind(amount, investment.offerId, id, eventId),
    database
      .prepare(
        `UPDATE PaymentAttempt SET status = 'cancelled', updatedAt = ?
         WHERE investmentId = ? AND EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND cancellationEventId = ? AND status = 'cancelled'
         )`
      )
      .bind(now, id, id, eventId),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'user', ?, 'investment_cancelled_during_reflection',
                'investment', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND cancellationEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        id,
        JSON.stringify({ offerId: investment.offerId, amount, reason }),
        requestIp(req),
        now,
        id,
        eventId
      ),
    database
      .prepare(
        `INSERT INTO Notification
           (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT ?, ?, 'investment', 'Engagement annulé', ?, 0,
                'investor_dashboard', ?
         WHERE EXISTS (
           SELECT 1 FROM Investment WHERE id = ? AND cancellationEventId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        `Votre engagement pour « ${investment.projectTitle} » a été annulé avant paiement. Aucun fonds n'a été débité.`,
        now,
        id,
        eventId
      ),
  ]);

  if ((results[0].meta.changes || 0) !== 1) {
    const current = await findInvestment(database, id, session.userId);
    if (current?.status === "cancelled") {
      return NextResponse.json(
        { cancelled: true, idempotent: true, investment: cancellationResult(current) },
        { headers: noStore }
      );
    }
    const currentEligibility = current
      ? getCancellationEligibility(current)
      : { allowed: false as const, code: "STATUS_NOT_ELIGIBLE" as const, deadline: null };
    return NextResponse.json(
      {
        error: cancellationError(currentEligibility.code),
        code: currentEligibility.code,
        deadline: currentEligibility.deadline,
      },
      { status: 409, headers: noStore }
    );
  }

  const cancelled = await findInvestment(database, id, session.userId);
  return NextResponse.json(
    {
      cancelled: true,
      idempotent: false,
      investment: cancelled ? cancellationResult(cancelled) : { id, status: "cancelled", cancelledAt: now },
    },
    { headers: noStore }
  );
}

async function findInvestment(
  database: ReturnType<typeof getD1>,
  id: string,
  userId: string
) {
  return database
    .prepare(
      `SELECT i.id, i.offerId, i.investorId, i.amount, i.status, i.paymentRef,
              i.reflectionEndsAt, i.cancellationEventId, i.cancelledAt,
              p.title AS projectTitle
       FROM Investment i
       JOIN Project p ON p.id = i.projectId
       WHERE i.id = ? AND i.investorId = ? LIMIT 1`
    )
    .bind(id, userId)
    .first<InvestmentCancellationRow>();
}

function cancellationResult(investment: InvestmentCancellationRow) {
  return {
    id: investment.id,
    status: investment.status,
    cancelledAt: investment.cancelledAt,
    amount: Number(investment.amount),
    offerId: investment.offerId,
  };
}

function cancellationError(code: string): string {
  switch (code) {
    case "PAYMENT_IN_PROGRESS":
      return "Le paiement est déjà en cours. Utilisez l'annulation proposée sur la page de paiement ou contactez l'équipe.";
    case "PAYMENT_CONFIRMED":
      return "Le paiement est déjà confirmé. Une demande de remboursement doit être examinée par l'équipe.";
    case "WINDOW_EXPIRED":
      return "Le délai pour changer d'avis est terminé.";
    case "WINDOW_UNAVAILABLE":
      return "Le délai de réflexion n'est pas disponible pour cet engagement.";
    default:
      return "Cet engagement ne peut plus être annulé depuis votre espace.";
  }
}
