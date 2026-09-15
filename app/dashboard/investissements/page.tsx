"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  CalendarDays,
  Percent,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatRate } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface Investment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  signedAt: string | null;
  paidAt: string | null;
  offer: {
    id: string;
    type: string;
    rate: number;
    ratePeriod: string;
    duration: number;
    project: {
      title: string;
      sector: string;
      country: string;
      company: { name: string };
    };
  };
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  }>;
}

type Filter = "all" | "active" | "completed";

/* -------------------------------- Component ------------------------------- */

export default function InvestissementsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/investments")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: Investment[] = await res.json();
        if (!cancelled) setInvestments(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return investments.filter(
          (inv) => inv.status === "CONFIRMED" || inv.status === "PENDING"
        );
      case "completed":
        return investments.filter((inv) => inv.status === "CANCELLED");
      default:
        return investments;
    }
  }, [investments, filter]);

  const stats = useMemo(() => {
    const active = investments.filter(
      (inv) => inv.status === "CONFIRMED" || inv.status === "PENDING"
    );
    const totalInvested = active.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = investments.reduce((sum, inv) => {
      const confirmed = inv.payments.filter((p) => p.status === "CONFIRMED");
      return sum + confirmed.reduce((s, p) => s + p.amount, 0);
    }, 0);
    return {
      count: investments.length,
      activeCount: active.length,
      totalInvested,
      totalPaid,
    };
  }, [investments]);

  const filterButtons: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "Tous", count: stats.count },
    { id: "active", label: "Actifs", count: stats.activeCount },
    { id: "completed", label: "Terminés", count: stats.count - stats.activeCount },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[#101010]/60 hover:bg-[#F5F5F3] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold text-[#101010]">Mes investissements</h1>
          </div>
          <Link
            href="/offres"
            className="hidden sm:inline-flex"
          >
            <Button size="sm">Explorer les offres</Button>
          </Link>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-[#101010]/5 p-4">
            <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider">Total</span>
            <p className="text-xl font-bold text-[#101010] mt-1">{stats.count}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#101010]/5 p-4">
            <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider">Actifs</span>
            <p className="text-xl font-bold text-[#166534] mt-1">{stats.activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#101010]/5 p-4">
            <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider">Capital investi</span>
            <p className="text-xl font-bold text-[#101010] mt-1">{formatFCFA(stats.totalInvested)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#101010]/5 p-4">
            <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider">Remboursé</span>
            <p className="text-xl font-bold text-[#166534] mt-1">{formatFCFA(stats.totalPaid)}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === btn.id
                  ? "bg-[#101010] text-[#F5F5F3]"
                  : "bg-white text-[#101010]/60 border border-[#101010]/10 hover:text-[#101010]"
              }`}
            >
              {btn.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === btn.id ? "bg-white/20" : "bg-[#F5F5F3]"
                }`}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#101010]/5 p-6 animate-pulse">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-4 w-32 rounded bg-[#F5F5F3] mb-2" />
                    <div className="h-5 w-48 rounded bg-[#F5F5F3] mb-1" />
                    <div className="h-3 w-24 rounded bg-[#F5F5F3]" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-[#F5F5F3]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <TrendingUp className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
            <p className="text-[#101010] font-medium mb-1">
              {filter === "all" ? "Aucun investissement" : "Aucun investissement dans cette catégorie"}
            </p>
            <p className="text-sm text-[#101010]/50 mb-4">
              Découvrez les projets et commencez à investir.
            </p>
            <Link href="/offres">
              <Button size="sm">Explorer les offres</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((inv) => {
              const isExpanded = expandedId === inv.id;
              const totalPaid = inv.payments
                .filter((p) => p.status === "CONFIRMED")
                .reduce((s, p) => s + p.amount, 0);
              const monthlyIncome = Math.round(
                (inv.amount * inv.offer.rate) / 10000 / inv.offer.duration
              );

              return (
                <Card
                  key={inv.id}
                  className="overflow-hidden transition-all"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-lg bg-[#EFFBDD] flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="h-5 w-5 text-[#507300]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="accent">{inv.offer.project.sector}</Badge>
                          <span className="text-[11px] font-medium text-[#101010]/40 uppercase tracking-wide">
                            {inv.offer.type === "DEBT" ? "Dette" : "Capital"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#101010] truncate">
                          {inv.offer.project.company.name}
                        </h3>
                        <p className="text-sm text-[#101010]/60 truncate">
                          {inv.offer.project.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-[#101010]">{formatFCFA(inv.amount)}</p>
                        <p className="text-xs text-[#101010]/50">
                          {formatRate(inv.offer.rate)} · {inv.offer.duration} mois
                        </p>
                      </div>
                      <StatusBadge status={inv.status} />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#101010]/40" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#101010]/40" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#101010]/8">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider block mb-1">
                            Apport
                          </span>
                          <span className="text-sm font-semibold text-[#101010]">
                            {formatFCFA(inv.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider block mb-1">
                            Taux
                          </span>
                          <span className="text-sm font-semibold text-[#101010]">
                            {formatRate(inv.offer.rate)}
                            <span className="text-xs font-normal text-[#101010]/50 ml-1">
                              {inv.offer.ratePeriod === "TOTAL" ? "total" : "/an"}
                            </span>
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider block mb-1">
                            Durée
                          </span>
                          <span className="text-sm font-semibold text-[#101010]">
                            {inv.offer.duration} mois
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider block mb-1">
                            Revenu mensuel est.
                          </span>
                          <span className="text-sm font-semibold text-[#166534]">
                            +{formatFCFA(monthlyIncome)}
                          </span>
                        </div>
                      </div>

                      {/* Paiements */}
                      {inv.payments.length > 0 && (
                        <div>
                          <span className="text-xs text-[#101010]/50 font-medium uppercase tracking-wider block mb-2">
                            Historique des paiements
                          </span>
                          <div className="space-y-2">
                            {inv.payments.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-[#F5F5F3]/60"
                              >
                                <div className="flex items-center gap-2">
                                  {p.status === "CONFIRMED" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#166534]" />
                                  ) : p.status === "REJECTED" ? (
                                    <XCircle className="h-3.5 w-3.5 text-[#C62828]" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  <span className="text-[#101010]/70">
                                    {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <Badge
                                    variant={p.method === "MOBILE_MONEY" ? "info" : "default"}
                                  >
                                    {p.method === "MOBILE_MONEY" ? "Mobile Money" : "Virement"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[#101010]">
                                    {formatFCFA(p.amount)}
                                  </span>
                                  <StatusBadge status={p.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Link href={`/offres/${inv.offer?.id || ""}`}>
                          <Button variant="secondary" size="sm">Voir l&apos;offre</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
