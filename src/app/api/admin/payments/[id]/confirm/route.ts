import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { postLedgerEntry, genIdemKey } from "@/lib/ledger";
import { simulateDebtFinancing } from "@/lib/finance";

// ============================================================================
// POST /api/admin/payments/[id]/confirm
// ----------------------------------------------------------------------------
// Confirme la réception d'une échéance payée par l'entreprise.
// - requireAdmin(req) + requirePermission("payment:confirm")
// - Vérifie CompanyPayment existe, status="verifying"
// - Idempotence : si déjà paid → retour
// - Update: status="paid", paidAt, paidAmount=totalDue
// - Ledger: company_incoming → escrow (le flux de trésorerie de l'entreprise
//   vers le séquestre)
// - Pour chaque Investment confirmé sur l'Offer liée au projet :
//   * Calcul pro-rata (capitalPortion + interestPortion) via finance.ts
//   * Création Distribution (status="available", availableAt=now)
//   * Ledger: escrow → investor_wallet (la distribution tombe dans le wallet)
// - AuditLog
// ============================================================================
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
  try {
    requirePermission(admin, "payment:confirm");
  } catch {
    return NextResponse.json(
      { error: "Permission refusée: payment:confirm" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const payment = await db.companyPayment.findUnique({
    where: { id },
    include: {
      project: { include: { company: true, offer: true } },
    },
  });
  if (!payment) {
    return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({
      payment: ser(payment),
      idempotent: true,
      message: "Échéance déjà confirmée",
    });
  }
  if (payment.status !== "verifying") {
    return NextResponse.json(
      {
        error: `L'échéance doit être au statut « verifying » (actuel: ${payment.status})`,
      },
      { status: 400 }
    );
  }

  const offer = payment.project.offer;
  if (!offer) {
    return NextResponse.json(
      { error: "Aucune offre liée à ce projet" },
      { status: 400 }
    );
  }

  const now = new Date();

  // 1. Marquer comme payé
  const updatedPayment = await db.companyPayment.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      paidAt: now,
      paidAmount: payment.totalDue,
      remaining: 0n,
    },
  });

  // 2. Ledger : company_incoming (l'entreprise verse) → escrow (séquestre)
  const payIdem = genIdemKey("cmp", payment.id);
  await postLedgerEntry(
    {
      accountType: "company_incoming",
      accountId: payment.project.companyId,
      amount: payment.totalDue,
      counterpartyType: "escrow",
      counterpartyId: offer.id,
      sourceType: "company_payment",
      sourceId: payment.id,
      description: `Paiement échéance ${payment.installmentNo} - ${payment.project.title}`,
      idemKey: payIdem,
    },
    {
      accountType: "escrow",
      accountId: offer.id,
      amount: payment.totalDue,
      counterpartyType: "company_incoming",
      counterpartyId: payment.project.companyId,
      sourceType: "company_payment",
      sourceId: payment.id,
      description: `Échéance reçue - ${payment.project.title}`,
      idemKey: payIdem + ":credit",
    }
  );

  // 3. Récupérer tous les investissements confirmés pour distribuer
  const investments = await db.investment.findMany({
    where: {
      offerId: offer.id,
      status: "confirmed",
    },
  });

  // Simulation dette pour répartir capital + intérêts au prorata
  const sim = simulateDebtFinancing({
    principal: offer.fundingGoal,
    annualRate: offer.annualRate || 0,
    ratePeriod: (offer.ratePeriod as "total" | "annual") || "total",
    durationMonths: offer.durationMonths || 0,
    repaymentType: (offer.repaymentType as "bullet" | "amortized") || "bullet",
    upfrontCommissionPct: offer.upfrontCommissionPct,
    annualFollowUpPct: offer.annualFollowUpPct,
  });

  // Capital total + intérêts à répartir = capitalPlusInterest
  const totalToDistribute = sim.capitalPlusInterest;
  // Suivi = followUpCommission (versée à la plateforme)
  const followUp = sim.followUpCommission;

  // Pour chaque investisseur : pro-rata selon son montant investi
  const distributions: any[] = [];
  for (const inv of investments) {
    if (offer.fundingGoal === 0n) continue;
    const ratio = Number(inv.amount) / Number(offer.fundingGoal);
    const distributionAmount =
      (totalToDistribute * inv.amount) / offer.fundingGoal;
    // capital vs intérêts : ratio identique, on découpe
    const capitalPortion =
      (sim.principal * inv.amount) / offer.fundingGoal;
    const interestPortion = distributionAmount - capitalPortion;

    const dist = await db.distribution.create({
      data: {
        companyPaymentId: payment.id,
        investmentId: inv.id,
        amount: distributionAmount,
        capitalPortion,
        interestPortion,
        feePortion: 0n, // pas de frais investisseur (0%)
        status: "available",
        availableAt: now,
      },
    });
    distributions.push(dist);

    // Ledger : escrow → investor_wallet (distribution)
    const distIdem = genIdemKey("dist", dist.id);
    await postLedgerEntry(
      {
        accountType: "escrow",
        accountId: offer.id,
        amount: distributionAmount,
        counterpartyType: "investor_wallet",
        counterpartyId: inv.investorId,
        sourceType: "distribution",
        sourceId: dist.id,
        description: `Distribution échéance ${payment.installmentNo} - investissement ${inv.id}`,
        idemKey: distIdem,
      },
      {
        accountType: "investor_wallet",
        accountId: inv.investorId,
        amount: distributionAmount,
        counterpartyType: "escrow",
        counterpartyId: offer.id,
        sourceType: "distribution",
        sourceId: dist.id,
        description: `Reçu : ${capitalPortion} capital + ${interestPortion} intérêts (échéance ${payment.installmentNo})`,
        idemKey: distIdem + ":credit",
      }
    );

    // Notification à l'investisseur
    await db.notification
      .create({
        data: {
          userId: inv.investorId,
          type: "payment",
          title: "Remboursement reçu",
          message: `Vous avez reçu ${distributionAmount} FCFA sur l'offre « ${payment.project.title} » (échéance ${payment.installmentNo}). Disponible dans votre portefeuille.`,
          actionUrl: "investor_dashboard",
        },
      })
      .catch(() => {});
  }

  // Commission de suivi versée à la plateforme (2%/an)
  if (followUp > 0n) {
    const followUpIdem = genIdemKey("fup", payment.id);
    await postLedgerEntry(
      {
        accountType: "escrow",
        accountId: offer.id,
        amount: followUp,
        counterpartyType: "platform_revenue",
        counterpartyId: "platform",
        sourceType: "commission",
        sourceId: payment.id,
        description: `Commission de suivi 2%/an - échéance ${payment.installmentNo}`,
        idemKey: followUpIdem,
      },
      {
        accountType: "platform_revenue",
        accountId: "platform",
        amount: followUp,
        counterpartyType: "escrow",
        counterpartyId: offer.id,
        sourceType: "commission",
        sourceId: payment.id,
        description: `Commission de suivi reçue - échéance ${payment.installmentNo}`,
        idemKey: followUpIdem + ":credit",
      }
    );
  }

  // ProjectEvent
  await db.projectEvent.create({
    data: {
      projectId: payment.projectId,
      eventType: "payment_confirmed",
      description: `Échéance ${payment.installmentNo} confirmée : ${payment.totalDue} FCFA. ${distributions.length} distributions effectuées.`,
      actor: admin.adminId,
    },
  });

  // AuditLog
  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.adminId,
      action: "company_payment_confirmed",
      entityType: "company_payment",
      entityId: payment.id,
      metadata: JSON.stringify({
        totalDue: payment.totalDue.toString(),
        distributionsCount: distributions.length,
        followUpCommission: followUp.toString(),
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({
    payment: ser(updatedPayment),
    distributions: ser(distributions),
    notice: `Échéance confirmée. ${distributions.length} investisseurs crédités.`,
  });
}
