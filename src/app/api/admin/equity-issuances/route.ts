import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission, type SessionAdmin } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { equityCertificateNumber, microPctToEquityPct } from "@/lib/equity-allocation";

interface EquityIssuanceRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  projectId: string;
  companyId: string;
  shareClass: string;
  totalOwnershipMicroPct: number;
  status: string;
  resolutionRef: string | null;
  resolutionDate: string | null;
  declarationRef: string | null;
  shareRegisterRef: string | null;
  preparedBy: string | null;
  approvedBy: string | null;
  preparedAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectTitle: string;
  companyLegalName: string;
  companyTradeName: string | null;
  allocationCount: number;
  allocatedMicroPct: number;
  issuedCount: number;
}

interface IssuanceActionRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  projectId: string;
  companyId: string;
  status: string;
  shareClass: string;
  totalOwnershipMicroPct: number;
  resolutionRef: string | null;
  resolutionDate: string | null;
  declarationRef: string | null;
  shareRegisterRef: string | null;
  preparedBy: string | null;
  approvedBy: string | null;
}

interface AllocationActionRow extends Record<string, unknown> {
  id: string;
  investmentId: string;
  investorType: string;
  investorId: string;
  ownershipMicroPct: number;
  status: string;
}

function hasAnyPermission(admin: SessionAdmin, permissions: string[]): boolean {
  return (
    admin.permissions.includes("all") ||
    permissions.some((permission) => admin.permissions.includes(permission))
  );
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
      "equity:read",
      "equity:prepare",
      "equity:approve",
      "equity:issue",
    ])
  ) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const result = await getD1()
    .prepare(
      `SELECT e.id, e.offerId, e.projectId, e.companyId, e.shareClass,
              e.totalOwnershipMicroPct, e.status, e.resolutionRef,
              e.resolutionDate, e.declarationRef, e.shareRegisterRef,
              e.preparedBy, e.approvedBy, e.preparedAt, e.approvedAt,
              e.issuedAt, e.createdAt, e.updatedAt,
              p.title AS projectTitle,
              c.legalName AS companyLegalName,
              c.tradeName AS companyTradeName,
              COUNT(a.id) AS allocationCount,
              COALESCE(SUM(a.ownershipMicroPct), 0) AS allocatedMicroPct,
              COALESCE(SUM(CASE WHEN a.status = 'issued' THEN 1 ELSE 0 END), 0) AS issuedCount
       FROM EquityIssuance e
       JOIN Project p ON p.id = e.projectId
       JOIN Company c ON c.id = e.companyId
       LEFT JOIN EquityAllocation a ON a.issuanceId = e.id
       GROUP BY e.id
       ORDER BY e.createdAt DESC`
    )
    .all<EquityIssuanceRow>();

  return NextResponse.json(
    {
      issuances: result.results.map((row) => ({
        id: row.id,
        offerId: row.offerId,
        projectId: row.projectId,
        companyId: row.companyId,
        shareClass: row.shareClass,
        totalOwnershipPct: microPctToEquityPct(Number(row.totalOwnershipMicroPct)),
        status: row.status,
        resolutionRef: row.resolutionRef,
        resolutionDate: row.resolutionDate,
        declarationRef: row.declarationRef,
        shareRegisterRef: row.shareRegisterRef,
        preparedBy: row.preparedBy,
        approvedBy: row.approvedBy,
        preparedAt: row.preparedAt,
        approvedAt: row.approvedAt,
        issuedAt: row.issuedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        allocationCount: Number(row.allocationCount),
        allocatedOwnershipPct: microPctToEquityPct(Number(row.allocatedMicroPct)),
        issuedCount: Number(row.issuedCount),
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
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
    requirePermission(admin, "equity:prepare");
  } catch (error) {
    return permissionError(error);
  }

  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  const offerId = textValue(body.offerId, 120);
  const shareClass = textValue(body.shareClass, 80);
  const resolutionRef = textValue(body.resolutionRef, 180);
  const resolutionDate = dateValue(body.resolutionDate);
  if (!offerId || !shareClass || !resolutionRef || !resolutionDate) {
    return NextResponse.json(
      { error: "Offre, catégorie de titres, décision sociale et date valides requises." },
      { status: 400 }
    );
  }

  const database = getD1();
  const issuance = await database
    .prepare(
      `SELECT e.id, e.offerId, e.projectId, e.companyId, e.status, e.shareClass,
              e.totalOwnershipMicroPct, e.resolutionRef, e.resolutionDate,
              e.declarationRef, e.shareRegisterRef, e.preparedBy, e.approvedBy
       FROM EquityIssuance e
       JOIN Offer o ON o.id = e.offerId
       JOIN Project p ON p.id = e.projectId
       WHERE e.offerId = ? AND o.status = 'funded'
         AND p.instrumentType = 'equity' LIMIT 1`
    )
    .bind(offerId)
    .first<IssuanceActionRow>();
  if (!issuance) {
    return NextResponse.json(
      { error: "Registre d'allocation introuvable ou collecte non finalisée." },
      { status: 404 }
    );
  }
  if (issuance.status !== "pending_documents") {
    const samePreparation =
      issuance.shareClass === shareClass &&
      issuance.resolutionRef === resolutionRef &&
      issuance.resolutionDate === resolutionDate;
    if (samePreparation && ["prepared", "approved", "issued"].includes(issuance.status)) {
      return NextResponse.json({ issuance, idempotent: true });
    }
    return NextResponse.json(
      { error: "Cette émission a déjà franchi l'étape de préparation." },
      { status: 409 }
    );
  }
  const integrity = await allocationIntegrity(database, issuance);
  if (!integrity.valid) {
    return NextResponse.json({ error: integrity.error }, { status: 409 });
  }

  const now = isoNow();
  const results = await database.batch([
    database
      .prepare(
        `UPDATE EquityIssuance
         SET shareClass = ?, resolutionRef = ?, resolutionDate = ?,
             status = 'prepared', preparedBy = ?, preparedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'pending_documents' AND preparedBy IS NULL`
      )
      .bind(
        shareClass,
        resolutionRef,
        resolutionDate,
        admin.adminId,
        now,
        now,
        issuance.id
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'admin', ?, 'equity_issuance_prepared', 'equity_issuance', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityIssuance
           WHERE id = ? AND status = 'prepared' AND preparedBy = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        issuance.id,
        JSON.stringify({ offerId, shareClass, resolutionRef, resolutionDate }),
        requestIp(req),
        now,
        issuance.id,
        admin.adminId
      ),
  ]);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Préparation concurrente détectée." }, { status: 409 });
  }
  return NextResponse.json(
    {
      issuance: {
        ...issuance,
        shareClass,
        resolutionRef,
        resolutionDate,
        status: "prepared",
        preparedBy: admin.adminId,
        preparedAt: now,
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
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  const issuanceId = textValue(body.issuanceId, 120);
  const action = textValue(body.action, 20);
  if (!issuanceId || !action || !["approve", "issue"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }
  try {
    requirePermission(admin, action === "approve" ? "equity:approve" : "equity:issue");
  } catch (error) {
    return permissionError(error);
  }

  const database = getD1();
  const issuance = await database
    .prepare(
      `SELECT id, offerId, projectId, companyId, status, shareClass,
              totalOwnershipMicroPct, resolutionRef, resolutionDate,
              declarationRef, shareRegisterRef, preparedBy, approvedBy
       FROM EquityIssuance WHERE id = ? LIMIT 1`
    )
    .bind(issuanceId)
    .first<IssuanceActionRow>();
  if (!issuance) {
    return NextResponse.json({ error: "Émission introuvable." }, { status: 404 });
  }
  if (action === "approve") return approveIssuance(req, admin, database, issuance);
  return issueAllocations(req, admin, database, issuance, body);
}

async function approveIssuance(
  req: NextRequest,
  admin: SessionAdmin,
  database: D1Database,
  issuance: IssuanceActionRow
) {
  if (issuance.approvedBy && ["approved", "issued"].includes(issuance.status)) {
    return NextResponse.json({ issuance, idempotent: true });
  }
  if (!issuance.preparedBy || issuance.preparedBy === admin.adminId) {
    return NextResponse.json(
      { error: "La même personne ne peut pas préparer et approuver l'émission." },
      { status: 403 }
    );
  }
  if (issuance.status !== "prepared" || !issuance.resolutionRef || !issuance.resolutionDate) {
    return NextResponse.json(
      { error: "La décision sociale doit être préparée avant approbation." },
      { status: 409 }
    );
  }
  const integrity = await allocationIntegrity(database, issuance);
  if (!integrity.valid) {
    return NextResponse.json({ error: integrity.error }, { status: 409 });
  }

  const now = isoNow();
  const results = await database.batch([
    database
      .prepare(
        `UPDATE EquityIssuance
         SET status = 'approved', approvedBy = ?, approvedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'prepared' AND preparedBy != ? AND approvedBy IS NULL`
      )
      .bind(admin.adminId, now, now, issuance.id, admin.adminId),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'admin', ?, 'equity_issuance_approved', 'equity_issuance', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityIssuance
           WHERE id = ? AND status = 'approved' AND approvedBy = ?
         )`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        issuance.id,
        JSON.stringify({ preparedBy: issuance.preparedBy, approvedBy: admin.adminId }),
        requestIp(req),
        now,
        issuance.id,
        admin.adminId
      ),
  ]);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Approbation concurrente détectée." }, { status: 409 });
  }
  return NextResponse.json({
    issuance: { ...issuance, status: "approved", approvedBy: admin.adminId, approvedAt: now },
  });
}

async function issueAllocations(
  req: NextRequest,
  admin: SessionAdmin,
  database: D1Database,
  issuance: IssuanceActionRow,
  body: Record<string, unknown>
) {
  if (issuance.status === "issued") {
    return NextResponse.json({ issuance, idempotent: true });
  }
  if (!issuance.approvedBy || issuance.status !== "approved") {
    return NextResponse.json(
      { error: "Une approbation distincte est requise avant l'enregistrement des titres." },
      { status: 409 }
    );
  }
  if (issuance.preparedBy === admin.adminId) {
    return NextResponse.json(
      { error: "Le préparateur ne peut pas finaliser sa propre émission." },
      { status: 403 }
    );
  }
  const declarationRef = textValue(body.declarationRef, 180);
  const shareRegisterRef = textValue(body.shareRegisterRef, 180);
  if (!declarationRef || !shareRegisterRef) {
    return NextResponse.json(
      { error: "La déclaration de souscription et la référence du registre des titres sont requises." },
      { status: 400 }
    );
  }
  const integrity = await allocationIntegrity(database, issuance);
  if (!integrity.valid) {
    return NextResponse.json({ error: integrity.error }, { status: 409 });
  }
  const allocationResult = await database
    .prepare(
      `SELECT id, investmentId, investorType, investorId, ownershipMicroPct, status
       FROM EquityAllocation WHERE issuanceId = ?
       ORDER BY createdAt ASC, id ASC`
    )
    .bind(issuance.id)
    .all<AllocationActionRow>();
  if (allocationResult.results.some((allocation) => allocation.status !== "pending_issuance")) {
    return NextResponse.json({ error: "État des allocations incohérent." }, { status: 409 });
  }

  const now = isoNow();
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE EquityIssuance
         SET declarationRef = ?, shareRegisterRef = ?, status = 'issued',
             issuedAt = ?, updatedAt = ?
         WHERE id = ? AND status = 'approved' AND approvedBy IS NOT NULL`
      )
      .bind(declarationRef, shareRegisterRef, now, now, issuance.id),
  ];
  allocationResult.results.forEach((allocation, index) => {
    const certificateNo = equityCertificateNumber(issuance.offerId, index + 1);
    statements.push(
      database
        .prepare(
          `UPDATE EquityAllocation
           SET status = 'issued', certificateNo = ?, issuedAt = ?, updatedAt = ?
           WHERE id = ? AND status = 'pending_issuance'
             AND EXISTS (
               SELECT 1 FROM EquityIssuance
               WHERE id = ? AND status = 'issued'
             )`
        )
        .bind(certificateNo, now, now, allocation.id, issuance.id),
      database
        .prepare(
          `INSERT INTO Notification
           (id, userId, type, title, message, read, actionUrl, createdAt)
           SELECT ?, i.investorId, 'equity_issued', 'Participation enregistrée', ?,
                  0, 'investor_dashboard', ?
           FROM Investment i
           WHERE i.id = ? AND i.investorType = 'individual'
             AND NOT EXISTS (
               SELECT 1 FROM Notification n
               WHERE n.userId = i.investorId AND n.type = 'equity_issued'
                 AND n.message = ?
             )`
        )
        .bind(
          crypto.randomUUID(),
          `Votre participation de ${microPctToEquityPct(Number(allocation.ownershipMicroPct)).toLocaleString("fr-FR", { maximumFractionDigits: 6 })} % a été enregistrée sous la référence ${certificateNo}.`,
          now,
          allocation.investmentId,
          `Votre participation de ${microPctToEquityPct(Number(allocation.ownershipMicroPct)).toLocaleString("fr-FR", { maximumFractionDigits: 6 })} % a été enregistrée sous la référence ${certificateNo}.`
        )
    );
  });
  statements.push(
    database
      .prepare(
        `INSERT INTO ProjectEvent
         (id, projectId, eventType, description, actor, createdAt)
         SELECT ?, ?, 'equity_issued',
                'Émission juridique validée et registre des participations mis à jour', ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM ProjectEvent
           WHERE projectId = ? AND eventType = 'equity_issued'
         )`
      )
      .bind(crypto.randomUUID(), issuance.projectId, admin.adminId, now, issuance.projectId),
    database
      .prepare(
        `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         SELECT ?, 'admin', ?, 'equity_issuance_recorded', 'equity_issuance', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM EquityIssuance WHERE id = ? AND status = 'issued'
         )`
      )
      .bind(
        crypto.randomUUID(),
        admin.adminId,
        issuance.id,
        JSON.stringify({
          declarationRef,
          shareRegisterRef,
          allocationCount: allocationResult.results.length,
        }),
        requestIp(req),
        now,
        issuance.id
      )
  );

  const results = await database.batch(statements);
  if ((results[0].meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Finalisation concurrente détectée." }, { status: 409 });
  }
  return NextResponse.json({
    issuance: {
      ...issuance,
      status: "issued",
      declarationRef,
      shareRegisterRef,
      issuedAt: now,
    },
  });
}

async function allocationIntegrity(database: D1Database, issuance: IssuanceActionRow) {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS allocationCount,
              COALESCE(SUM(ownershipMicroPct), 0) AS allocatedMicroPct
       FROM EquityAllocation WHERE issuanceId = ? AND status != 'cancelled'`
    )
    .bind(issuance.id)
    .first<{ allocationCount: number; allocatedMicroPct: number }>();
  if (!row || Number(row.allocationCount) < 1) {
    return { valid: false, error: "Aucune allocation en capital n'est enregistrée." };
  }
  if (Number(row.allocatedMicroPct) !== Number(issuance.totalOwnershipMicroPct)) {
    return {
      valid: false,
      error: "La somme des allocations ne correspond pas au capital offert.",
    };
  }
  return { valid: true, error: null };
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

function dateValue(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 24 * 60 * 60 * 1000) return null;
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return value;
}

function permissionError(error: unknown) {
  const forbidden = String(error).includes("FORBIDDEN");
  return NextResponse.json(
    { error: forbidden ? "Permission refusée" : "Non authentifié" },
    { status: forbidden ? 403 : 401 }
  );
}
