import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { computeUpfrontCommission } from "@/lib/finance";

interface DisbursementRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  grossAmount: number;
  upfrontCommission: number;
  netAmount: number;
  beneficiaryAccount: string;
  trancheNo: number;
  status: string;
  preparedBy: string | null;
  approvedBy: string | null;
  executedAt: string | null;
  paymentRef: string | null;
  createdAt: string;
  projectTitle: string;
  companyId: string;
  companyLegalName: string;
  companyTradeName: string | null;
}

interface ProjectFundingRow extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  companyId: string;
  offerId: string | null;
  raisedAmount: number | null;
  upfrontCommissionPct: number | null;
  verificationStatus: string;
  verifiedBankAccount: string | null;
  bankAccountVerifiedAt: string | null;
}

function hasAnyPermission(admin: SessionAdmin, permissions: string[]): boolean {
  return (
    admin.permissions.includes("all") ||
    permissions.some((permission) => admin.permissions.includes(permission))
  );
}

function maskReference(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (
    !hasAnyPermission(admin, [
      "disbursement:prepare",
      "disbursement:approve",
      "disbursement:execute",
    ])
  ) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const result = await getD1()
    .prepare(
      `SELECT d.id, d.projectId, d.grossAmount, d.upfrontCommission,
              d.netAmount, d.beneficiaryAccount, d.trancheNo, d.status,
              d.preparedBy, d.approvedBy, d.executedAt, d.paymentRef,
              d.createdAt, p.title AS projectTitle, p.companyId,
              c.legalName AS companyLegalName,
              c.tradeName AS companyTradeName
       FROM Disbursement d
       JOIN Project p ON p.id = d.projectId
       JOIN Company c ON c.id = p.companyId
       ORDER BY d.createdAt DESC`
    )
    .all<DisbursementRow>();

  return NextResponse.json(
    {
      disbursements: result.results.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        grossAmount: Number(row.grossAmount),
        upfrontCommission: Number(row.upfrontCommission),
        netAmount: Number(row.netAmount),
        beneficiaryAccount: maskReference(row.beneficiaryAccount),
        trancheNo: row.trancheNo,
        status: row.status,
        preparedBy: row.preparedBy,
        approvedBy: row.approvedBy,
        executedAt: row.executedAt,
        paymentRef: row.paymentRef,
        createdAt: row.createdAt,
        project: {
          id: row.projectId,
          title: row.projectTitle,
          company: {
            id: row.companyId,
            legalName: row.companyLegalName,
            tradeName: row.companyTradeName,
          },
        },
      })),
      executionEnabled: false,
      executionMessage:
        "L'exécution reste verrouillée jusqu'à la connexion du prestataire de paiement agréé.",
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
    requirePermission(admin, "disbursement:prepare");
  } catch (error) {
    return NextResponse.json(
      { error: String(error).includes("FORBIDDEN") ? "Permission refusée" : "Non authentifié" },
      { status: String(error).includes("FORBIDDEN") ? 403 : 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  const projectId = String(body.projectId || "").trim();
  const grossAmount = Number(body.grossAmount);
  if (!projectId || !Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
    return NextResponse.json(
      { error: "Projet et montant positif requis." },
      { status: 400 }
    );
  }

  const database = getD1();
  const project = await database
    .prepare(
      `SELECT p.id, p.title, p.status, p.companyId,
              o.id AS offerId, o.raisedAmount, o.upfrontCommissionPct,
              c.verificationStatus, c.verifiedBankAccount,
              c.bankAccountVerifiedAt
       FROM Project p
       JOIN Company c ON c.id = p.companyId
       LEFT JOIN Offer o ON o.projectId = p.id
       WHERE p.id = ? LIMIT 1`
    )
    .bind(projectId)
    .first<ProjectFundingRow>();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  if (!["funded", "repaying"].includes(project.status) || !project.offerId) {
    return NextResponse.json(
      { error: "Le financement doit être atteint avant toute préparation." },
      { status: 409 }
    );
  }
  if (
    project.verificationStatus !== "verified" ||
    !project.verifiedBankAccount ||
    !project.bankAccountVerifiedAt
  ) {
    return NextResponse.json(
      { error: "Le compte de versement de l'entreprise doit être vérifié." },
      { status: 409 }
    );
  }
  if (grossAmount > Number(project.raisedAmount || 0)) {
    return NextResponse.json(
      { error: "Le montant dépasse le capital effectivement collecté." },
      { status: 409 }
    );
  }

  const existing = await database
    .prepare(
      `SELECT id, status FROM Disbursement
       WHERE projectId = ? AND trancheNo = 1 AND status IN ('pending', 'approved')
       LIMIT 1`
    )
    .bind(projectId)
    .first<{ id: string; status: string }>();
  if (existing) {
    return NextResponse.json(
      { disbursement: existing, idempotent: true, message: "Une préparation est déjà en cours." },
      { status: 200 }
    );
  }

  const gross = BigInt(grossAmount);
  const upfront = computeUpfrontCommission(gross, Number(project.upfrontCommissionPct || 6));
  const net = gross - upfront;
  const disbursementId = crypto.randomUUID();
  const now = isoNow();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO Disbursement
           (id, projectId, grossAmount, upfrontCommission, netAmount,
            beneficiaryAccount, trancheNo, status, preparedBy, approvedBy,
            executedAt, paymentRef, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', ?, NULL, NULL, NULL, ?)`
        )
        .bind(
          disbursementId,
          projectId,
          grossAmount,
          Number(upfront),
          Number(net),
          project.verifiedBankAccount,
          admin.adminId,
          now
        ),
      database
        .prepare(
          `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'admin', ?, 'disbursement_prepared', 'disbursement', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          admin.adminId,
          disbursementId,
          JSON.stringify({ projectId, grossAmount, upfrontCommission: Number(upfront), netAmount: Number(net) }),
          requestIp(req),
          now
        ),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Une préparation est déjà en cours pour ce projet." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      disbursement: {
        id: disbursementId,
        projectId,
        grossAmount,
        upfrontCommission: Number(upfront),
        netAmount: Number(net),
        status: "pending",
        preparedBy: admin.adminId,
        createdAt: now,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  const disbursementId = String(body.disbursementId || "").trim();
  const action = String(body.action || "").trim();
  if (!disbursementId || !["approve", "execute"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  try {
    requirePermission(
      admin,
      action === "approve" ? "disbursement:approve" : "disbursement:execute"
    );
  } catch {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  if (action === "execute") {
    return NextResponse.json(
      {
        error:
          "Exécution indisponible tant que le prestataire agréé et son retour signé ne sont pas connectés. Aucun mouvement n'a été créé.",
        code: "DISBURSEMENT_PROVIDER_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const database = getD1();
  const disbursement = await database
    .prepare(
      `SELECT id, status, preparedBy, approvedBy
       FROM Disbursement WHERE id = ? LIMIT 1`
    )
    .bind(disbursementId)
    .first<{ id: string; status: string; preparedBy: string | null; approvedBy: string | null }>();
  if (!disbursement) {
    return NextResponse.json({ error: "Décaissement introuvable" }, { status: 404 });
  }
  if (disbursement.approvedBy) {
    return NextResponse.json({ disbursement, idempotent: true });
  }
  if (disbursement.preparedBy === admin.adminId) {
    return NextResponse.json(
      { error: "Le préparateur ne peut pas approuver son propre décaissement." },
      { status: 403 }
    );
  }
  if (disbursement.status !== "pending") {
    return NextResponse.json({ error: "Ce décaissement n'est plus en attente." }, { status: 409 });
  }

  const now = isoNow();
  await database.batch([
    database
      .prepare(`UPDATE Disbursement SET approvedBy = ?, status = 'approved' WHERE id = ? AND status = 'pending'`)
      .bind(admin.adminId, disbursementId),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'admin', ?, 'disbursement_approved', 'disbursement', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        disbursementId,
        JSON.stringify({ preparedBy: disbursement.preparedBy, approvedBy: admin.adminId }),
        requestIp(req),
        now
      ),
  ]);
  return NextResponse.json({
    disbursement: { ...disbursement, approvedBy: admin.adminId, status: "approved" },
  });
}
