import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { canPrepareStage, stageCommission } from "@/lib/staged-disbursement";

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
  offerStatus: string;
  isDemo: number;
}

interface StageRow extends Record<string, unknown> {
  id: string;
  trancheNo: number;
  title: string;
  grossAmount: number;
  status: string;
  qaBy: string | null;
  transferId: string | null;
  transferStatus: string | null;
}

function hasAnyPermission(admin: SessionAdmin, permissions: string[]): boolean {
  return (
    admin.permissions.includes("all") ||
    ["finance", "validator", "auditor", "superadmin"].includes(admin.role) ||
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
    if (!["finance", "superadmin"].includes(admin.role)) requirePermission(admin, "disbursement:prepare");
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
  if (!projectId) {
    return NextResponse.json(
      { error: "Choisissez un projet." },
      { status: 400 }
    );
  }

  const database = getD1();
  const project = await database
    .prepare(
      `SELECT p.id, p.title, p.status, p.companyId,
              o.id AS offerId, o.raisedAmount, o.upfrontCommissionPct,
              o.status AS offerStatus, o.isDemo,
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
  if (!["funded", "repaying"].includes(project.status) || !project.offerId || project.offerStatus !== "funded" || project.isDemo) {
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
  const stageResult = await database.prepare(`SELECT s.id, s.trancheNo, s.title, s.grossAmount,
    s.status, s.qaBy, d.id AS transferId, d.status AS transferStatus
    FROM DisbursementStage s LEFT JOIN Disbursement d
    ON d.projectId = s.projectId AND d.trancheNo = s.trancheNo
    WHERE s.projectId = ? ORDER BY s.trancheNo ASC`)
    .bind(projectId).all<StageRow>();
  const stages = stageResult.results;
  if (stages.length < 2) return NextResponse.json(
    { error: "Un calendrier de plusieurs étapes doit être validé avant la préparation." },
    { status: 409 }
  );
  const nextIndex = stages.findIndex((stage) => !stage.transferId);
  if (nextIndex < 0) return NextResponse.json({ error: "Toutes les étapes ont déjà été préparées." }, { status: 409 });
  const stage = stages[nextIndex];
  const previous = nextIndex === 0 ? null : stages[nextIndex - 1];
  if (stage.trancheNo !== nextIndex + 1 || !canPrepareStage({
    status: stage.status,
    trancheNo: stage.trancheNo,
    previousTransferStatus: previous?.transferStatus ?? null,
    previousQualityStatus: previous?.status ?? null,
    previousReviewer: previous?.qaBy ?? null,
  })) {
    return NextResponse.json({ error: stage.status !== "planned"
      ? "Cette étape n’est plus prête pour un versement."
      : previous && previous.transferStatus !== "executed"
        ? "Le versement précédent doit être confirmé avant de préparer la suite."
        : "L’utilisation de la tranche précédente doit être contrôlée et validée avant le versement suivant." }, { status: 409 });
  }
  const grossAmount = Number(stage.grossAmount);
  const priorGross = stages.slice(0, nextIndex).reduce((sum, item) => sum + BigInt(item.grossAmount), 0n);
  if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0 || priorGross + BigInt(grossAmount) > BigInt(project.raisedAmount || 0)) {
    return NextResponse.json({ error: "Le calendrier dépasse le capital effectivement collecté." }, { status: 409 });
  }
  const gross = BigInt(grossAmount);
  const upfront = stageCommission(gross, priorGross, Number(project.upfrontCommissionPct ?? 6));
  const net = gross - upfront;
  if (net <= 0n) return NextResponse.json({ error: "Le montant net de cette étape est invalide." }, { status: 409 });
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
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, NULL, ?)`
        )
        .bind(
          disbursementId,
          projectId,
          grossAmount,
          Number(upfront),
          Number(net),
          project.verifiedBankAccount,
          stage.trancheNo,
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
          JSON.stringify({ projectId, stageId: stage.id, trancheNo: stage.trancheNo, grossAmount, upfrontCommission: Number(upfront), netAmount: Number(net) }),
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
        trancheNo: stage.trancheNo,
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
    if (!["finance", "validator", "superadmin"].includes(admin.role)) requirePermission(
      admin, action === "approve" ? "disbursement:approve" : "disbursement:execute"
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
      `SELECT d.id, d.status, d.preparedBy, d.approvedBy,
              d.trancheNo, s.status AS stageStatus,
              previous.status AS previousQualityStatus, previous.qaBy AS previousReviewer,
              previousTransfer.status AS previousTransferStatus
       FROM Disbursement d LEFT JOIN DisbursementStage s
       ON s.projectId = d.projectId AND s.trancheNo = d.trancheNo
       LEFT JOIN DisbursementStage previous
       ON previous.projectId = d.projectId AND previous.trancheNo = d.trancheNo - 1
       LEFT JOIN Disbursement previousTransfer
       ON previousTransfer.projectId = d.projectId AND previousTransfer.trancheNo = d.trancheNo - 1
       WHERE d.id = ? LIMIT 1`
    )
    .bind(disbursementId)
    .first<{ id: string; status: string; preparedBy: string | null; approvedBy: string | null; trancheNo: number; stageStatus: string | null; previousQualityStatus: string | null; previousReviewer: string | null; previousTransferStatus: string | null }>();
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
  if (!canPrepareStage({
    status: disbursement.stageStatus ?? "",
    trancheNo: Number(disbursement.trancheNo),
    previousTransferStatus: disbursement.previousTransferStatus,
    previousQualityStatus: disbursement.previousQualityStatus,
    previousReviewer: disbursement.previousReviewer,
  })) {
    return NextResponse.json({ error: Number(disbursement.trancheNo) === 1
      ? "La première tranche n’est plus prête à être approuvée. Actualisez le dossier."
      : "Le versement précédent et son contrôle qualité doivent être validés avant cette approbation." }, { status: 409 });
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
