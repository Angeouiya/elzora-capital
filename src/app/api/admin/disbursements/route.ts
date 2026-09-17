import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { postLedgerEntry, genIdemKey } from "@/lib/ledger";
import { computeUpfrontCommission } from "@/lib/finance";

// ============================================================================
// GET /api/admin/disbursements
// Liste tous les décaissements (toutes sociétés) pour le suivi admin.
// ============================================================================
export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    requirePermission(admin, "disbursement:prepare");
  } catch {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const disbursements = await db.disbursement.findMany({
    include: { project: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ disbursements: ser(disbursements) });
}

// ============================================================================
// POST /api/admin/disbursements
// Body: { projectId, grossAmount, beneficiaryAccount, preparedBy }
// ----------------------------------------------------------------------------
// Prépare un décaissement (statut "pending", approvedBy=null).
// - requireAdmin(req) + requirePermission("disbursement:prepare")
// - Calcule upfrontCommission = computeUpfrontCommission(grossAmount, 6)
// - netAmount = grossAmount - upfrontCommission
// - AuditLog
// ============================================================================
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    requirePermission(admin, "disbursement:prepare");
  } catch {
    return NextResponse.json(
      { error: "Permission refusée: disbursement:prepare" },
      { status: 403 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const projectId = String(body.projectId || "");
  const beneficiaryAccount = String(body.beneficiaryAccount || "");
  const grossAmount = toBigIntSafe(body.grossAmount);
  if (!projectId || !beneficiaryAccount || !grossAmount || grossAmount <= 0n) {
    return NextResponse.json(
      { error: "projectId, beneficiaryAccount et grossAmount requis" },
      { status: 400 }
    );
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { company: true, offer: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  if (project.status !== "funded" && project.status !== "repaying") {
    return NextResponse.json(
      {
        error: `Le projet doit être au statut « funded » ou « repaying » pour décaisser (actuel: ${project.status})`,
      },
      { status: 400 }
    );
  }

  // Idempotence : un décaissement déjà existant pour ce projet ?
  const existing = await db.disbursement.findFirst({
    where: {
      projectId,
      grossAmount,
      status: { in: ["pending", "approved"] },
    },
  });
  if (existing) {
    return NextResponse.json({
      disbursement: ser(existing),
      idempotent: true,
      message: "Un décaissement est déjà en cours pour ce projet.",
    });
  }

  const upfrontCommission = computeUpfrontCommission(grossAmount, 6);
  const netAmount = grossAmount - upfrontCommission;

  const disbursement = await db.disbursement.create({
    data: {
      projectId,
      grossAmount,
      upfrontCommission,
      netAmount,
      beneficiaryAccount,
      trancheNo: 1,
      status: "pending",
      preparedBy: admin.adminId,
      approvedBy: null,
    },
    include: { project: { include: { company: true } } },
  });

  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.adminId,
      action: "disbursement_prepared",
      entityType: "disbursement",
      entityId: disbursement.id,
      metadata: JSON.stringify({
        projectId,
        grossAmount: grossAmount.toString(),
        upfrontCommission: upfrontCommission.toString(),
        netAmount: netAmount.toString(),
        beneficiaryAccount,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({ disbursement: ser(disbursement) }, { status: 201 });
}

// ============================================================================
// PATCH /api/admin/disbursements
// Body: { disbursementId, action: "approve" | "execute", approvedBy }
// ----------------------------------------------------------------------------
// - "approve": requirePermission("disbursement:approve")
//   Vérifie que disbursement.preparedBy !== admin.id (séparation des devoirs)
// - "execute": requirePermission("disbursement:execute")
//   Vérifie que approvedBy est défini
//   Ledger: escrow → company_payout (netAmount) + escrow → platform_revenue (upfront)
// ============================================================================
export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const disbursementId = String(body.disbursementId || "");
  const action = String(body.action || "");
  if (!disbursementId || !["approve", "execute"].includes(action)) {
    return NextResponse.json(
      { error: "disbursementId et action (approve|execute) requis" },
      { status: 400 }
    );
  }

  // Permission check
  try {
    requirePermission(
      admin,
      action === "approve" ? "disbursement:approve" : "disbursement:execute"
    );
  } catch {
    return NextResponse.json(
      { error: `Permission refusée: disbursement:${action}` },
      { status: 403 }
    );
  }

  const disbursement = await db.disbursement.findUnique({
    where: { id: disbursementId },
    include: { project: { include: { company: true, offer: true } } },
  });
  if (!disbursement) {
    return NextResponse.json(
      { error: "Décaissement introuvable" },
      { status: 404 }
    );
  }

  if (action === "approve") {
    // Séparation des devoirs : le préparateur ne peut pas approuver
    if (disbursement.preparedBy === admin.adminId) {
      return NextResponse.json(
        { error: "Le préparateur ne peut pas approuver son propre décaissement" },
        { status: 403 }
      );
    }
    if (disbursement.status !== "pending") {
      return NextResponse.json(
        { error: `Décaissement déjà traité (statut: ${disbursement.status})` },
        { status: 400 }
      );
    }

    // Idempotence : déjà approuvé
    if (disbursement.approvedBy) {
      return NextResponse.json({
        disbursement: ser(disbursement),
        idempotent: true,
      });
    }

    const updated = await db.disbursement.update({
      where: { id: disbursementId },
      data: { approvedBy: admin.adminId },
      include: { project: { include: { company: true, offer: true } } },
    });

    await db.auditLog.create({
      data: {
        actorType: "admin",
        actorId: admin.adminId,
        action: "disbursement_approved",
        entityType: "disbursement",
        entityId: disbursement.id,
        metadata: JSON.stringify({
          preparedBy: disbursement.preparedBy,
          approvedBy: admin.adminId,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ disbursement: ser(updated) });
  }

  // action === "execute"
  if (!disbursement.approvedBy) {
    return NextResponse.json(
      { error: "Le décaissement doit être approuvé avant exécution" },
      { status: 400 }
    );
  }
  if (disbursement.status === "executed") {
    return NextResponse.json({
      disbursement: ser(disbursement),
      idempotent: true,
    });
  }

  const paymentRef = genIdemKey("disb", disbursement.id);
  const now = new Date();

  const updated = await db.disbursement.update({
    where: { id: disbursementId },
    data: {
      status: "executed",
      executedAt: now,
      paymentRef,
    },
    include: { project: { include: { company: true, offer: true } } },
  });

  // Ledger : escrow → company_payout (netAmount)
  //          + escrow → platform_revenue (upfrontCommission)
  const offerId = disbursement.project.offer?.id || disbursement.projectId;
  const companyId = disbursement.project.companyId;
  const escrowIdem = genIdemKey("disb-pay", disbursement.id);
  await postLedgerEntry(
    {
      accountType: "escrow",
      accountId: offerId,
      amount: disbursement.netAmount,
      counterpartyType: "company_payout",
      counterpartyId: companyId,
      sourceType: "disbursement",
      sourceId: disbursement.id,
      description: `Décaissement net entreprise - ${disbursement.id}`,
      idemKey: escrowIdem,
    },
    {
      accountType: "company_payout",
      accountId: companyId,
      amount: disbursement.netAmount,
      counterpartyType: "escrow",
      counterpartyId: offerId,
      sourceType: "disbursement",
      sourceId: disbursement.id,
      description: `Capital net reçu (après commission upfront) - décaissement ${disbursement.id}`,
      idemKey: escrowIdem + ":credit",
    }
  );

  const revIdem = genIdemKey("disb-rev", disbursement.id);
  await postLedgerEntry(
    {
      accountType: "escrow",
      accountId: offerId,
      amount: disbursement.upfrontCommission,
      counterpartyType: "platform_revenue",
      counterpartyId: "platform",
      sourceType: "disbursement",
      sourceId: disbursement.id,
      description: `Commission upfront prélevée - ${disbursement.id}`,
      idemKey: revIdem,
    },
    {
      accountType: "platform_revenue",
      accountId: "platform",
      amount: disbursement.upfrontCommission,
      counterpartyType: "escrow",
      counterpartyId: offerId,
      sourceType: "disbursement",
      sourceId: disbursement.id,
      description: `Commission upfront encaissée - décaissement ${disbursement.id}`,
      idemKey: revIdem + ":credit",
    }
  );

  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.adminId,
      action: "disbursement_executed",
      entityType: "disbursement",
      entityId: disbursement.id,
      metadata: JSON.stringify({
        netAmount: disbursement.netAmount.toString(),
        upfrontCommission: disbursement.upfrontCommission.toString(),
        paymentRef,
        approvedBy: disbursement.approvedBy,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // Notification au soumetteur du projet
  await db.notification.create({
    data: {
      userId: disbursement.project.submittedBy,
      type: "payment",
      title: "Décaissement effectué",
      message: `Le décaissement net de ${disbursement.netAmount} FCFA a été effectué sur votre compte (${disbursement.beneficiaryAccount}).`,
      actionUrl: "company_dashboard",
    },
  });

  return NextResponse.json({ disbursement: ser(updated) });
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
