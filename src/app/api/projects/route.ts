import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";

// ============================================================================
// GET /api/projects
// ----------------------------------------------------------------------------
// Liste les projets de l'entreprise courante (membership vérifié).
// Filtre ?mine=true → uniquement ceux soumis par l'utilisateur courant.
// JAMAIS une autre entreprise n'est exposée.
// ============================================================================
export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Récupère les sociétés dont l'utilisateur est membre
  const memberships = await db.companyMember.findMany({
    where: { userId: session.userId },
    select: { companyId: true },
  });
  if (memberships.length === 0) {
    return NextResponse.json({ projects: [] });
  }
  const companyIds = memberships.map((m) => m.companyId);

  const mine = req.nextUrl.searchParams.get("mine") === "true";

  const projects = await db.project.findMany({
    where: mine
      ? { submittedBy: session.userId, companyId: { in: companyIds } }
      : { companyId: { in: companyIds } },
    include: { company: true, offer: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects: ser(projects) });
}

// ============================================================================
// POST /api/projects
// ----------------------------------------------------------------------------
// Soumission d'un dossier par une entreprise.
// - requireUser(req)
// - Vérifie que l'utilisateur est membre de l'entreprise cible
// - Crée le Project avec status="submitted" + submittedAt=now()
// - Crée un ProjectEvent + AuditLog
// - L'entreprise ne publie jamais directement (spec section 2)
// ============================================================================
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const companyId = String(body.companyId || "");
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  // Vérification de l'appartenance à la société
  const membership = await db.companyMember.findFirst({
    where: { userId: session.userId, companyId },
    select: { id: true, mandate: true, role: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'êtes pas membre de cette entreprise" },
      { status: 403 }
    );
  }

  // Validation des champs obligatoires
  const required = [
    "title", "description", "longDescription", "sector", "country", "city",
    "instrumentType", "fundingGoal", "minInvestment",
  ];
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return NextResponse.json(
        { error: `Champ requis manquant: ${f}` },
        { status: 400 }
      );
    }
  }

  const instrumentType = String(body.instrumentType);
  if (!["debt", "equity"].includes(instrumentType)) {
    return NextResponse.json(
      { error: "instrumentType doit être 'debt' ou 'equity'" },
      { status: 400 }
    );
  }

  // Conversion sûre en BigInt
  const fundingGoal = toBigInt(body.fundingGoal, "fundingGoal");
  const companyContribution = body.companyContribution
    ? toBigInt(body.companyContribution, "companyContribution")
    : 0n;
  const minInvestment = toBigInt(body.minInvestment, "minInvestment");
  const maxInvestment = body.maxInvestment
    ? toBigInt(body.maxInvestment, "maxInvestment")
    : null;
  const valuationPre = body.valuationPre
    ? toBigInt(body.valuationPre, "valuationPre")
    : null;

  const now = new Date();
  const project = await db.project.create({
    data: {
      companyId,
      submittedBy: session.userId,
      title: String(body.title),
      description: String(body.description),
      longDescription: String(body.longDescription),
      sector: String(body.sector),
      country: String(body.country),
      city: String(body.city),
      imageUrl:
        String(body.imageUrl || "") ||
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
      instrumentType,
      fundingGoal,
      companyContribution,
      annualRate:
        body.annualRate !== undefined && body.annualRate !== null
          ? Number(body.annualRate)
          : null,
      ratePeriod: body.ratePeriod ? String(body.ratePeriod) : null,
      durationMonths: body.durationMonths ? Number(body.durationMonths) : null,
      repaymentType: body.repaymentType ? String(body.repaymentType) : null,
      equityOfferedPct:
        body.equityOfferedPct !== undefined && body.equityOfferedPct !== null
          ? Number(body.equityOfferedPct)
          : null,
      valuationPre,
      minInvestment,
      maxInvestment,
      budgetDetail: body.budgetDetail ? String(body.budgetDetail) : null,
      repaymentSource: body.repaymentSource
        ? String(body.repaymentSource)
        : null,
      risksIdentified: body.risksIdentified
        ? String(body.risksIdentified)
        : null,
      status: "submitted",
      submittedAt: now,
    },
    include: { company: true },
  });

  // ProjectEvent : "submitted"
  await db.projectEvent.create({
    data: {
      projectId: project.id,
      eventType: "submitted",
      description: `Dossier soumis par ${session.email}`,
      actor: session.userId,
    },
  });

  // AuditLog
  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: "project_submitted",
      entityType: "project",
      entityId: project.id,
      metadata: JSON.stringify({
        companyId,
        title: project.title,
        fundingGoal: project.fundingGoal.toString(),
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // Notification aux admins (utilisateurs admin) — pour la démo, on notifie le
  // premier admin actif. En production : notification ciblée par rôle.
  const admin = await db.adminUser.findFirst({
    where: { active: true },
    select: { id: true, email: true },
  });
  if (admin) {
    // Notification envoyée à l'utilisateur (entreprise) aussi pour accusé de réception
    await db.notification.create({
      data: {
        userId: session.userId,
        type: "submission",
        title: "Dossier soumis",
        message: `Votre dossier « ${project.title} » a bien été soumis. Notre équipe va l'analyser.`,
        actionUrl: "company_dashboard",
      },
    });
  }

  return NextResponse.json({ project: ser(project) }, { status: 201 });
}

function toBigInt(v: unknown, field: string): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isInteger(v)) throw new Error(`${field} doit être entier`);
    return BigInt(v);
  }
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n))
      throw new Error(`${field} invalide`);
    return BigInt(n);
  }
  throw new Error(`${field} invalide`);
}
