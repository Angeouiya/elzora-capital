import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAdvancedRepaymentSchedule } from "@/lib/calculations";
import { getFinalTerms, validateFinancialProposal, writeProjectBudget } from "@/lib/finance-proposal";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const { id } = await params;
    const offer = await prisma.offer.findUnique({ where: { id }, include: { project: { include: { company: true } }, repayments: true } });
    if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    const body = await req.json();
    const action = body.action ?? "update";

    if (action === "update") {
      if (offer.status !== "DRAFT") return NextResponse.json({ error: "Seule une offre en brouillon peut être modifiée." }, { status: 409 });
      const current = getFinalTerms(offer.project);
      const finalTerms = { ...current, ...(body.terms ?? {}) };
      const errors = validateFinancialProposal(finalTerms, offer.project.requestedAmount);
      if (errors.length) return NextResponse.json({ error: "Conditions invalides", details: errors }, { status: 400 });
      const updated = await prisma.offer.update({
        where: { id },
        data: {
          type: finalTerms.type,
          rate: finalTerms.type === "EQUITY" ? finalTerms.equityPercentBps : finalTerms.rateBps,
          ratePeriod: finalTerms.ratePeriod,
          duration: finalTerms.type === "EQUITY" ? finalTerms.exitHorizonMonths : finalTerms.durationMonths,
          minTicket: finalTerms.minTicket,
          maxTicket: finalTerms.maxTicket,
        },
      });
      await prisma.project.update({
        where: { id: offer.projectId },
        data: { status: "OFFER_PREPARED", budget: writeProjectBudget(offer.project.budget, { finalTerms: finalTerms as unknown as Record<string, unknown> }) },
      });
      await prisma.notification.create({
        data: { userId: offer.project.company.userId, type: "PUBLICATION", title: "Conditions mises à jour", message: "Les conditions finales ont été modifiées et nécessitent une nouvelle confirmation de votre entreprise." },
      });
      return NextResponse.json(updated);
    }

    if (action === "publish") {
      if (offer.status !== "DRAFT" || offer.project.status !== "OFFER_CONFIRMED") return NextResponse.json({ error: "L'entreprise doit confirmer les conditions avant publication." }, { status: 409 });
      const terms = getFinalTerms(offer.project);
      const startDate = body.startDate ? new Date(body.startDate) : new Date();
      const endDate = body.endDate ? new Date(body.endDate) : new Date(new Date(startDate).setMonth(startDate.getMonth() + offer.duration));
      const updated = await prisma.offer.update({ where: { id }, data: { status: "PUBLISHED", startDate, endDate, publishedAt: new Date() } });
      if (offer.type === "DEBT" && offer.repayments.length === 0) {
        const schedule = generateAdvancedRepaymentSchedule({
          principal: offer.targetAmount,
          rateBps: offer.rate,
          ratePeriod: offer.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL",
          durationMonths: offer.duration,
          paymentFrequency: terms.paymentFrequency,
          repaymentMode: terms.repaymentMode,
          graceMonths: terms.graceMonths,
          interestBase: terms.interestBase,
          startDate,
        });
        await prisma.repayment.createMany({ data: schedule.map((row) => ({ offerId: id, scheduleDate: row.date, capitalAmount: row.capital, interestAmount: row.interest, feeAmount: row.fee })) });
      }
      await prisma.project.update({ where: { id: offer.projectId }, data: { status: "PUBLISHED" } });
      await prisma.notification.create({ data: { userId: offer.project.company.userId, type: "PUBLICATION", title: "Offre publiée", message: "Votre offre est maintenant publiée selon les conditions que vous avez confirmées." } });
      await prisma.auditLog.create({ data: { userId: session.user.id, action: "OFFER_PUBLISHED", entity: "Offer", entityId: id } });
      return NextResponse.json(updated);
    }

    if (action === "suspend") {
      if (offer.status !== "PUBLISHED") return NextResponse.json({ error: "Cette offre ne peut pas être suspendue." }, { status: 409 });
      const updated = await prisma.offer.update({ where: { id }, data: { status: "SUSPENDED" } });
      await prisma.auditLog.create({ data: { userId: session.user.id, action: "OFFER_SUSPENDED", entity: "Offer", entityId: id } });
      return NextResponse.json(updated);
    }

    if (action === "resume") {
      if (offer.status !== "SUSPENDED") return NextResponse.json({ error: "Cette offre n'est pas suspendue." }, { status: 409 });
      const updated = await prisma.offer.update({ where: { id }, data: { status: "PUBLISHED" } });
      await prisma.auditLog.create({ data: { userId: session.user.id, action: "OFFER_RESUMED", entity: "Offer", entityId: id } });
      return NextResponse.json(updated);
    }

    if (action === "close") {
      if (!["PUBLISHED", "SUSPENDED"].includes(offer.status)) return NextResponse.json({ error: "Cette collecte n'est pas clôturable." }, { status: 409 });
      const terms = getFinalTerms(offer.project);
      const success = offer.collectedAmount >= terms.minimumGoal;
      const updated = await prisma.offer.update({ where: { id }, data: { status: success ? "CLOSED_SUCCESS" : "CLOSED_FAIL", endDate: new Date() } });
      await prisma.auditLog.create({ data: { userId: session.user.id, action: success ? "OFFER_CLOSED_SUCCESS" : "OFFER_CLOSED_FAIL", entity: "Offer", entityId: id } });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
