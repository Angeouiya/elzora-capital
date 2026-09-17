import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { genIdemKey } from "@/lib/ledger";

// ============================================================================
// GET /api/company/payments
// ----------------------------------------------------------------------------
// Liste les CompanyPayment (échéances) des projets de l'entreprise courante.
// ============================================================================
export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const memberships = await db.companyMember.findMany({
    where: { userId: session.userId },
    select: { companyId: true },
  });
  if (memberships.length === 0) {
    return NextResponse.json({ payments: [], projects: [] });
  }
  const companyIds = memberships.map((m) => m.companyId);

  const projects = await db.project.findMany({
    where: { companyId: { in: companyIds } },
    select: { id: true, title: true, companyId: true },
  });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ payments: [], projects: [] });
  }

  const payments = await db.companyPayment.findMany({
    where: { projectId: { in: projectIds } },
    include: { project: { include: { company: true } } },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ payments: ser(payments), projects: ser(projects) });
}

// ============================================================================
// POST /api/company/payments
// Body: { paymentId }
// ----------------------------------------------------------------------------
// L'entreprise DÉCLARE avoir payé une échéance. Le paiement N'est PAS confirmé
// (spec 17 : "Une échéance ne devient pas payée simplement parce que
// l'entreprise déclare l'avoir réglée"). La confirmation viendra de l'admin
// après vérification de la réception bancaire.
//
// - requireUser(req) + vérification de l'appartenance à la société du projet
// - Update CompanyPayment: status="verifying", paymentRef unique
// - Retourne les instructions + notice
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

  const paymentId = String(body.paymentId || "");
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId requis" }, { status: 400 });
  }

  const payment = await db.companyPayment.findUnique({
    where: { id: paymentId },
    include: { project: { include: { company: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  }

  // Vérification d'appartenance à la société du projet
  const membership = await db.companyMember.findFirst({
    where: { userId: session.userId, companyId: payment.project.companyId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'êtes pas membre de cette entreprise" },
      { status: 403 }
    );
  }

  // Idempotence : déjà payée / en vérification
  if (payment.status === "paid") {
    return NextResponse.json({
      payment: ser(payment),
      idempotent: true,
      message: "Échéance déjà confirmée comme payée.",
    });
  }
  if (payment.status === "verifying" && payment.paymentRef) {
    return NextResponse.json({
      payment: ser(payment),
      idempotent: true,
      message: "Échéance déjà déclarée comme payée, en attente de vérification.",
    });
  }

  const paymentRef = genIdemKey("ech", payment.id);
  const updated = await db.companyPayment.update({
    where: { id: payment.id },
    data: {
      status: "verifying",
      paymentRef,
      paidAmount: payment.totalDue,
    },
    include: { project: { include: { company: true } } },
  });

  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: "company_payment_declared",
      entityType: "company_payment",
      entityId: payment.id,
      metadata: JSON.stringify({
        projectId: payment.projectId,
        totalDue: payment.totalDue.toString(),
        paymentRef,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({
    payment: ser(updated),
    notice:
      "Votre déclaration de paiement a été enregistrée. " +
      "L'échéance ne sera considérée comme réglée qu'après vérification " +
      "de la réception effective des fonds par notre équipe. " +
      "Vous recevrez une notification de confirmation.",
    instructions: {
      paymentRef,
      amount: Number(payment.totalDue),
      bankAccount: "DÉMONSTRATION — IBAN fictif",
      nextStep: "Notre équipe confirme la réception des fonds.",
    },
  });
}
