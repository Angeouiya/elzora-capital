"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Download,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  Landmark,
  CircleDollarSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { KPI } from "@/components/ui/KPI";
import { formatFCFA } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface Distribution {
  id: string;
  capitalAmount: number;
  interestAmount: number;
  status: string;
  withdrawnAt: string | null;
  createdAt: string;
  repayment: {
    scheduleDate: string;
    capitalAmount: number;
    interestAmount: number;
    offer: {
      project: {
        title: string;
        company: { name: string };
      };
    };
  };
  investment: {
    amount: number;
  };
}

type StatusFilter = "all" | "available" | "withdrawn" | "pending";

/* -------------------------------- Component ------------------------------- */

export default function PaiementsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/distributions")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: Distribution[] = await res.json();
        if (!cancelled) setDistributions(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Totaux ---------- */
  const totals = useMemo(() => {
    const capital = distributions.reduce((s, d) => s + d.capitalAmount, 0);
    const interets = distributions.reduce((s, d) => s + d.interestAmount, 0);
    const disponible = distributions
      .filter((d) => d.status === "AVAILABLE")
      .reduce((s, d) => s + d.capitalAmount + d.interestAmount, 0);
    const withdrawn = distributions
      .filter((d) => d.status === "WITHDRAWN")
      .reduce((s, d) => s + d.capitalAmount + d.interestAmount, 0);
    return { capital, interets, disponible, withdrawn };
  }, [distributions]);

  const filtered = useMemo(() => {
    switch (statusFilter) {
      case "available":
        return distributions.filter((d) => d.status === "AVAILABLE");
      case "withdrawn":
        return distributions.filter((d) => d.status === "WITHDRAWN");
      case "pending":
        return distributions.filter((d) => d.status === "PENDING");
      default:
        return distributions;
    }
  }, [distributions, statusFilter]);

  const filterButtons: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: "all", label: "Tous", count: distributions.length },
    {
      id: "available",
      label: "Disponible sur plateforme",
      count: distributions.filter((d) => d.status === "AVAILABLE").length,
    },
    {
      id: "withdrawn",
      label: "Versé sur compte bancaire",
      count: distributions.filter((d) => d.status === "WITHDRAWN").length,
    },
    {
      id: "pending",
      label: "En attente",
      count: distributions.filter((d) => d.status === "PENDING").length,
    },
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
            <h1 className="text-lg font-semibold text-[#101010]">Paiements reçus</h1>
          </div>
          <Link href="/dashboard/retrait" className="hidden sm:inline-flex">
            <Button size="sm" icon={<Download className="h-4 w-4" />}>
              Demander un retrait
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Totaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPI
            label="Total reçu"
            value={loading ? "—" : formatFCFA(totals.capital + totals.interets)}
            icon={<CircleDollarSign className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            label="Capital remboursé"
            value={loading ? "—" : formatFCFA(totals.capital)}
            icon={<Landmark className="h-5 w-5 text-[#507300]" />}
          />
          <KPI
            label="Intérêts perçus"
            value={loading ? "—" : formatFCFA(totals.interets)}
            icon={<TrendingUp className="h-5 w-5 text-[#507300]" />}
            trend="up"
          />
          <KPI
            label="Disponible"
            value={loading ? "—" : formatFCFA(totals.disponible)}
            icon={<Wallet className="h-5 w-5 text-[#507300]" />}
          />
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === btn.id
                  ? "bg-[#101010] text-[#F5F5F3]"
                  : "bg-white text-[#101010]/60 border border-[#101010]/10 hover:text-[#101010]"
              }`}
            >
              {btn.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === btn.id ? "bg-white/20" : "bg-[#F5F5F3]"
                }`}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#101010]/5 p-6 animate-pulse">
            <div className="h-5 w-48 rounded bg-[#F5F5F3] mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded bg-[#F5F5F3]" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <CircleDollarSign className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
            <p className="text-[#101010] font-medium mb-1">
              {statusFilter === "all"
                ? "Aucun paiement reçu"
                : "Aucun paiement dans cette catégorie"}
            </p>
            <p className="text-sm text-[#101010]/50 mb-4">
              Les paiements apparaissent dès les remboursements des entreprises.
            </p>
          </Card>
        ) : (
          <Card padding="none">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F3]/60 border-b border-[#101010]/8">
                    <th className="text-left px-4 py-3 font-medium text-[#101010]/50">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-[#101010]/50">Projet</th>
                    <th className="text-left px-4 py-3 font-medium text-[#101010]/50">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-[#101010]/50">Capital</th>
                    <th className="text-right px-4 py-3 font-medium text-[#101010]/50">Intérêts</th>
                    <th className="text-right px-4 py-3 font-medium text-[#101010]/50">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-[#101010]/50">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-[#101010]/5 hover:bg-[#F5F5F3]/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-[#101010]/70">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[#101010] font-medium truncate max-w-[200px] block">
                          {d.repayment?.offer?.project?.title || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          {d.capitalAmount > 0 && <Badge variant="info">Capital</Badge>}
                          {d.interestAmount > 0 && <Badge variant="success">Intérêt</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-[#101010]">
                        {d.capitalAmount > 0 ? formatFCFA(d.capitalAmount) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-[#166534]">
                        {d.interestAmount > 0 ? formatFCFA(d.interestAmount) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#101010]">
                        {formatFCFA(d.capitalAmount + d.interestAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#101010]/8">
              {filtered.map((d) => (
                <div key={d.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center shrink-0">
                        <ArrowDownToLine className="h-4 w-4 text-[#507300]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#101010]">
                          {d.repayment?.offer?.project?.title || "—"}
                        </p>
                        <p className="text-xs text-[#101010]/50">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#101010]">
                        +{formatFCFA(d.capitalAmount + d.interestAmount)}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-[#101010]/60 ml-12">
                    <span>
                      Capital: {d.capitalAmount > 0 ? formatFCFA(d.capitalAmount) : "—"}
                    </span>
                    <span>
                      Intérêt: {d.interestAmount > 0 ? formatFCFA(d.interestAmount) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totaux en pied */}
            <div className="border-t border-[#101010]/10 px-4 py-4 bg-[#F5F5F3]/40">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[#101010]">Total affiché</span>
                <div className="flex items-center gap-6 text-sm">
                  <span>
                    <span className="text-xs text-[#101010]/50 mr-1">Capital:</span>
                    <span className="font-medium text-[#101010]">
                      {formatFCFA(filtered.reduce((s, d) => s + d.capitalAmount, 0))}
                    </span>
                  </span>
                  <span>
                    <span className="text-xs text-[#101010]/50 mr-1">Intérêts:</span>
                    <span className="font-medium text-[#101010]">
                      {formatFCFA(filtered.reduce((s, d) => s + d.interestAmount, 0))}
                    </span>
                  </span>
                  <span>
                    <span className="text-xs text-[#101010]/50 mr-1">Total:</span>
                    <span className="font-bold text-[#101010]">
                      {formatFCFA(
                        filtered.reduce((s, d) => s + d.capitalAmount + d.interestAmount, 0)
                      )}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[#EFFBDD]/50 flex items-start gap-3">
                <Landmark className="h-4 w-4 text-[#507300] mt-0.5 shrink-0" />
                <span className="text-xs text-[#101010]/60 leading-relaxed">
                  Les distributions marquées « Disponible » sont créditées sur votre solde
                  plateforme. Les retraits vers votre compte bancaire sont traités dans un délai
                  de 48 à 72h ouvrés.
                </span>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
