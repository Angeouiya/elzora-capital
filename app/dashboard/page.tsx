"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  PieChart,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { InvestorShell } from "@/components/investor/InvestorShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatFCFA, formatRate } from "@/lib/calculations";

interface Investment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  offer: {
    type: string;
    rate: number;
    ratePeriod: string;
    duration: number;
    project: {
      title: string;
      sector: string;
      company: { name: string };
    };
  };
  payments: Array<{ amount: number; status: string }>;
}

export default function DashboardPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/investments")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: Investment[] = await res.json();
        if (!cancelled) setInvestments(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeInvestments = useMemo(
    () =>
      investments.filter(
        (investment) =>
          investment.status === "CONFIRMED" || investment.status === "PENDING"
      ),
    [investments]
  );

  const capitalEngage = useMemo(
    () => activeInvestments.reduce((sum, investment) => sum + investment.amount, 0),
    [activeInvestments]
  );

  const revenusRecus = useMemo(
    () =>
      investments.reduce((sum, investment) => {
        const confirmedPayments = investment.payments.filter(
          (payment) => payment.status === "CONFIRMED"
        );
        return (
          sum +
          confirmedPayments.reduce(
            (paymentSum, payment) => paymentSum + payment.amount,
            0
          )
        );
      }, 0),
    [investments]
  );

  /*
   * Le backend actuel ne distingue pas encore les sommes reçues des sommes
   * réellement disponibles au retrait. On conserve donc la valeur existante,
   * sans inventer un solde supplémentaire dans l'interface.
   */
  const disponible = revenusRecus;

  const sectorBreakdown = useMemo(() => {
    const bySector: Record<string, number> = {};

    activeInvestments.forEach((investment) => {
      const sector = investment.offer?.project?.sector || "Autre";
      bySector[sector] = (bySector[sector] || 0) + investment.amount;
    });

    const total = Object.values(bySector).reduce((sum, value) => sum + value, 0) || 1;

    return Object.entries(bySector)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeInvestments]);

  const confirmedToFollow = useMemo(
    () =>
      investments
        .filter((investment) => investment.status === "CONFIRMED")
        .slice(0, 4),
    [investments]
  );

  const primaryAction = (
    <Link href="/offres" className="w-full sm:w-auto">
      <Button
        size="md"
        fullWidth
        icon={<Search className="h-4 w-4" aria-hidden="true" />}
        className="sm:w-auto"
      >
        Explorer les offres
      </Button>
    </Link>
  );

  return (
    <InvestorShell
      title="Vue d'ensemble"
      subtitle="Suivez votre capital engagé, vos encaissements confirmés et vos investissements en cours."
      actions={primaryAction}
    >
      {loadError && (
        <div className="mb-6 flex flex-col gap-3 rounded-[18px] border border-[#C62828]/14 bg-[#C62828]/6 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#101010]">
              Certaines données n&apos;ont pas pu être chargées.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#101010]/52">
              Vérifiez votre connexion avant de prendre une décision à partir de ce tableau de bord.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      )}

      <section aria-label="Indicateurs principaux" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI
          label="Capital engagé"
          value={loading ? "—" : formatFCFA(capitalEngage)}
          icon={<Wallet className="h-5 w-5 text-[#101010]" />}
        />
        <KPI
          label="Revenus reçus"
          value={loading ? "—" : formatFCFA(revenusRecus)}
          icon={<TrendingUp className="h-5 w-5 text-[#101010]" />}
        />
        <KPI
          label="Disponible"
          value={loading ? "—" : formatFCFA(disponible)}
          icon={<ShieldCheck className="h-5 w-5 text-[#101010]" />}
        />
      </section>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-[20px] border border-[#101010]/8 bg-white p-5 sm:p-6">
            <div className="nx-skeleton h-5 w-48" />
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="nx-skeleton h-[78px] w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-[#101010]/8 bg-white p-5 sm:p-6">
            <div className="nx-skeleton h-5 w-36" />
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="nx-skeleton h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : investments.length === 0 ? (
        <Card className="mt-6" padding="lg">
          <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center sm:py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#B6FF00]/35 bg-[#EFFBDD]">
              <TrendingUp className="h-6 w-6 text-[#101010]" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-[-0.025em] text-[#101010]">
              Votre portefeuille commence ici
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#101010]/55">
              Consultez les offres disponibles et leurs risques avant de choisir un investissement adapté à votre situation.
            </p>
            <Link href="/offres" className="mt-5 w-full sm:w-auto">
              <Button fullWidth className="sm:w-auto">
                Voir les offres
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
          <section className="min-w-0 space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#101010]/38">
                    Portefeuille
                  </p>
                  <CardTitle className="mt-1">Investissements récents</CardTitle>
                </div>
                <Link
                  href="/dashboard/investissements"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-[12px] px-3 text-xs font-semibold text-[#101010]/56 transition-colors hover:bg-[#F5F5F3] hover:text-[#101010]"
                >
                  Tout voir
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </CardHeader>

              <div className="space-y-2.5">
                {investments.slice(0, 5).map((investment) => (
                  <div
                    key={investment.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-[#101010]/6 bg-[#F5F5F3]/65 p-4 transition-colors hover:bg-[#EFFBDD]/55 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-[#B6FF00]/30 bg-[#EFFBDD]">
                        <Building2 className="h-4.5 w-4.5 text-[#101010]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#101010]">
                          {investment.offer?.project?.company?.name || "Projet"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#101010]/50">
                          {investment.offer?.project?.title || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="nx-data text-sm font-bold text-[#101010]">
                        {formatFCFA(investment.amount)}
                      </span>
                      <StatusBadge status={investment.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card tone="dark" className="border-[#101010]">
              <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/42">
                    Prochaine action
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-white sm:text-2xl">
                    Diversifiez uniquement après avoir lu les conditions de chaque offre.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                    Rendement, durée, remboursement et risques sont propres à chaque financement et restent visibles avant toute souscription.
                  </p>
                </div>
                <Link href="/offres" className="w-full sm:w-auto">
                  <Button fullWidth className="sm:w-auto">
                    Explorer
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </Card>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#F5F5F3]">
                    <PieChart className="h-4 w-4 text-[#101010]/60" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Répartition</CardTitle>
                    <p className="mt-0.5 text-xs text-[#101010]/45">Capital actif par secteur</p>
                  </div>
                </div>
              </CardHeader>

              {sectorBreakdown.length === 0 ? (
                <p className="text-sm text-[#101010]/48">Aucune donnée disponible.</p>
              ) : (
                <div className="space-y-4">
                  {sectorBreakdown.map((sector) => (
                    <div key={sector.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-[#101010]/62">{sector.name}</span>
                        <span className="nx-data font-bold text-[#101010]">{sector.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#101010]/8">
                        <div
                          className="h-full rounded-full bg-[#B6FF00] transition-[width] duration-500"
                          style={{ width: `${sector.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#101010]/38">
                    À suivre
                  </p>
                  <CardTitle className="mt-1 text-base">Financements confirmés</CardTitle>
                </div>
              </CardHeader>

              {confirmedToFollow.length === 0 ? (
                <p className="text-sm leading-relaxed text-[#101010]/48">
                  Aucun financement confirmé à suivre actuellement.
                </p>
              ) : (
                <div className="space-y-3">
                  {confirmedToFollow.map((investment) => (
                    <div key={investment.id} className="rounded-[14px] border border-[#101010]/6 bg-[#F5F5F3]/70 p-3.5">
                      <p className="truncate text-sm font-semibold text-[#101010]">
                        {investment.offer.project.company.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#101010]/47">
                        {investment.offer.project.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#101010]/58">
                          {formatRate(investment.offer.rate)} · {investment.offer.duration} mois
                        </span>
                        <StatusBadge status={investment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}
    </InvestorShell>
  );
}
