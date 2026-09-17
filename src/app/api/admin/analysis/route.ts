import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireAdmin } from "@/lib/auth";
import { canTransition, canActorTransition } from "@/lib/workflow";

// ============================================================================
// GET /api/admin/analysis
// ----------------------------------------------------------------------------
// Liste tous les projets avec statut + timeline (vue admin analyse).
// ============================================================================
export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    include: {
      company: true,
      timeline: { orderBy: { createdAt: "desc" }, take: 20 },
      offer: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Audit log de consultation (tracabilité des accès lecture)
  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.adminId,
      action: "admin_analysis_list_viewed",
      entityType: "project",
      entityId: "all",
      metadata: JSON.stringify({ count: projects.length }),
    },
  });

  return NextResponse.json({ projects: ser(projects) });
}

// ============================================================================
// PATCH /api/admin/analysis
// ----------------------------------------------------------------------------
// Body: { projectId, targetStatus, note }
//
// Workflow:
// 1. requireAdmin(req) — vérifie la session admin
// 2. canActorTransition(current, target, admin.role) — sinon 403
// 3. canTransition(current, target) — sinon 400
// 4. Si targetStatus === "published" : crée l'Offer (figer commissions 6%/2%,
//    closingDate = now + 30j), offer.status="open"
// 5. Si targetStatus === "rejected" | "complement_requested" : stocke la note
// 6. Update projet + timestamps (reviewedAt, publishedAt, closedAt)
// 7. ProjectEvent + AuditLog
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

  const projectId = String(body.projectId || "");
  const targetStatus = String(body.targetStatus || "");
  const note = body.note ? String(body.note) : null;

  if (!projectId || !targetStatus) {
    return NextResponse.json(
      { error: "projectId et targetStatus requis" },
      { status: 400 }
    );
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { offer: true, company: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const fromStatus = project.status;

  // 1. Vérification du rôle pour cette transition
  if (!canActorTransition(fromStatus, targetStatus, admin.role)) {
    return NextResponse.json(
      { error: "Transition non autorisée pour votre rôle" },
      { status: 403 }
    );
  }

  // 2. Vérification de la validité de la transition
  if (!canTransition(fromStatus, targetStatus)) {
    return NextResponse.json(
      { error: `Transition invalide: ${fromStatus} → ${targetStatus}` },
      { status: 400 }
    );
  }

  const now = new Date();

  // Préparer les données de mise à jour
  const updateData: any = {
    status: targetStatus,
  };
  if (note) {
    if (targetStatus === "rejected") {
      updateData.rejectionReason = note;
      updateData.analysisNote = note;
    } else if (targetStatus === "complement_requested") {
      updateData.analysisNote = note;
    } else {
      updateData.analysisNote = note;
    }
  }
  if (
    ["approved", "rejected", "complement_requested"].includes(targetStatus) &&
    !project.reviewedAt
  ) {
    updateData.reviewedAt = now;
  }
  if (targetStatus === "published") {
    updateData.publishedAt = now;
  }
  if (targetStatus === "closed") {
    updateData.closedAt = now;
  }
  if (targetStatus === "funded" && !project.fundedAt) {
    updateData.fundedAt = now;
  }

  // Mise à jour du projet + création de l'Offer si published
  const updated = await db.$transaction(async (tx) => {
    const updatedProject = await tx.project.update({
      where: { id: projectId },
      data: updateData,
      include: { company: true, offer: true },
    });

    let offer = project.offer;

    // Si on publie → on crée l'Offer (figer conditions 6%/2%, closingDate +30j)
    if (targetStatus === "published" && !project.offer) {
      const closingDate = new Date();
      closingDate.setDate(closingDate.getDate() + 30);

      offer = await tx.offer.create({
        data: {
          projectId: project.id,
          version: 1,
          fundingGoal: project.fundingGoal,
          minInvestment: project.minInvestment,
          maxInvestment: project.maxInvestment,
          annualRate: project.annualRate,
          ratePeriod: project.ratePeriod,
          durationMonths: project.durationMonths,
          repaymentType: project.repaymentType,
          equityOfferedPct: project.equityOfferedPct,
          valuationPre: project.valuationPre,
          // Commissions figées contractuellement
          upfrontCommissionPct: 6,
          annualFollowUpPct: 2,
          raisedAmount: 0n,
          committedAmount: 0n,
          backersCount: 0,
          publishedAt: now,
          closingDate,
          visibility: "public",
          status: "open",
        },
      });
    }

    // ProjectEvent
    await tx.projectEvent.create({
      data: {
        projectId: project.id,
        eventType: targetStatus,
        description:
          (note ? note + " — " : "") +
          `Transition ${fromStatus} → ${targetStatus}`,
        actor: admin.adminId,
      },
    });

    return { updatedProject, offer };
  });

  // AuditLog (hors transaction : on ne bloque pas la mutation si l'audit échoue)
  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.adminId,
      action: `project_${targetStatus}`,
      entityType: "project",
      entityId: project.id,
      metadata: JSON.stringify({
        from: fromStatus,
        to: targetStatus,
        note,
        offerCreated: targetStatus === "published" && !project.offer,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // Notification à l'entreprise (le soumetteur du projet)
  const notifMap: Record<string, { title: string; message: string }> = {
    under_review: {
      title: "Dossier en cours d'analyse",
      message: `Votre dossier « ${project.title} » est en cours d'analyse.`,
    },
    complement_requested: {
      title: "Complément demandé",
      message: `Des compléments ont été demandés sur « ${project.title} »${note ? ` : ${note}` : ""}.`,
    },
    approved: {
      title: "Dossier approuvé",
      message: `Votre dossier « ${project.title} » a été approuvé par notre équipe.`,
    },
    rejected: {
      title: "Dossier refusé",
      message: `Votre dossier « ${project.title} » a été refusé${note ? ` : ${note}` : ""}.`,
    },
    published: {
      title: "Offre publiée",
      message: `L'offre « ${project.title} » est désormais publiée et ouverte aux souscriptions.`,
    },
    funded: {
      title: "Financement atteint",
      message: `Le financement de « ${project.title} » est atteint. Le décaissement sera préparé.`,
    },
  };
  const notif = notifMap[targetStatus];
  if (notif) {
    await db.notification
      .create({
        data: {
          userId: project.submittedBy,
          type: "decision",
          title: notif.title,
          message: notif.message,
          actionUrl: "company_dashboard",
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({
    project: ser(updated.updatedProject),
    offer: updated.offer ? ser(updated.offer) : null,
  });
}
