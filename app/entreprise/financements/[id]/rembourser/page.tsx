"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  Info,
  Landmark,
  LoaderCircle,
  Receipt,
  Send,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFCFA, formatRate } from "@/lib/calculations";

interface Repayment {
  id: string;
  scheduleDate: string;
  capitalAmount: number;
  interestAmount: number;
  feeAmount: number;
  status: string;
  paidAmount: number;
  paidAt?: string | null;
  reference?: string | null;
}

interface Offer {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  targetAmount: number;
  collectedAmount: number;
  investorCount: number;
  status: string;
  repayments: Repayment[];
  project?: { title: string; company?: { name: string } | null } | null;
  _count?: { investments: number };
}

const STATUS_LEGEND: Array<{ status: string; desc: string }> = [
  { status: "UPCOMING", desc: "Échéance à venir, rien à faire pour l'instant" },
  { status: "DUE", desc: "À régler avant la date indiquée" },
  { status: "VERIFICATION", desc: "Paiement reçu, en cours de vérification par Nexora" },
  { status: "PARTIAL", desc: "Partiellement réglée, le solde reste dû" },
  { status: "LATE", desc: "Échéance dépassée — régularisez sans délai" },
  { status: "PAID", desc: "Réglée et redistribuée aux investisseurs" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function totalOf(r: Repayment): number {
  return r.capitalAmount + r.interestAmount + r.feeAmount;
}

function remainingOf(r: Repayment): number {
  return Math.max(totalOf(r) - r.paidAmount, 0);
}

/** Réference unique de paiement affichée à l'entreprise pour le virement */
function paymentReference(repaymentId: string): string {
  return `RMB-${repaymentId.slice(-8).toUpperCase()}`;
}

export default function RembourserPage() {
  const params = useParams();
  const offerId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [payModalFor, setPayModalFor] = useState<Repayment | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<{ ref: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Statut local transitoire (En vérification) pendant l'appel API */
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/offers/${offerId}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Financement introuvable." : "Chargement impossible.");
        }
        const data = (await res.json()) as Offer;
        if (!cancelled) setOffer(data);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Une erreur est survenue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const repayments = offer?.repayments ?? [];

  const totals = useMemo(() => {
    const capital = repayments.reduce((s, r) => s + r.capitalAmount, 0);
    const interest = repayments.reduce((s, r) => s + r.interestAmount, 0);
    const fees = repayments.reduce((s, r) => s + r.feeAmount, 0);
    const total = repayments.reduce((s, r) => s + totalOf(r), 0);
    const paid = repayments.reduce((s, r) => s + r.paidAmount, 0);
    const remaining = repayments.reduce((s, r) => s + remainingOf(r), 0);
    return { capital, interest, fees, total, paid, remaining };
  }, [repayments]);

  const nextDue = useMemo(
    () =>
      repayments
        .filter((r) => r.status !== "PAID")
        .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime())[0] ??
      null,
    [repayments]
  );

  const lateCount = repayments.filter((r) => r.status === "LATE").length;

  const copyReference = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible : la référence reste visible */
    }
  };

  const simulatePayment = async (repayment: Repayment) => {
    setPayError(null);
    setVerifying(true);
    setVerifyingIds((prev) => new Set(prev).add(repayment.id));

    // Simulation : le paiement passe par la case « vérification » avant confirmation
    await new Promise((resolve) => setTimeout(resolve, 1400));

    try {
      const res = await fetch(`/api/repayments/${repayment.id}/pay`, { method: "POST" });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as Repayment;

      setOffer((o) =>
        o
          ? {
              ...o,
              repayments: o.repayments.map((r) => (r.id === updated.id ? updated : r)),
            }
          : o
      );
      setPaySuccess({ ref: updated.reference ?? paymentReference(repayment.id) });
      setBanner(
        `Paiement confirmé (réf. ${updated.reference ?? paymentReference(repayment.id)}). Les parts de chaque investisseur ont été créditées et sont disponibles au retrait.`
      );
    } catch {
      setPayError("Le paiement n'a pas pu être enregistré. Réessayez.");
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(repayment.id);
        return next;
      });
      setVerifying(false);
    }
  };

  const closeModal = () => {
    setPayModalFor(null);
    setPaySuccess(null);
    setPayError(null);
  };

  if (loading) {
    return (
      <EntrepriseShell title="Remboursement">
        <div className="flex items-center justify-center py-24 text-[#101010]/40">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      </EntrepriseShell>
    );
  }

  if (loadError || !offer) {
    return (
      <EntrepriseShell title="Remboursement">
        <Card className="text-center py-12">
          <CircleAlert className="h-10 w-10 text-[#C62828] mx-auto" />
          <p className="font-semibold text-[#101010] mt-4">{loadError ?? "Financement introuvable."}</p>
          <Link href="/entreprise/financements" className="inline-block mt-6">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour aux financements
            </Button>
          </Link>
        </Card>
      </EntrepriseShell>
    );
  }

  const projectTitle = offer.project?.title ?? "Financement";
  const companyName = offer.project?.company?.name ?? null;
  const investors = offer.investorCount || offer._count?.investments || 0;

  return (
    <EntrepriseShell
      title="Remboursement"
      subtitle={`${projectTitle}${companyName ? ` · ${companyName}` : ""}`}
      companyName={companyName}
      actions={
        <Link href="/entreprise/financements">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Financements
          </Button>
        </Link>
      }
    >
      <div className="space-y-6 max-w-6xl">
        {/* ===== Récapitulatif de l'offre ===== */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#101010]">{projectTitle}</h2>
            <Badge variant="accent">{offer.type === "EQUITY" ? "Équité" : "Dette"}</Badge>
            <StatusBadge status={offer.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5 text-sm">
            <div>
              <p className="text-xs text-[#101010]/50 uppercase tracking-wide flex items-center gap-1">
                <Landmark className="h-3 w-3" /> Capital financé
              </p>
              <p className="font-bold text-[#101010] mt-1">{formatFCFA(offer.collectedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-[#101010]/50 uppercase tracking-wide flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Taux
              </p>
              <p className="font-bold text-[#101010] mt-1">
                {formatRate(offer.rate)}{" "}
                <span className="font-normal text-[#101010]/50 text-xs">
                  {offer.ratePeriod === "TOTAL" ? "au total" : "par an"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[#101010]/50 uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Durée
              </p>
              <p className="font-bold text-[#101010] mt-1">{offer.duration} mois</p>
            </div>
            <div>
              <p className="text-xs text-[#101010]/50 uppercase tracking-wide flex items-center gap-1">
                <Users className="h-3 w-3" /> Investisseurs
              </p>
              <p className="font-bold text-[#101010] mt-1">{investors}</p>
            </div>
            <div>
              <p className="text-xs text-[#101010]/50 uppercase tracking-wide flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Prochaine échéance
              </p>
              <p className="font-bold text-[#101010] mt-1">
                {nextDue ? formatDate(nextDue.scheduleDate) : "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* ===== Message clé : paiement global ===== */}
        <div className="flex items-start gap-3 rounded-xl border border-[#B6FF00]/50 bg-[#EFFBDD] p-4 sm:p-5">
          <ShieldCheck className="h-5 w-5 text-[#166534] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#101010]">
              Vous payez globalement, pas investisseur par investisseur
            </p>
            <p className="text-xs text-[#101010]/70 mt-1 leading-relaxed">
              Un seul virement par échéance suffit, pour le montant total. Nexora répartit ensuite
              automatiquement la part de chacun des {investors} investisseurs, au prorata de sa
              souscription — aucune action de votre part.
            </p>
          </div>
        </div>

        {banner && (
          <div className="flex items-start gap-2 rounded-xl border border-[#166534]/20 bg-[#EFFBDD] px-4 py-3 text-sm text-[#166534]">
            <CircleCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{banner}</p>
          </div>
        )}

        {lateCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-[#C62828]/30 bg-[#C62828]/5 px-4 py-3 text-sm text-[#C62828]">
            <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {lateCount} échéance{lateCount > 1 ? "s" : ""} en retard — régularisez en priorité
              pour préserver la confiance des investisseurs et votre notation sur la plateforme.
            </p>
          </div>
        )}

        {/* ===== Indicateurs ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI
            label="Total remboursé à ce jour"
            value={formatFCFA(totals.paid)}
            icon={<CircleCheck className="h-5 w-5 text-[#101010]" />}
            trend="up"
            trendValue={`${repayments.filter((r) => r.status === "PAID").length} échéance(s) réglée(s)`}
          />
          <KPI
            label="Reste à payer"
            value={formatFCFA(totals.remaining)}
            icon={<Wallet className="h-5 w-5 text-[#101010]" />}
            trend="neutral"
            trendValue={`sur un total de ${formatFCFA(totals.total)}`}
          />
          <KPI
            label="Prochaine échéance"
            value={nextDue ? formatFCFA(totalOf(nextDue)) : "—"}
            icon={<CalendarClock className="h-5 w-5 text-[#101010]" />}
            trend={nextDue?.status === "DUE" || nextDue?.status === "LATE" ? "down" : "neutral"}
            trendValue={nextDue ? `À payer le ${formatDate(nextDue.scheduleDate)}` : "Aucune échéance"}
          />
        </div>

        {/* ===== Échéancier ===== */}
        <Card padding="none" id="echeancier">
          <div className="p-4 sm:p-6 pb-0">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 mb-0">
              <CardTitle>Échéancier complet</CardTitle>
              <Badge variant="default">
                {repayments.length} échéance{repayments.length > 1 ? "s" : ""}
              </Badge>
            </CardHeader>
          </div>

          {repayments.length === 0 ? (
            <p className="text-sm text-[#101010]/50 px-6 py-10 text-center">
              Aucun échéancier pour ce financement (les échéanciers concernent les offres de type
              dette).
            </p>
          ) : (
            <>
              <div className="md:hidden mt-4 px-4 space-y-3">
              {repayments.map((r, i) => {
                const effectiveStatus = verifyingIds.has(r.id) ? "VERIFICATION" : r.status;
                const canPay = (r.status === "DUE" || r.status === "LATE" || r.status === "PARTIAL") && !verifyingIds.has(r.id);
                return (
                  <article key={r.id} className="rounded-xl border border-[#101010]/8 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-semibold text-[#101010]">Échéance #{i + 1}</p><p className="text-xs text-[#101010]/55">{formatDate(r.scheduleDate)}</p></div>
                      <StatusBadge status={effectiveStatus} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><p className="text-xs text-[#101010]/50">Total</p><p className="font-semibold">{formatFCFA(totalOf(r))}</p></div>
                      <div><p className="text-xs text-[#101010]/50">Reste</p><p className={r.status === "LATE" ? "font-semibold text-[#C62828]" : "font-semibold text-[#101010]"}>{formatFCFA(remainingOf(r))}</p></div>
                      <div><p className="text-xs text-[#101010]/50">Capital</p><p>{r.capitalAmount ? formatFCFA(r.capitalAmount) : "—"}</p></div>
                      <div><p className="text-xs text-[#101010]/50">Intérêts</p><p>{formatFCFA(r.interestAmount)}</p></div>
                    </div>
                    {canPay && <Button className="w-full" size="md" icon={<Banknote className="h-4 w-4" />} onClick={() => { setCopied(false); setPayModalFor(r); }}>Régler l’échéance</Button>}
                    {r.status === "PAID" && r.reference && <p className="text-xs font-mono text-[#101010]/45">Référence : {r.reference}</p>}
                  </article>
                );
              })}
              <div className="rounded-xl bg-[#F5F5F3] p-4 text-sm"><span className="text-[#101010]/55">Total restant</span><p className="mt-1 text-lg font-bold">{formatFCFA(totals.remaining)}</p></div>
            </div>
            <div className="hidden md:block overflow-x-auto overscroll-x-contain mt-4">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-[#F5F5F3] border-y border-[#101010]/5">
                    {[
                      "Échéance",
                      "Date",
                      "Capital",
                      "Intérêts",
                      "Frais",
                      "Total",
                      "Payé",
                      "Reste",
                      "Statut",
                      "Action",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101010]/5">
                  {repayments.map((r, i) => {
                    const effectiveStatus = verifyingIds.has(r.id) ? "VERIFICATION" : r.status;
                    const canPay =
                      (r.status === "DUE" || r.status === "LATE" || r.status === "PARTIAL") &&
                      !verifyingIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          r.status === "LATE"
                            ? "bg-[#C62828]/[0.03]"
                            : r.status === "DUE"
                              ? "bg-amber-50/40"
                              : "hover:bg-[#F5F5F3]/50"
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-[#101010]">#{i + 1}</td>
                        <td className="px-4 py-3 text-[#101010]/80">{formatDate(r.scheduleDate)}</td>
                        <td className="px-4 py-3 text-[#101010]/80">
                          {r.capitalAmount ? formatFCFA(r.capitalAmount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-[#101010]/80">{formatFCFA(r.interestAmount)}</td>
                        <td className="px-4 py-3 text-[#101010]/80">
                          {r.feeAmount ? formatFCFA(r.feeAmount) : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#101010]">
                          {formatFCFA(totalOf(r))}
                        </td>
                        <td className="px-4 py-3 text-[#101010]/60">
                          {r.paidAmount ? formatFCFA(r.paidAmount) : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {remainingOf(r) > 0 ? (
                            <span className={r.status === "LATE" ? "text-[#C62828]" : "text-[#101010]"}>
                              {formatFCFA(remainingOf(r))}
                            </span>
                          ) : (
                            <span className="text-[#166534]">0 FCFA</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={effectiveStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {canPay ? (
                            <Button
                              size="sm"
                              icon={<Banknote className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setCopied(false);
                                setPayModalFor(r);
                              }}
                            >
                              Régler
                            </Button>
                          ) : r.status === "PAID" && r.reference ? (
                            <span className="text-[10px] font-mono text-[#101010]/40">
                              {r.reference}
                            </span>
                          ) : (
                            <span className="text-xs text-[#101010]/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F5F5F3] border-t-2 border-[#101010]/10 font-bold text-[#101010]">
                    <td className="px-4 py-3" colSpan={2}>
                      Totaux
                    </td>
                    <td className="px-4 py-3">{formatFCFA(totals.capital)}</td>
                    <td className="px-4 py-3">{formatFCFA(totals.interest)}</td>
                    <td className="px-4 py-3">{formatFCFA(totals.fees)}</td>
                    <td className="px-4 py-3">{formatFCFA(totals.total)}</td>
                    <td className="px-4 py-3">{formatFCFA(totals.paid)}</td>
                    <td className="px-4 py-3">{formatFCFA(totals.remaining)}</td>
                    <td className="px-4 py-3" colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}

          <div className="px-4 sm:px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 mb-3">
              Légende des statuts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STATUS_LEGEND.map((legend) => (
                <div key={legend.status} className="flex items-center gap-2 text-xs text-[#101010]/60">
                  <StatusBadge status={legend.status} />
                  <span>{legend.desc}</span>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 text-xs text-[#101010]/50 mt-5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Après chaque paiement : vérification par Nexora (24 h ouvrées), puis distribution
              automatique aux investisseurs. La référence de virement garantit le rapprochement
              automatique.
            </p>
          </div>
        </Card>
      </div>

      {/* ===== Modal : régler une échéance ===== */}
      <Modal
        open={payModalFor !== null}
        onClose={closeModal}
        title={paySuccess ? "Paiement enregistré" : `Régler l'échéance`}
      >
        {payModalFor && (
          <>
            {paySuccess ? (
              <div className="text-center py-4">
                <CircleCheck className="h-12 w-12 text-[#166534] mx-auto" />
                <p className="font-bold text-[#101010] mt-4">
                  Paiement confirmé et redistribué
                </p>
                <p className="text-sm text-[#101010]/60 mt-2">
                  Référence : <span className="font-mono font-semibold">{paySuccess.ref}</span>.
                  La part de chaque investisseur a été créditée et est disponible au retrait.
                </p>
                <Button className="mt-6 w-full" onClick={closeModal}>
                  Fermer
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-[#F5F5F3] p-4 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#101010]/60">Échéance</span>
                    <span className="font-semibold text-[#101010]">
                      #{repayments.findIndex((r) => r.id === payModalFor.id) + 1} ·{" "}
                      {formatDate(payModalFor.scheduleDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#101010]/60">Capital</span>
                    <span className="font-medium text-[#101010]">
                      {payModalFor.capitalAmount ? formatFCFA(payModalFor.capitalAmount) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#101010]/60">Intérêts</span>
                    <span className="font-medium text-[#101010]">
                      {formatFCFA(payModalFor.interestAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#101010]/60">Frais</span>
                    <span className="font-medium text-[#101010]">
                      {payModalFor.feeAmount ? formatFCFA(payModalFor.feeAmount) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#101010]/10 pt-1.5">
                    <span className="font-semibold text-[#101010]">Total à payer</span>
                    <span className="font-bold text-[#101010]">
                      {formatFCFA(remainingOf(payModalFor) || totalOf(payModalFor))}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-[#101010]/70">
                  <p className="font-semibold text-[#101010] flex items-center gap-2">
                    <Send className="h-4 w-4" /> Instructions de paiement
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed">
                    <li>
                      Effectuez un virement bancaire du montant total vers le compte séquestre
                      Nexora Capital :
                      <div className="mt-1.5 rounded-lg bg-white border border-[#101010]/10 p-3 font-mono text-[11px] text-[#101010] space-y-0.5">
                        <p>Bénéficiaire : NEXORA CAPITAL — SEQUESTRE</p>
                        <p>IBAN : CI93 CI00 1234 5678 9012 3456 78</p>
                        <p>Banque : SGCI — Abidjan Plateau</p>
                      </div>
                    </li>
                    <li>
                      Indiquez <strong>impérativement</strong> la référence unique ci-dessous dans
                      le libellé du virement, pour un rapprochement automatique.
                    </li>
                  </ol>

                  <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-[#B6FF00]/60 bg-[#EFFBDD] px-4 py-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#101010]/50 font-bold">
                        Référence de paiement
                      </p>
                      <p className="font-mono font-bold text-[#101010] text-base">
                        {paymentReference(payModalFor.id)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyReference(paymentReference(payModalFor.id))}
                      className="p-2 rounded-lg bg-white border border-[#101010]/10 hover:bg-[#F5F5F3] transition-colors"
                      aria-label="Copier la référence"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-[#166534]" />
                      ) : (
                        <Copy className="h-4 w-4 text-[#101010]/60" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-[#101010]/50 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                    Paiement global : un seul virement pour tous les investisseurs. Nexora répartit
                    automatiquement les parts au prorata.
                  </p>
                </div>

                {payError && (
                  <p className="mt-4 text-xs text-[#C62828] flex items-center gap-1.5">
                    <CircleAlert className="h-3.5 w-3.5" /> {payError}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="secondary" className="flex-1" onClick={closeModal} disabled={verifying}>
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    icon={<Banknote className="h-4 w-4" />}
                    loading={verifying}
                    onClick={() => simulatePayment(payModalFor)}
                  >
                    {verifying ? "Vérification…" : "Simuler le paiement"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </EntrepriseShell>
  );
}
