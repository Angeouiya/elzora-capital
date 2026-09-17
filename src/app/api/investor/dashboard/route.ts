import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { getBalance } from "@/lib/ledger";
import { simulateDebtFinancing } from "@/lib/finance";

// ============================================================================
// GET /api/investor/dashboard
// ----------------------------------------------------------------------------
// Tableau de bord investisseur — basé UNIQUEMENT sur la session courante.
// AUCUN paramètre `email` (fix IDOR). Tout est dérivé de la session + ledger.
//
// Données renvoyées:
// - user (id, email, firstName, lastName, country, kycStatus)
// - investments[] (toutes — confirmed + pending + cancelled), avec pour chaque:
//     - expectedRepayment (pour dette : perInvestorRepayment)
//     - receivedToDate (somme des distributions reçues sur cet investissement)
//     - remainingDue (expected - received)
//     - availableBalance (solde du wallet — global à l'investisseur)
// - portfolio: { totalInvested, availableBalance, receivedTotal, bySector }
// - notifications[]
// ============================================================================
export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      language: true,
      kycStatus: true,
    },
  });
  if (!user) {
    return NextResponse.json({ user: null, investments: [], portfolio: null });
  }

  // Tous les investissements de l'utilisateur (peu importe le statut — l'UI peut distinguer)
  const investments = await db.investment.findMany({
    where: { investorId: user.id },
    include: { project: { include: { company: true } }, offer: true },
    orderBy: { createdAt: "desc" },
  });

  // Solde disponible du wallet via ledger
  const availableBalance = await getBalance("investor_wallet", user.id);

  // Distributions reçues par investissement
  const investmentIds = investments.map((i) => i.id);
  const distributions = investmentIds.length
    ? await db.distribution.findMany({
        where: { investmentId: { in: investmentIds } },
        select: {
          investmentId: true,
          amount: true,
          capitalPortion: true,
          interestPortion: true,
        },
      })
    : [];

  // Regrouper les distributions par investmentId
  const distByInv: Record<string, bigint> = {};
  let receivedTotal = 0n;
  for (const d of distributions) {
    if (!distByInv[d.investmentId]) distByInv[d.investmentId] = 0n;
    distByInv[d.investmentId] += d.amount;
    receivedTotal += d.amount;
  }

  // Calculer pour chaque investissement : expectedRepayment / receivedToDate / remainingDue
  const enrichedInvestments = investments.map((inv) => {
    const receivedToDate = distByInv[inv.id] || 0n;
    let expectedRepayment: bigint | null = null;
    let remainingDue: bigint | null = null;
    let projection: string | null = null;

    if (inv.project.instrumentType === "debt" && inv.offer) {
      const sim = simulateDebtFinancing({
        principal: inv.offer.fundingGoal,
        annualRate: inv.offer.annualRate || 0,
        ratePeriod: (inv.offer.ratePeriod as "total" | "annual") || "total",
        durationMonths: inv.offer.durationMonths || 0,
        repaymentType:
          (inv.offer.repaymentType as "bullet" | "amortized") || "bullet",
        upfrontCommissionPct: inv.offer.upfrontCommissionPct,
        annualFollowUpPct: inv.offer.annualFollowUpPct,
      });
      expectedRepayment = sim.perInvestorRepayment(inv.amount);
      remainingDue = expectedRepayment - receivedToDate;
      if (remainingDue < 0n) remainingDue = 0n;
      projection = "attendu"; // explicitement "attendu" — projeté, pas reçu
    } else if (inv.project.instrumentType === "equity") {
      // Pour les actions : pas de schedule de remboursement — sortie à terme non garantie
      projection = "equity_no_schedule";
    }

    return {
      ...ser(inv),
      expectedRepayment: expectedRepayment !== null ? Number(expectedRepayment) : null,
      receivedToDate: Number(receivedToDate),
      remainingDue: remainingDue !== null ? Number(remainingDue) : null,
      availableBalance: Number(availableBalance),
      projectionLabel:
        inv.project.instrumentType === "equity"
          ? "Sortie à terme, non garantie"
          : projection,
    };
  });

  // Total investi = somme des investissements confirmés
  const totalInvested = investments
    .filter((i) => i.status === "confirmed")
    .reduce((acc, i) => acc + i.amount, 0n);

  // Répartition par secteur (investissements confirmés)
  const bySectorMap: Record<string, bigint> = {};
  for (const inv of investments) {
    if (inv.status !== "confirmed" || !inv.project) continue;
    const sec = inv.project.sector;
    if (!bySectorMap[sec]) bySectorMap[sec] = 0n;
    bySectorMap[sec] += inv.amount;
  }

  // Pending payments count
  const pendingPayments = investments.filter(
    (i) => i.status === "pending_payment"
  ).length;

  // Notifications
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return NextResponse.json({
    user: ser(user),
    investments: enrichedInvestments,
    portfolio: {
      totalInvested: Number(totalInvested),
      availableBalance: Number(availableBalance),
      receivedTotal: Number(receivedTotal),
      pendingPayments,
      activeDeals: investments.filter((i) => i.status === "confirmed").length,
      bySector: Object.entries(bySectorMap).map(([name, value]) => ({
        name,
        value: Number(value),
      })),
    },
    notifications: ser(notifications),
  });
}
