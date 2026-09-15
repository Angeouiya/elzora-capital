"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  TrendingUp,
  Wallet,
  PieChart,
  CalendarDays,
  ArrowRight,
  Menu,
  X,
  FileText,
  CreditCard,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatFCFA, formatRate } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

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

/* -------------------------------- Component ------------------------------- */

export default function DashboardPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/investments")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: Investment[] = await res.json();
        if (!cancelled) setInvestments(data);
      })
      .catch(() => {
        /* silently ignore */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- KPI calculations ---------- */
  const capitalEngage = useMemo(
    () =>
      investments
        .filter((inv) => inv.status === "CONFIRMED" || inv.status === "PENDING")
        .reduce((sum, inv) => sum + inv.amount, 0),
    [investments]
  );

  const revenusRecus = useMemo(
    () =>
      investments.reduce((sum, inv) => {
        const paidPayments = inv.payments.filter((p) => p.status === "CONFIRMED");
        return sum + paidPayments.reduce((s, p) => s + p.amount, 0);
      }, 0),
    [investments]
  );

  const disponible = useMemo(() => revenusRecus, [revenusRecus]);

  /* ---------- Sector breakdown ---------- */
  const sectorBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((inv) => {
      const sector = inv.offer?.project?.sector || "Autre";
      map[sector] = (map[sector] || 0) + inv.amount;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount, pct: Math.round((amount / total) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  }, [investments]);

  /* ---------- Upcoming échéances (mock from investments) ---------- */
  const upcomingEcheances = useMemo(() => {
    return investments
      .filter((inv) => inv.status === "CONFIRMED")
      .slice(0, 3)
      .map((inv) => {
        const start = new Date(inv.createdAt);
        const nextDate = new Date(start);
        nextDate.setMonth(nextDate.getMonth() + 1);
        const monthlyAmount = Math.round(
          (inv.amount + (inv.amount * inv.offer.rate) / 10000) / inv.offer.duration
        );
        return {
          id: inv.id,
          projectName: inv.offer.project.title,
          companyName: inv.offer.project.company.name,
          date: nextDate,
          amount: monthlyAmount,
        };
      });
  }, [investments]);

  const navLinks = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid, active: true },
    { href: "/dashboard/investissements", label: "Investissements", icon: TrendingUp },
    { href: "/dashboard/paiements", label: "Paiements", icon: CreditCard },
    { href: "/dashboard/documents", label: "Documents", icon: FileText },
    { href: "/dashboard/retrait", label: "Retrait", icon: Wallet },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <NexoraLogo size={32} />
            <span className="text-[#101010] font-semibold tracking-tight text-lg leading-none">
              Nexora Capital
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.slice(0, 5).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  link.active
                    ? "bg-[#EFFBDD] text-[#101010]"
                    : "text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F5F3]"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/notifications"
              className="h-10 w-10 rounded-lg flex items-center justify-center text-[#101010]/60 hover:bg-[#F5F5F3] transition-colors"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <Link
              href="/profil"
              className="h-10 w-10 rounded-full bg-[#B6FF00] flex items-center justify-center text-[#101010] font-semibold text-sm"
            >
              ME
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden h-10 w-10 rounded-lg flex items-center justify-center text-[#101010] hover:bg-[#F5F5F3] transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[#101010]/8 bg-white px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium ${
                  link.active ? "bg-[#EFFBDD] text-[#101010]" : "text-[#101010]/70 hover:bg-[#F5F5F3]"
                }`}
              >
                <link.icon className="h-4 w-4 text-[#101010]/60" />
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2 border-t border-[#101010]/8 mt-2">
              <Link
                href="/profil"
                onClick={() => setMenuOpen(false)}
                className="flex-1 h-11 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-sm font-medium text-[#101010]"
              >
                Mon profil
              </Link>
              <Link
                href="/connexion"
                onClick={() => setMenuOpen(false)}
                className="h-11 w-11 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[#101010]/60"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101010] tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-[#101010]/60 mt-1">
            Vue d&apos;ensemble de vos investissements
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <KPI
            label="Capital engagé"
            value={loading ? "—" : formatFCFA(capitalEngage)}
            icon={<Wallet className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            label="Revenus reçus"
            value={loading ? "—" : formatFCFA(revenusRecus)}
            icon={<TrendingUp className="h-5 w-5 text-[#507300]" />}
            trend="up"
            trendValue="+12.4% ce trimestre"
          />
          <KPI
            label="Disponible"
            value={loading ? "—" : formatFCFA(disponible)}
            icon={<PieChart className="h-5 w-5 text-[#507300]" />}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#101010]/5 p-6 animate-pulse">
              <div className="h-5 w-48 rounded bg-[#F5F5F3] mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-[#F5F5F3]" />
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#101010]/5 p-6 animate-pulse">
              <div className="h-5 w-32 rounded bg-[#F5F5F3] mb-6" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 rounded bg-[#F5F5F3]" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Investissements récents */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Investissements récents</CardTitle>
                  <Link
                    href="/dashboard/investissements"
                    className="text-sm text-[#507300] font-medium flex items-center gap-1 hover:underline"
                  >
                    Tout voir <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </CardHeader>

                {investments.length === 0 ? (
                  <div className="text-center py-10">
                    <TrendingUp className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
                    <p className="text-[#101010] font-medium mb-1">Aucun investissement</p>
                    <p className="text-sm text-[#101010]/50 mb-4">
                      Explorez les offres pour commencer à investir.
                    </p>
                    <Link href="/offres">
                      <Button size="sm">Explorer les offres</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {investments.slice(0, 5).map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#F5F5F3]/60 hover:bg-[#F5F5F3] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-[#EFFBDD] flex items-center justify-center shrink-0">
                            <TrendingUp className="h-4 w-4 text-[#507300]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#101010] truncate">
                              {inv.offer?.project?.company?.name || "Projet"}
                            </p>
                            <p className="text-xs text-[#101010]/50 truncate">
                              {inv.offer?.project?.title} &middot; {formatRate(inv.offer?.rate || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-sm font-semibold text-[#101010]">
                            {formatFCFA(inv.amount)}
                          </span>
                          <StatusBadge status={inv.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar: Répartition + Échéances */}
            <div className="flex flex-col gap-6">
              {/* Répartition par secteur */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-[#101010]/40" />
                    <CardTitle className="text-base">Répartition par secteur</CardTitle>
                  </div>
                </CardHeader>
                {sectorBreakdown.length === 0 ? (
                  <p className="text-sm text-[#101010]/50">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {sectorBreakdown.map((s) => (
                      <div key={s.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-[#101010]/70">{s.name}</span>
                          <span className="font-medium text-[#101010]">{s.pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#F5F5F3] rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-[#B6FF00] rounded-full transition-all duration-500"
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Prochaines échéances */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#101010]/40" />
                    <CardTitle className="text-base">Prochaines échéances</CardTitle>
                  </div>
                </CardHeader>
                {upcomingEcheances.length === 0 ? (
                  <p className="text-sm text-[#101010]/50">Aucune échéance à venir</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEcheances.map((ech) => (
                      <div
                        key={ech.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]/60"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#101010] truncate">
                            {ech.companyName}
                          </p>
                          <p className="text-xs text-[#101010]/50">
                            {ech.date.toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#166534] shrink-0 ml-2">
                          +{formatFCFA(ech.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
