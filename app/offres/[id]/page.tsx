"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Percent,
  Calendar,
  Wallet,
  Users,
  MapPin,
  Building2,
  FileText,
  Download,
  Info,
  ShieldCheck,
  Landmark,
  Target,
  ClipboardList,
  TrendingUp,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KPI } from "@/components/ui/KPI";
import { Tabs } from "@/components/ui/Tabs";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateInvestorInterest,
  generateRepaymentSchedule,
  formatFCFA,
  formatRate,
} from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface CompanyRef {
  name: string;
  legalForm: string;
  sector: string;
  country: string;
  address: string | null;
  description: string | null;
}

interface ProjectRef {
  title: string;
  description: string;
  sector: string;
  country: string;
  city: string | null;
  totalAmount: number;
  ownContribution: number;
  requestedAmount: number;
  budget: string | null;
  usageDescription: string | null;
  company: CompanyRef;
}

interface RepaymentRow {
  id: string;
  scheduleDate: string;
  capitalAmount: number;
  interestAmount: number;
  feeAmount: number;
  status: string;
  paidAmount: number;
}

interface OfferDetail {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  minTicket: number;
  maxTicket: number;
  targetAmount: number;
  collectedAmount: number;
  investorCount: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  publishedAt: string | null;
  project: ProjectRef;
  repayments: RepaymentRow[];
  _count: { investments: number };
}

/* --------------------------------- Helpers -------------------------------- */

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtMonth = (date: Date) =>
  date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

const prettifyKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .charAt(0)
    .toUpperCase() + key.replace(/_/g, " ").slice(1);

/* -------------------------------- Component ------------------------------- */

