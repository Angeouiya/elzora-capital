import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { microPctToEquityPct } from "@/lib/equity-allocation";

interface DividendRow extends Record<string, unknown> {
  id: string;
  issuanceId: string;
  projectId: string;
  companyId: string;
  totalDeclaredAmount: number;
  platformGrossAmount: number;
  withholdingAmount: number;
  netPayableAmount: number;
  currency: string;
  recordDate: string;
  resolutionRef: string;
  resolutionDate: string;
  taxReference: string | null;
  rejectionReason: string | null;
  status: string;
  submittedBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  projectTitle: string;
  companyLegalName: string;
  companyTradeName: string | null;
  totalOwnershipMicroPct: number;
  allocationCount: number;
  grossAllocated: number;
  withholdingAllocated: number;
  netAllocated: number;
}

interface ActionDividendRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  companyId: string;
  status: string;
  platformGrossAmount: number;
  withholdingAmount: number;
  netPayableAmount: number;
  reviewedBy: string | null;
  approvedBy: string | null;
  resolutionRef: string;
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
      "equity_dividend:read",
      "equity_dividend:review",
      "equity_dividend:approve",
    ])
  ) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const result = await getD1()
    .prepare(
      `SELECT d.id, d.issuanceId, d.projectId, d.companyId,
              d.totalDeclaredAmount, d.platformGrossAmount,
              d.withholdingAmount, d.netPayableAmount, d.currency,
              d.recordDate, d.resolutionRef, d.resolutionDate,
              d.taxReference, d.rejectionReason, d.status, d.submittedBy,
              d.reviewedBy, d.approvedBy, d.reviewedAt, d.approvedAt,
              d.paidAt, d.createdAt, p.title AS projectTitle,
              c.legalName AS companyLegalName, c.tradeName AS companyTradeName,
              e.totalOwnershipMicroPct,
              COUNT(a.id) AS allocationCount,
              COALESCE(SUM(a.grossAmount), 0) AS grossAllocated,
              COALESCE(SUM(a.withholdingAmount), 0) AS withholdingAllocated,
              COALESCE(SUM(a.netAmount), 0) AS netAllocated
       FROM EquityDividend d
       JOIN EquityIssuance e ON e.id = d.issuanceId
       JOIN Project p ON p.id = d.projectId
       JOIN Company c ON c.id = d.companyId
       LEFT JOIN EquityDividendAllocation a ON a.dividendId = d.id
       GROUP BY d.id
       ORDER BY
         CASE d.status
           WHEN 'submitted' THEN 0 WHEN 'reviewed' THEN 1
           WHEN 'approved' THEN 2 WHEN 'verifying' THEN 3 ELSE 4
         END,
         d.createdAt DESC`
    )
    .all<DividendRow>();

  return NextResponse.json(
    {
      dividends: result.results.map((row) => ({
        ...row,
        totalDeclaredAmount: Number(row.totalDeclaredAmount),
        platformGrossAmount: Number(row.platformGrossAmount),
        withholdingAmount: Number(row.withholdingAmount),
        netPayableAmount: Number(row.netPayableAmount),
        ownershipPct: microPctToEquityPct(Number(row.totalOwnershipMicroPct)),
        allocationCount: Number(row.allocationCount),
        grossAllocated: Number(row.grossAllocated),
        withholdingAllocated: Number(row.withholdingAllocated),
        netAllocated: Number(row.netAllocated),
        project: {
          title: row.projectTitle,
          company: {
            legalName: row.companyLegalName,
            tradeName: row.companyTradeName,
          },
        },
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = await readBody(req);
  const dividendId = body ? textValue(body.dividendId, 160) : null;
  const action = body ? textValue(body.action, 20) : null;
  if (!dividendId || !action || !["review", "approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }
  try {
    requirePermission(
      admin,
      action === "approve" ? "equity_dividend:approve" : "equity_dividend:review"
    );
  } catch (error) {
    return permissionError(error);
  }

  const database = getD1();
  const dividend = await database
    .prepare(
      `SELECT id, projectId, companyId, status, platformGrossAmount,
              withholdingAmount, netPayableAmount, reviewedBy, approvedBy,
              resolutionRef
       FROM EquityDividend WHERE id = ? LIMIT 1`
    )
    .bind(dividendId)
    .first<ActionDividendRow>();
  if (!dividend) {
    return NextResponse.json({ error: "Déclaration introuvable." }, { status: 404 });
  }

  if (action === "reject") {
    return rejectDividend(req, admin, database, dividend, body || {});
  }
  const integrity = await dividendIntegrity(database, dividend);
  if (!integrity.valid) {
    return NextResponse.json({ error: integrity.error }, { status: 409 });
  }
  if (action === "review") {
    return reviewDividend(req, admin, database, dividend);
  }
  return approveDividend(req, admin, database, dividend);
}

async function reviewDividend(
  req: NextRequest,
  admin: SessionAdmin,
  database: D1Database,
  dividend: ActionDividendRow
) {
  if (dividend.reviewedBy && ["reviewed", "approved", "verifying", "paid"].includes(dividend.status)) {
    return NextResponse.json({ dividend, idempotent: true });
  }
  if (dividend.status !== "submitted") {
    return NextResponse.json(
      { error: "Cette déclaration n'est plus en attente de contrôle juridique." },
      { status: 409 }
    );
  }
  const now = isoNow();
  const results = await database.batch([
    database
      .prepare(
        `UPDATE EquityDividend
         SET status = 'reviewed', reviewedBy = ?, reviewedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'submitted' AND reviewedBy IS NULL`
      )
      .bind(admin.adminId, now, now, dividend.id),
    auditStatement(database, {
      id: crypto.randomUUID(),
      actorId: admin.adminId,
      action: "equity_dividend_reviewed",
      dividendId: dividend.id,
      metadata: JSON.stringify({ resolutionRef: dividend.resolutionRef }),
      ipAddress: requestIp(req),
      now,
      expectedStatus: "reviewed",
      expectedActorColumn: "reviewedBy",
    }),
    companyNotification(database, {
      dividend,
      type: "equity_dividend_reviewed",
      title: "Déclaration juridiquement contrôlée",
      message:
        "La décision de distribution a été contrôlée. Une validation financière distincte reste requise.",
      now,
      expectedStatus: "reviewed",
    }),
  ]);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Contrôle concurrent détecté." }, { status: 409 });
  }
  return NextResponse.json({ dividend: { ...dividend, status: "reviewed", reviewedBy: admin.adminId } });
}

async function approveDividend(
  req: NextRequest,
  admin: SessionAdmin,
  database: D1Database,
  dividend: ActionDividendRow
) {
  if (dividend.approvedBy && ["approved", "verifying", "paid"].includes(dividend.status)) {
    return NextResponse.json({ dividend, idempotent: true });
  }
  if (!dividend.reviewedBy || dividend.reviewedBy === admin.adminId) {
    return NextResponse.json(
      { error: "Le contrôleur juridique ne peut pas valider financièrement la même distribution." },
      { status: 403 }
    );
  }
  if (dividend.status !== "reviewed") {
    return NextResponse.json(
      { error: "Le contrôle juridique doit être terminé avant la validation financière." },
      { status: 409 }
    );
  }
  const now = isoNow();
  const results = await database.batch([
    database
      .prepare(
        `UPDATE EquityDividend
         SET status = 'approved', approvedBy = ?, approvedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'reviewed' AND reviewedBy != ? AND approvedBy IS NULL`
      )
      .bind(admin.adminId, now, now, dividend.id, admin.adminId),
    auditStatement(database, {
      id: crypto.randomUUID(),
      actorId: admin.adminId,
      action: "equity_dividend_approved",
      dividendId: dividend.id,
      metadata: JSON.stringify({
        reviewedBy: dividend.reviewedBy,
        approvedBy: admin.adminId,
        netPayableAmount: Number(dividend.netPayableAmount),
      }),
      ipAddress: requestIp(req),
      now,
      expectedStatus: "approved",
      expectedActorColumn: "approvedBy",
    }),
    companyNotification(database, {
      dividend,
      type: "equity_dividend_approved",
      title: "Distribution prête au règlement",
      message:
        "Les contrôles sont terminés. Le montant net peut maintenant être réglé par carte ou Mobile Money.",
      now,
      expectedStatus: "approved",
    }),
  ]);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Validation concurrente détectée." }, { status: 409 });
  }
  return NextResponse.json({ dividend: { ...dividend, status: "approved", approvedBy: admin.adminId } });
}

async function rejectDividend(
  req: NextRequest,
  admin: SessionAdmin,
  database: D1Database,
  dividend: ActionDividendRow,
  body: Record<string, unknown>
) {
  const reason = textValue(body.reason, 600);
  if (!reason) {
    return NextResponse.json({ error: "Le motif du rejet est requis." }, { status: 400 });
  }
  if (!['submitted', 'reviewed'].includes(dividend.status)) {
    return NextResponse.json(
      { error: "Cette déclaration ne peut plus être rejetée." },
      { status: 409 }
    );
  }
  const now = isoNow();
  const results = await database.batch([
    database
      .prepare(
        `UPDATE EquityDividend
         SET status = 'rejected', rejectionReason = ?, updatedAt = ?
         WHERE id = ? AND status IN ('submitted', 'reviewed')`
      )
      .bind(reason, now, dividend.id),
    database
      .prepare(
        `UPDATE EquityDividendAllocation
         SET status = 'cancelled', updatedAt = ?
         WHERE dividendId = ? AND status = 'pending'
           AND EXISTS (
             SELECT 1 FROM EquityDividend WHERE id = ? AND status = 'rejected'
           )`
      )
      .bind(now, dividend.id, dividend.id),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'admin', ?, 'equity_dividend_rejected',
                'equity_dividend', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityDividend WHERE id = ? AND status = 'rejected'
         )`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        dividend.id,
        JSON.stringify({ reason }),
        requestIp(req),
        now,
        dividend.id
      ),
    companyNotification(database, {
      dividend,
      type: "equity_dividend_rejected",
      title: "Déclaration à corriger",
      message: `La déclaration de dividende doit être corrigée : ${reason}`,
      now,
      expectedStatus: "rejected",
    }),
  ]);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Rejet concurrent détecté." }, { status: 409 });
  }
  return NextResponse.json({ dividend: { ...dividend, status: "rejected", rejectionReason: reason } });
}

async function dividendIntegrity(database: D1Database, dividend: ActionDividendRow) {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS allocationCount,
              COALESCE(SUM(grossAmount), 0) AS grossAllocated,
              COALESCE(SUM(withholdingAmount), 0) AS withholdingAllocated,
              COALESCE(SUM(netAmount), 0) AS netAllocated
       FROM EquityDividendAllocation
       WHERE dividendId = ? AND status != 'cancelled'`
    )
    .bind(dividend.id)
    .first<{
      allocationCount: number;
      grossAllocated: number;
      withholdingAllocated: number;
      netAllocated: number;
    }>();
  if (!row || Number(row.allocationCount) < 1) {
    return { valid: false, error: "Aucune quote-part n'est enregistrée." };
  }
  if (
    Number(row.grossAllocated) !== Number(dividend.platformGrossAmount) ||
    Number(row.withholdingAllocated) !== Number(dividend.withholdingAmount) ||
    Number(row.netAllocated) !== Number(dividend.netPayableAmount)
  ) {
    return { valid: false, error: "La répartition financière est incohérente." };
  }
  return { valid: true, error: null };
}

function auditStatement(
  database: D1Database,
  input: {
    id: string;
    actorId: string;
    action: string;
    dividendId: string;
    metadata: string;
    ipAddress: string | null;
    now: string;
    expectedStatus: string;
    expectedActorColumn: "reviewedBy" | "approvedBy";
  }
) {
  const actorColumn = input.expectedActorColumn;
  return database
    .prepare(
      `INSERT INTO AuditLog
       (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       SELECT ?, 'admin', ?, ?, 'equity_dividend', ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM EquityDividend
         WHERE id = ? AND status = ? AND ${actorColumn} = ?
       )`
    )
    .bind(
      input.id,
      input.actorId,
      input.action,
      input.dividendId,
      input.metadata,
      input.ipAddress,
      input.now,
      input.dividendId,
      input.expectedStatus,
      input.actorId
    );
}

function companyNotification(
  database: D1Database,
  input: {
    dividend: ActionDividendRow;
    type: string;
    title: string;
    message: string;
    now: string;
    expectedStatus: string;
  }
) {
  return database
    .prepare(
      `INSERT INTO Notification
       (id, userId, type, title, message, read, actionUrl, createdAt)
       SELECT lower(hex(randomblob(16))), cm.userId, ?, ?, ?, 0,
              'company_dashboard', ?
       FROM CompanyMember cm
       WHERE cm.companyId = ?
         AND EXISTS (
           SELECT 1 FROM EquityDividend WHERE id = ? AND status = ?
         )
         AND NOT EXISTS (
           SELECT 1 FROM Notification n
           WHERE n.userId = cm.userId AND n.type = ? AND n.message = ?
         )`
    )
    .bind(
      input.type,
      input.title,
      input.message,
      input.now,
      input.dividend.companyId,
      input.dividend.id,
      input.expectedStatus,
      input.type,
      input.message
    );
}

function hasAnyPermission(admin: SessionAdmin, permissions: string[]): boolean {
  return (
    admin.permissions.includes("all") ||
    permissions.some((permission) => admin.permissions.includes(permission))
  );
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function textValue(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result && result.length <= maxLength ? result : null;
}

function permissionError(error: unknown) {
  const forbidden = String(error).includes("FORBIDDEN");
  return NextResponse.json(
    { error: forbidden ? "Permission refusée" : "Non authentifié" },
    { status: forbidden ? 403 : 401 }
  );
}
