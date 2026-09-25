import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { hashInvitationToken } from "@/lib/private-offer-access";

interface InvitationRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  email: string;
  userId: string | null;
  status: string;
  expiresAt: string;
  projectTitle: string;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json(
      { error: "Connectez-vous pour ouvrir cette invitation.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invitation illisible." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const tokenHash = await hashInvitationToken(token);
  if (!tokenHash) {
    return NextResponse.json({ error: "Cette invitation n’est pas valide." }, { status: 400 });
  }

  const database = getD1();
  const invitation = await database
    .prepare(
      `SELECT i.id, i.offerId, i.email, i.userId, i.status, i.expiresAt,
              p.title AS projectTitle
       FROM PrivateOfferInvitation i
       JOIN Offer o ON o.id = i.offerId
       JOIN Project p ON p.id = o.projectId
       JOIN RegulatoryReview r ON r.projectId = o.projectId
       WHERE i.tokenHash = ?
         AND o.visibility = 'restricted'
         AND o.isDemo = 0
         AND o.status = 'open'
         AND datetime(o.closingDate) > datetime('now')
         AND r.decision = 'cleared'
         AND r.distributionScope = 'restricted_private'
         AND r.marketAuthorityPath IN ('private_route_confirmed', 'authority_clearance')
         AND r.corporateActsStatus = 'confirmed'
         AND r.paymentSafeguardingStatus = 'confirmed'
         AND r.beneficialOwnersStatus = 'confirmed'
         AND r.riskDisclosureStatus = 'confirmed'
         AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
         AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
         AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
         AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
         AND r.countryOpinionRef IS NOT NULL
         AND TRIM(r.countryOpinionRef) <> ''
         AND r.reviewedBy IS NOT NULL
         AND r.reviewedBy <> r.preparedBy
         AND r.reviewedAt IS NOT NULL
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<InvitationRow>();

  if (!invitation || invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Cette invitation a déjà été utilisée ou n’est plus disponible." },
      { status: 409 }
    );
  }
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    await database
      .prepare(
        `UPDATE PrivateOfferInvitation SET status = 'expired', updatedAt = ?
         WHERE id = ? AND status = 'pending'`
      )
      .bind(isoNow(), invitation.id)
      .run();
    return NextResponse.json(
      { error: "Cette invitation a expiré. Demandez un nouvel accès à l’équipe." },
      { status: 410 }
    );
  }
  if (invitation.email !== session.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Cette invitation est réservée à une autre adresse." },
      { status: 403 }
    );
  }

  const now = isoNow();
  const result = await database.batch([
    database
      .prepare(
        `UPDATE PrivateOfferInvitation
         SET status = 'accepted', userId = ?, acceptedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'pending' AND datetime(expiresAt) > datetime(?)`
      )
      .bind(session.userId, now, now, invitation.id, now),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'user', ?, 'private_invitation_accepted', 'private_offer_invitation', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM PrivateOfferInvitation
           WHERE id = ? AND status = 'accepted' AND userId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        invitation.id,
        JSON.stringify({ offerId: invitation.offerId }),
        requestIp(req),
        now,
        invitation.id,
        session.userId
      ),
    database
      .prepare(
        `INSERT INTO Notification
           (id, userId, type, title, message, read, actionUrl, createdAt)
         SELECT ?, ?, 'private_access', 'Accès privé confirmé', ?, 0, 'explore', ?
         WHERE EXISTS (
           SELECT 1 FROM PrivateOfferInvitation
           WHERE id = ? AND status = 'accepted' AND userId = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        `Vous pouvez maintenant consulter « ${invitation.projectTitle} ».`,
        now,
        invitation.id,
        session.userId
      ),
  ]);

  if (!result[0].meta.changes) {
    return NextResponse.json(
      { error: "Cette invitation n’est plus disponible." },
      { status: 409 }
    );
  }
  return NextResponse.json({
    offer: { id: invitation.offerId, title: invitation.projectTitle },
    message: "Votre accès privé est confirmé.",
  });
}
