import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { isEditableByCompany } from "@/lib/workflow";

// ============================================================================
// POST /api/projects/draft
// ----------------------------------------------------------------------------
// Sauvegarde un brouillon (status="draft") sans soumettre.
// Si projectId présent → met à jour le brouillon existant (PUT sémantique).
// L'utilisateur doit être membre de la société cible.
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

  const membership = await db.companyMember.findFirst({
    where: { userId: session.userId, companyId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'êtes pas membre de cette entreprise" },
      { status: 403 }
    );
  }

  // Mise à jour d'un brouillon existant ?
  const projectId = body.projectId ? String(body.projectId) : null;
  if (projectId) {
    const existing = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, companyId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Projet introuvable" },
        { status: 404 }
      );
    }
    if (existing.companyId !== companyId) {
      return NextResponse.json(
        { error: "Projet non rattaché à cette entreprise" },
        { status: 403 }
      );
    }
    // On ne peut éditer qu'un brouillon ou un dossier en complément demandé
    if (!isEditableByCompany(existing.status)) {
      return NextResponse.json(
        {
          error: `Dossier non éditable au statut « ${existing.status} »`,
        },
        { status: 400 }
      );
    }
  }

  const instrumentType = String(body.instrumentType || "debt");
  const fundingGoal = body.fundingGoal
    ? toBigInt(body.fundingGoal, "fundingGoal")
    : 0n;
  const minInvestment = body.minInvestment
    ? toBigInt(body.minInvestment, "minInvestment")
    : 0n;

  const data: any = {
    title: String(body.title || ""),
    description: String(body.description || ""),
    longDescription: String(body.longDescription || ""),
    sector: String(body.sector || ""),
    country: String(body.country || ""),
    city: String(body.city || ""),
    imageUrl:
      String(body.imageUrl || "") ||
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
    instrumentType,
    fundingGoal,
    companyContribution: body.companyContribution
      ? toBigInt(body.companyContribution, "companyContribution")
      : 0n,
    annualRate:
      body.annualRate !== undefined && body.annualRate !== null && body.annualRate !== ""
        ? Number(body.annualRate)
        : null,
    ratePeriod: body.ratePeriod ? String(body.ratePeriod) : null,
    durationMonths: body.durationMonths ? Number(body.durationMonths) : null,
    repaymentType: body.repaymentType ? String(body.repaymentType) : null,
    equityOfferedPct:
      body.equityOfferedPct !== undefined && body.equityOfferedPct !== null && body.equityOfferedPct !== ""
        ? Number(body.equityOfferedPct)
        : null,
    valuationPre: body.valuationPre
      ? toBigInt(body.valuationPre, "valuationPre")
      : null,
    minInvestment,
    maxInvestment: body.maxInvestment
      ? toBigInt(body.maxInvestment, "maxInvestment")
      : null,
    budgetDetail: body.budgetDetail ? String(body.budgetDetail) : null,
    repaymentSource: body.repaymentSource
      ? String(body.repaymentSource)
      : null,
    risksIdentified: body.risksIdentified
      ? String(body.risksIdentified)
      : null,
    status: "draft",
  };

  let project;
  if (projectId) {
    project = await db.project.update({
      where: { id: projectId },
      data,
      include: { company: true },
    });
  } else {
    project = await db.project.create({
      data: {
        ...data,
        companyId,
        submittedBy: session.userId,
      },
      include: { company: true },
    });
  }

  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: projectId ? "project_draft_updated" : "project_draft_created",
      entityType: "project",
      entityId: project.id,
      metadata: JSON.stringify({ companyId, title: project.title }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({ project: ser(project) });
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