export default function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [simAmount, setSimAmount] = useState<number>(0);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/offers/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("server-error");
        const data: OfferDetail = await res.json();
        if (cancelled) return;
        setOffer(data);
        setSimAmount(data.minTicket);
        setDaysLeft(
          data.endDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(data.endDate).getTime() - Date.now()) /
                    (1000 * 3600 * 24)
                )
              )
            : null
        );
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ------------------------- Calculs du simulateur ------------------------ */
  const ratePeriod = offer?.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL";

  const simulation = useMemo(() => {
    if (!offer) return null;
    const amount = Math.max(0, simAmount || 0);
    const interestGross = calculateInvestorInterest(
      amount,
      offer.rate,
      ratePeriod,
      offer.duration
    );
    // Aucun frais Nexora n'est prélevé sur l'investisseur : le net égal le brut.
    const fees = 0;
    const interestNet = interestGross - fees;
    const schedule = generateRepaymentSchedule(
      amount,
      offer.rate,
      ratePeriod,
      offer.duration
    );
    return { amount, interestGross, fees, interestNet, schedule };
  }, [offer, simAmount, ratePeriod]);

  const repayStats = useMemo(() => {
    if (!offer) return null;
    const total = offer.repayments.length;
    const paid = offer.repayments.filter((r) => r.status === "PAID").length;
    const due = offer.repayments.filter((r) => r.status === "DUE").length;
    return { total, paid, due };
  }, [offer]);

  /* ------------------------------ États simples --------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f7]">
        <div className="h-16 border-b border-[#101010]/8 bg-white" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
          <div className="h-4 w-48 rounded bg-[#F5F5F3] mb-4" />
          <div className="h-8 w-3/4 rounded bg-[#F5F5F3] mb-2" />
          <div className="h-5 w-1/2 rounded bg-[#F5F5F3] mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[#F5F5F3]" />
            ))}
          </div>
          <div className="h-40 rounded-xl bg-[#F5F5F3] mb-6" />
          <div className="h-10 w-72 rounded-lg bg-[#F5F5F3]" />
        </div>
      </div>
    );
  }

  if (notFound || !offer) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <CircleAlert className="h-10 w-10 text-[#101010]/20 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#101010] mb-2">
            Offre introuvable
          </h1>
          <p className="text-sm text-[#101010]/60 mb-6">
            Cette offre n&apos;existe plus ou n&apos;est pas encore publiée.
          </p>
          <Link href="/offres">
            <Button variant="primary" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour aux offres
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const company = offer.project.company;
  const isPublished = offer.status === "PUBLISHED";
  const pct = Math.min(
    100,
    Math.round(
      (offer.collectedAmount / Math.max(offer.targetAmount, 1)) * 100
    )
  );

  let budget: Array<[string, number]> = [];
  try {
    const parsed = offer.project.budget
      ? (JSON.parse(offer.project.budget) as Record<string, unknown>)
      : null;
    if (parsed && typeof parsed === "object") {
      budget = Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number"
      );
    }
  } catch {
    budget = [];
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7] pb-24">
      {/* ------------------------------- Header ------------------------------ */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-5xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">
          <Link
            href="/offres"
            aria-label="Retour aux offres"
            className="h-10 w-10 rounded-lg flex items-center justify-center text-[#101010] hover:bg-[#F5F5F3] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href="/" className="hidden sm:flex items-center gap-2 shrink-0">
            <NexoraLogo size={28} />
            <span className="text-sm font-semibold text-[#101010]">
              Nexora Capital
            </span>
          </Link>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs text-[#101010]/50 truncate">
              {company.name} · {offer.project.city ?? offer.project.country}
            </p>
            <h1 className="text-sm sm:text-base font-semibold text-[#101010] truncate">
              {offer.project.title}
            </h1>
          </div>
          {isPublished && (
            <Link
              href={`/offres/${offer.id}/souscrire`}
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              Investir
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* ------------------------------ Identité --------------------------- */}
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Offres", href: "/offres" },
            { label: company.name },
          ]}
          className="mb-4"
        />

        <div className="mb-6 animate-fade-in-up">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="accent">{offer.project.sector}</Badge>
            <Badge>
              {offer.type === "DEBT" ? "Obligation / dette" : "Titre de capital"}
            </Badge>
            {!isPublished && (
              <Badge variant="danger">Collecte clôturée</Badge>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#101010] tracking-tight leading-tight">
            {offer.project.title}
          </h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#101010]/60 mt-2">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {company.name} ({company.legalForm})
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {offer.project.city ?? "—"}, {offer.project.country}
            </span>
          </p>
        </div>

        {/* --------------------------- KPIs principaux ------------------------ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 animate-fade-in-up animate-fade-in-up-delay-1">
          <KPI
            value={formatRate(offer.rate)}
            label={`Taux ${offer.ratePeriod === "TOTAL" ? "total" : "annuel"}`}
            icon={<Percent className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            value={`${offer.duration} mois`}
            label="Durée du placement"
            icon={<Calendar className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            value={new Intl.NumberFormat("fr-FR").format(offer.minTicket)}
            label="Ticket minimum (FCFA)"
            icon={<Wallet className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            value={String(offer.investorCount)}
            label="Investisseurs"
            icon={<Users className="h-5 w-5 text-[#507300]" />}
          />
        </div>

        {/* ----------------------------- Collecte ----------------------------- */}
        <Card className="mb-8 animate-fade-in-up animate-fade-in-up-delay-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#101010] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#507300]" />
              Progression de la collecte
            </h3>
            {daysLeft !== null && (
              <Badge variant={daysLeft > 7 ? "default" : "warning"}>
                {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant
                {daysLeft > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-[#101010]">
              {formatFCFA(offer.collectedAmount)}
            </span>
            <span className="text-sm text-[#101010]/50">
              sur {formatFCFA(offer.targetAmount)}
            </span>
          </div>
          <ProgressBar
            value={offer.collectedAmount}
            max={offer.targetAmount}
            label={`Objectif : ${formatFCFA(offer.targetAmount)}`}
            showValue={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-xs text-[#101010]/50">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {pct}% financé · {offer.investorCount} investisseur
              {offer.investorCount > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Clôture estimée : {fmtDate(offer.endDate)}
            </span>
          </div>
        </Card>

        {/* -------------------------------- Onglets --------------------------- */}
        <Tabs
          defaultTab="projet"
          tabs={[
            {
              id: "projet",
              label: "Projet",
              content: (
                <div className="space-y-4">
                  <Card>
                    <h3 className="text-base font-bold text-[#101010] mb-3">
                      Présentation du projet
                    </h3>
                    <p className="text-sm text-[#101010]/70 leading-relaxed whitespace-pre-line">
                      {offer.project.description}
                    </p>
                    {offer.project.usageDescription && (
                      <div className="mt-4 p-3.5 rounded-lg bg-[#EFFBDD]">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#507300] mb-1">
                          Utilisation des capitaux
                        </div>
                        <p className="text-sm text-[#101010]/70 leading-relaxed">
                          {offer.project.usageDescription}
                        </p>
                      </div>
                    )}
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50 mb-3">
                        Localisation & structure
                      </h4>
                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#101010]/50">Secteur</dt>
                          <dd className="font-medium text-[#101010] text-right">
                            {offer.project.sector}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#101010]/50">Pays</dt>
                          <dd className="font-medium text-[#101010] text-right">
                            {offer.project.country}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#101010]/50">Ville</dt>
                          <dd className="font-medium text-[#101010] text-right">
                            {offer.project.city ?? "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#101010]/50">Forme juridique</dt>
                          <dd className="font-medium text-[#101010] text-right">
                            {company.legalForm}
                          </dd>
                        </div>
                      </dl>
                    </Card>
                    <Card>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50 mb-3">
                        Budget du projet
                      </h4>
                      {budget.length > 0 ? (
                        <dl className="space-y-2.5 text-sm">
                          {budget.map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between gap-4"
                            >
                              <dt className="text-[#101010]/50">
                                {prettifyKey(key)}
                              </dt>
                              <dd className="font-medium text-[#101010] text-right">
                                {formatFCFA(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-sm text-[#101010]/50">
                          Détail budgétaire disponible dans la note
                          d&apos;information.
                        </p>
                      )}
                      <div className="mt-4 pt-3 border-t border-[#101010]/8 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#101010]/50">
                            Montant total du projet
                          </span>
                          <span className="font-medium text-[#101010]">
                            {formatFCFA(offer.project.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#101010]/50">
                            Apport propre de l&apos;entreprise
                          </span>
                          <span className="font-medium text-[#101010]">
                            {formatFCFA(offer.project.ownContribution)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50 mb-3">
                      L&apos;entreprise
                    </h4>
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-[#EFFBDD] flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-[#507300]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#101010]">
                          {company.name}
                        </p>
                        <p className="text-sm text-[#101010]/60 leading-relaxed mt-0.5">
                          {company.description ??
                            "Entreprise vérifiée par le comité d'analyse Nexora Capital."}
                        </p>
                        <p className="text-xs text-[#101010]/40 mt-1.5">
                          {company.address ?? "—"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              id: "finances",
              label: "Finances",
              content: (
                <div className="space-y-4">
                  {/* Conditions de l'offre */}
                  <Card>
                    <h3 className="text-base font-bold text-[#101010] mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#507300]" />
                      Conditions de l&apos;offre
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Type
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {offer.type === "DEBT" ? "Dette (obligation)" : "Capital"}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Taux contractuel
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {formatRate(offer.rate)}{" "}
                          {offer.ratePeriod === "TOTAL" ? "(total)" : "(annuel)"}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Durée
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {offer.duration} mois
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Ticket min.
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {formatFCFA(offer.minTicket)}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Ticket max.
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {formatFCFA(offer.maxTicket)}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Remboursement
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          In fine, échéances mensuelles
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Simulateur interactif */}
                  <Card>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                      <h3 className="text-base font-bold text-[#101010] flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#507300]" />
                        Simulateur de rendement
                      </h3>
                      <Badge variant="accent">
                        Taux {formatRate(offer.rate)}{" "}
                        {offer.ratePeriod === "TOTAL" ? "total" : "/ an"}
                      </Badge>
                    </div>

                    <label
                      htmlFor="sim-amount"
                      className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50"
                    >
                      Montant envisagé
                    </label>
                    <div className="relative mt-1.5 mb-3">
                      <input
                        id="sim-amount"
                        type="number"
                        min={offer.minTicket}
                        max={offer.maxTicket}
                        step={5000}
                        value={simAmount}
                        onChange={(e) => setSimAmount(Number(e.target.value))}
                        className="w-full h-12 px-4 pr-20 rounded-lg border border-[#101010]/10 bg-white text-lg font-semibold text-[#101010] outline-none focus:ring-2 focus:ring-[#B6FF00]/50 focus:border-[#B6FF00] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#101010]/40">
                        FCFA
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-5">
                      <button
                        type="button"
                        onClick={() => setSimAmount(offer.minTicket)}
                        className="h-8 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors"
                      >
                        Min. {new Intl.NumberFormat("fr-FR").format(offer.minTicket)}
                      </button>
                      {[25000, 100000, 500000].map((step) => (
                        <button
                          key={step}
                          type="button"
                          disabled={simAmount + step > offer.maxTicket}
                          onClick={() =>
                            setSimAmount((prev) =>
                              Math.min(prev + step, offer.maxTicket)
                            )
                          }
                          className="h-8 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                          + {new Intl.NumberFormat("fr-FR").format(step)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSimAmount(offer.maxTicket)}
                        className="h-8 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors"
                      >
                        Max. {new Intl.NumberFormat("fr-FR").format(offer.maxTicket)}
                      </button>
                    </div>

                    {simulation && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#101010]/60">
                            Capital investi
                          </span>
                          <span className="font-medium text-[#101010]">
                            {formatFCFA(simulation.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#101010]/60">
                            Intérêts bruts ({formatRate(offer.rate)}{" "}
                            {offer.ratePeriod === "TOTAL" ? "total" : "annuel"}{" "}
                            sur {offer.duration} mois)
                          </span>
                          <span className="font-medium text-[#101010]">
                            + {formatFCFA(simulation.interestGross)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#101010]/60">
                            Frais Nexora pour l&apos;investisseur
                          </span>
                          <span className="font-medium text-[#166534]">
                            0 FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-[#EFFBDD]">
                          <span className="font-semibold text-[#507300]">
                            Intérêts nets perçus
                          </span>
                          <span className="font-bold text-[#507300]">
                            + {formatFCFA(simulation.interestNet)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#101010]/10">
                          <span className="text-sm font-bold text-[#101010] uppercase tracking-wide">
                            Total perçu à l&apos;échéance
                          </span>
                          <span className="text-xl font-bold text-[#101010]">
                            {formatFCFA(simulation.amount + simulation.interestNet)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#101010]/40 leading-relaxed pt-1">
                          Rémunération contractuelle — total prévisionnel, non
                          garanti. Les intérêts sont dus par l&apos;entreprise
                          aux échéances convenues.
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Échéancier */}
                  {simulation && (
                    <Card>
                      <h3 className="text-base font-bold text-[#101010] mb-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#507300]" />
                        Échéancier prévisionnel
                      </h3>
                      <p className="text-xs text-[#101010]/50 mb-4">
                        Projection pour un investissement de{" "}
                        {formatFCFA(simulation.amount)}. Intérêts versés
                        mensuellement, capital remboursé in fine.
                      </p>
                      <div className="overflow-hidden rounded-lg border border-[#101010]/10">
                        <div className="max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#F5F5F3] text-[#101010]/60 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2 text-xs font-semibold">
                                  Échéance
                                </th>
                                <th className="text-right px-3 py-2 text-xs font-semibold">
                                  Intérêts
                                </th>
                                <th className="text-right px-3 py-2 text-xs font-semibold">
                                  Capital
                                </th>
                                <th className="text-right px-3 py-2 text-xs font-semibold">
                                  Total perçu
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#101010]/5">
                              {simulation.schedule.map((row) => (
                                <tr key={row.month} className="bg-white">
                                  <td className="px-3 py-2 text-[#101010]/70">
                                    <span className="font-medium">
                                      M{row.month}
                                    </span>{" "}
                                    · {fmtMonth(row.date)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-[#507300]">
                                    {new Intl.NumberFormat("fr-FR").format(
                                      row.interest
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-[#101010]/70">
                                    {new Intl.NumberFormat("fr-FR").format(
                                      row.capital
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-[#101010]">
                                    {new Intl.NumberFormat("fr-FR").format(
                                      row.interest + row.capital
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#101010]/40 mt-3 leading-relaxed">
                        Total prévisionnel, non garanti — dépend du respect des
                        engagements de l&apos;emprunteur. Les frais de suivi
                        Nexora sont à la charge de l&apos;entreprise, pas de
                        l&apos;investisseur.
                      </p>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              id: "documents",
              label: "Documents",
              content: (
                <Card>
                  <h3 className="text-base font-bold text-[#101010] mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#507300]" />
                    Documentation réglementaire
                  </h3>
                  <p className="text-xs text-[#101010]/50 mb-4">
                    Documents contractuels et d&apos;analyse liés à cette offre.
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        title: "Note d'information de l'offre",
                        subtitle: "PDF · Conditions, risques et échéanciers",
                      },
                      {
                        title: "Rapport d'analyse financière indépendant",
                        subtitle: "PDF · Bilan, projections et ratios de l'entreprise",
                      },
                      {
                        title: "Contrat de financement et garanties",
                        subtitle: "PDF · Obligations de l'emprunteur et recours",
                      },
                      {
                        title: "Statuts et registre du commerce",
                        subtitle: "PDF · Kbis et identité légale de la société",
                      },
                    ].map((doc) => (
                      <div
                        key={doc.title}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F5F5F3]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0 ring-1 ring-[#101010]/5">
                            <FileText className="h-4.5 w-4.5 text-[#101010]/50" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#101010] truncate">
                              {doc.title}
                            </p>
                            <p className="text-xs text-[#101010]/50">
                              {doc.subtitle}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled
                          title="Disponible après connexion"
                          className="h-9 w-9 rounded-lg bg-white ring-1 ring-[#101010]/10 flex items-center justify-center text-[#101010]/30 shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#101010]/40 mt-4 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Les documents complets sont accessibles aux investisseurs
                    connectés, conformément à la réglementation CREPMF.
                  </p>
                </Card>
              ),
            },
            {
              id: "suivi",
              label: "Suivi",
              content: (
                <div className="space-y-4">
                  <Card>
                    <h3 className="text-base font-bold text-[#101010] mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#507300]" />
                      État de la collecte
                    </h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-[#101010]">
                        {formatFCFA(offer.collectedAmount)}
                      </span>
                      <span className="text-sm text-[#101010]/50">
                        sur {formatFCFA(offer.targetAmount)} ({pct}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={offer.collectedAmount}
                      max={offer.targetAmount}
                      showValue={false}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Investisseurs
                        </div>
                        <div className="text-lg font-bold text-[#101010] mt-0.5">
                          {offer.investorCount}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Ouverture
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {fmtDate(offer.publishedAt)}
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Clôture prévue
                        </div>
                        <div className="text-sm font-bold text-[#101010] mt-1">
                          {fmtDate(offer.endDate)}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {repayStats && repayStats.total > 0 && (
                    <Card>
                      <h3 className="text-base font-bold text-[#101010] mb-1 flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-[#507300]" />
                        Remboursements de l&apos;offre
                      </h3>
                      <p className="text-xs text-[#101010]/50 mb-4">
                        {repayStats.paid} échéance{repayStats.paid > 1 ? "s" : ""}{" "}
                        honorée{repayStats.paid > 1 ? "s" : ""} sur{" "}
                        {repayStats.total}
                        {repayStats.due > 0
                          ? ` · ${repayStats.due} à régler`
                          : ""}
                        . Les paiements sont répartis au prorata entre les
                        investisseurs.
                      </p>
                      <div className="space-y-2">
                        {offer.repayments.slice(0, 6).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F5F5F3]"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#101010]">
                                {new Date(r.scheduleDate).toLocaleDateString(
                                  "fr-FR",
                                  { month: "long", year: "numeric" }
                                )}
                              </p>
                              <p className="text-xs text-[#101010]/50">
                                Intérêts :{" "}
                                {formatFCFA(r.interestAmount)}
                                {r.capitalAmount > 0 &&
                                  ` · Capital : ${formatFCFA(r.capitalAmount)}`}
                              </p>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                      {offer.repayments.length > 6 && (
                        <p className="text-xs text-[#101010]/40 mt-3">
                          + {offer.repayments.length - 6} échéances
                          ultérieures.
                        </p>
                      )}
                    </Card>
                  )}

                  <Card>
                    <h3 className="text-base font-bold text-[#101010] mb-1 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#507300]" />
                      Transparence post-collecte
                    </h3>
                    <p className="text-sm text-[#101010]/60 leading-relaxed">
                      Dès la finalisation du tour de table, les souscripteurs
                      suivent l&apos;exécution du projet et le paiement des
                      échéances depuis leur tableau de bord. Chaque remboursement
                      est notifié et versé à hauteur de la quote-part de chacun.
                    </p>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </main>

      {/* ------------------------- Barre d'action sticky -------------------- */}
      {isPublished && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#101010]/8 p-4 pb-safe">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="hidden sm:block">
              <p className="text-xs text-[#101010]/50">À partir de</p>
              <p className="text-sm font-bold text-[#101010]">
                {formatFCFA(offer.minTicket)}
              </p>
            </div>
            <Link
              href={`/offres/${offer.id}/souscrire`}
              className="flex-1 sm:flex-none sm:ml-auto h-12 sm:px-10 rounded-lg bg-[#B6FF00] text-[#101010] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Investir dans ce projet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
      {!isPublished && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#101010]/8 p-4 pb-safe">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-sm font-medium text-[#101010]/60">
            <CheckCircle2 className="h-4 w-4 text-[#166534]" />
            Collecte clôturée — explorez d&apos;autres offres disponibles.
          </div>
        </div>
      )}
    </div>
  );
}
