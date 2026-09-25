import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationDurationDays,
  normalizeInvitationEmail,
  parseInvitationMaximum,
  PRIVATE_INVESTOR_LIMIT,
} from "@/lib/private-offer-access";

interface OfferRow extends Record<string, unknown> {
  id: string;
  visibility: string;
  isDemo: number;
  status: string;
  minInvestment: number;
  maxInvestment: number | null;
  projectTitle: string;
}

interface InvitationRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  email: string;
  userId: string | null;
  status: string;
  maxInvestment: number | null;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const WRITE_ROLES = new Set(["compliance", "legal", "validator", "superadmin"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const database = getD1();
  const offer = await findRestrictedOffer(database, id);
  if (!offer) {
    return NextResponse.json({ error: "Offre privée introuvable." }, { status: 404 });
  }
  const result = await database
    .prepare(
      `SELECT id, offerId, email, userId, status, maxInvestment, invitedBy,
              expiresAt, acceptedAt, createdAt, updatedAt
       FROM PrivateOfferInvitation
       WHERE offerId = ?
       ORDER BY createdAt DESC`
    )
    .bind(id)
    .all<InvitationRow>();

  return NextResponse.json(
    {
      offer: mapOffer(offer),
      invitations: result.results.map(mapInvitation),
      editable: WRITE_ROLES.has(admin.role),
      privateInvestorLimit: PRIVATE_INVESTOR_LIMIT,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!WRITE_ROLES.has(admin.role)) {
    return NextResponse.json(
      { error: "Votre rôle ne permet pas d’ouvrir un accès privé." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Informations illisibles." }, { status: 400 });
  }

  const email = normalizeInvitationEmail(body.email);
  const validityDays = invitationDurationDays(body.validityDays);
  const maxInvestment = parseInvitationMaximum(body.maxInvestment);
  if (!email || validityDays === null || maxInvestment === undefined) {
    return NextResponse.json(
      { error: "Vérifiez l’adresse, la durée et le montant autorisé." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const database = getD1();
  const offer = await findRestrictedOffer(database, id);
  if (!offer) {
    return NextResponse.json({ error: "Offre privée introuvable." }, { status: 404 });
  }
  if (offer.status !== "open") {
    return NextResponse.json(
      { error: "Cette offre n’accepte plus de nouvelles invitations." },
      { status: 409 }
    );
  }
  if (
    maxInvestment !== null &&
    (maxInvestment < Number(offer.minInvestment) ||
      (offer.maxInvestment !== null && maxInvestment > Number(offer.maxInvestment)))
  ) {
    return NextResponse.json(
      { error: "Le montant autorisé doit rester dans les limites de l’offre." },
      { status: 400 }
    );
  }

  const [existing, activeCount, user] = await Promise.all([
    database
      .prepare(
        `SELECT id, status FROM PrivateOfferInvitation
         WHERE offerId = ? AND email = ? AND status IN ('pending', 'accepted')
         ORDER BY createdAt DESC LIMIT 1`
      )
      .bind(id, email)
      .first<{ id: string; status: string }>(),
    database
      .prepare(
        `SELECT COUNT(*) AS count FROM PrivateOfferInvitation
         WHERE offerId = ?
           AND (status = 'accepted' OR (status = 'pending' AND datetime(expiresAt) > datetime('now')))`
      )
      .bind(id)
      .first<{ count: number }>(),
    database.prepare(`SELECT id FROM User WHERE email = ? LIMIT 1`).bind(email).first<{ id: string }>(),
  ]);

  if (existing?.status === "accepted") {
    return NextResponse.json(
      { error: "Cette personne dispose déjà de l’accès privé." },
      { status: 409 }
    );
  }
  if (!existing && Number(activeCount?.count || 0) >= PRIVATE_INVESTOR_LIMIT) {
    return NextResponse.json(
      { error: "Le cercle autorisé a atteint sa limite. Révoquez un accès avant d’en créer un autre." },
      { status: 409 }
    );
  }

  const token = createInvitationToken();
  const tokenHash = await hashInvitationToken(token);
  const now = isoNow();
  const expiresAt = new Date(Date.now() + validityDays * 86_400_000).toISOString();
  const invitationId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];
  if (existing?.status === "pending") {
    statements.push(
      database
        .prepare(
          `UPDATE PrivateOfferInvitation
           SET status = 'revoked', updatedAt = ?
           WHERE id = ? AND status = 'pending'`
        )
        .bind(now, existing.id)
    );
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO PrivateOfferInvitation
           (id, offerId, email, userId, tokenHash, status, maxInvestment,
            invitedBy, expiresAt, acceptedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL, ?, ?)`
      )
      .bind(
        invitationId,
        id,
        email,
        user?.id || null,
        tokenHash,
        maxInvestment,
        admin.adminId,
        expiresAt,
        now,
        now
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'admin', ?, 'private_invitation_created', 'private_offer_invitation', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        invitationId,
        JSON.stringify({ offerId: id, email, expiresAt, maxInvestment }),
        requestIp(req),
        now
      )
  );
  await database.batch(statements);

  return NextResponse.json(
    {
      invitation: {
        id: invitationId,
        email,
        userId: user?.id || null,
        status: "pending",
        maxInvestment,
        expiresAt,
        createdAt: now,
      },
      accessPath: `/?invitation=${encodeURIComponent(token)}`,
    },
    { status: 201 }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!WRITE_ROLES.has(admin.role)) {
    return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Informations illisibles." }, { status: 400 });
  }
  const invitationId = typeof body.invitationId === "string" ? body.invitationId.trim() : "";
  const { id } = await params;
  if (!invitationId) return NextResponse.json({ error: "Invitation introuvable." }, { status: 400 });

  const database = getD1();
  const now = isoNow();
  const result = await database
    .prepare(
      `UPDATE PrivateOfferInvitation
       SET status = 'revoked', updatedAt = ?
       WHERE id = ? AND offerId = ? AND status IN ('pending', 'accepted')`
    )
    .bind(now, invitationId, id)
    .run();
  if (!result.meta.changes) {
    return NextResponse.json({ error: "Cette invitation n’est plus active." }, { status: 409 });
  }

  await database
    .prepare(
      `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       VALUES (?, 'admin', ?, 'private_invitation_revoked', 'private_offer_invitation', ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      admin.adminId,
      invitationId,
      JSON.stringify({ offerId: id }),
      requestIp(req),
      now
    )
    .run();
  return NextResponse.json({ invitation: { id: invitationId, status: "revoked" } });
}

async function findRestrictedOffer(database: D1Database, offerId: string) {
  return database
    .prepare(
      `SELECT o.id, o.visibility, o.isDemo, o.status, o.minInvestment,
              o.maxInvestment, p.title AS projectTitle
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       JOIN RegulatoryReview r ON r.projectId = o.projectId
       WHERE o.id = ?
         AND o.visibility = 'restricted'
         AND o.isDemo = 0
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
         AND r.countryOpinionRef IS NOT NULL AND TRIM(r.countryOpinionRef) <> ''
         AND r.reviewedBy IS NOT NULL
         AND r.reviewedBy <> r.preparedBy
         AND r.reviewedAt IS NOT NULL
       LIMIT 1`
    )
    .bind(offerId)
    .first<OfferRow>();
}

function mapOffer(row: OfferRow) {
  return {
    id: row.id,
    title: row.projectTitle,
    minInvestment: Number(row.minInvestment),
    maxInvestment: row.maxInvestment === null ? null : Number(row.maxInvestment),
  };
}

function mapInvitation(row: InvitationRow) {
  const expired = row.status === "pending" && new Date(row.expiresAt).getTime() <= Date.now();
  return {
    ...row,
    status: expired ? "expired" : row.status,
    maxInvestment: row.maxInvestment === null ? null : Number(row.maxInvestment),
  };
}
