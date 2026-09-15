"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

interface Transaction {
  id: number;
  type: "credit" | "debit" | "interest";
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: "completed" | "pending" | "failed";
  icon: string;
}

const allTransactions: Transaction[] = [
  { id: 1, type: "interest", title: "Coupon — Atelier Nova", subtitle: "Échéance 1/6", amount: "+666 FCFA", date: "15 Oct. 2024", status: "completed", icon: "payments" },
  { id: 2, type: "debit", title: "Investissement — Atelier Nova", subtitle: "Ligne d'ensachage robotisée", amount: "-50 000 FCFA", date: "10 Oct. 2024", status: "completed", icon: "trending_up" },
  { id: 3, type: "credit", title: "Dépôt — Solde disponible", subtitle: "Virement depuis BOA", amount: "+200 000 FCFA", date: "08 Oct. 2024", status: "completed", icon: "account_balance" },
  { id: 4, type: "debit", title: "Retrait — Solde libérés", subtitle: "Portefeuille", amount: "+145 000 FCFA", date: "05 Oct. 2024", status: "completed", icon: "payments" },
  { id: 5, type: "interest", title: "Coupon — Agro-Alliance", subtitle: "Échéance 4/12", amount: "+1 875 FCFA", date: "15 Sept. 2024", status: "completed", icon: "payments" },
  { id: 6, type: "debit", title: "Investissement — Agro-Alliance", subtitle: "Stock d'anacarde", amount: "-300 000 FCFA", date: "01 Sept. 2024", status: "completed", icon: "savings" },
];

const filters = ["Toutes", "Entrées", "Sorties", "Intérêts"];

export default function HistoriquePage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("Toutes");

  return (
    <>
      <AppHeader title="Historique" subtitle="NEXORA CAPITAL" showBack />

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full px-space-md py-space-md space-y-space-md">

          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-2 animate-fade-in-up">
            <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm text-center">
              <span className="font-label-caps text-label-caps text-secondary uppercase block">Total entrées</span>
              <span className="font-data-display text-[18px] text-tertiary font-semibold mt-1 block">+445 000</span>
              <span className="font-label-sm text-label-sm text-secondary">FCFA</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm text-center">
              <span className="font-label-caps text-label-caps text-secondary uppercase block">Total sorties</span>
              <span className="font-data-display text-[18px] text-error font-semibold mt-1 block">-350 000</span>
              <span className="font-label-sm text-label-sm text-secondary">FCFA</span>
            </div>
            <div className="bg-tertiary-container/30 p-3 rounded-lg shadow-sm text-center">
              <span className="font-label-caps text-label-caps text-on-tertiary-container uppercase block">Solde net</span>
              <span className="font-data-display text-[18px] text-on-surface font-semibold mt-1 block">+95 000</span>
              <span className="font-label-sm text-label-sm text-on-tertiary-container">FCFA</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 animate-fade-in-up animate-fade-in-delay-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-9 rounded-full font-label-sm text-label-sm transition-all ${
                  filter === f
                    ? "bg-on-surface text-surface-container-lowest font-semibold"
                    : "bg-surface-container-lowest text-secondary hover:text-on-surface"
                }`}
              >
                {f}
              </button>
            ))}
            <button className="ml-auto w-9 h-8 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {allTransactions.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="w-full text-left bg-surface-container-lowest rounded-xl p-4 shadow-sm hover-lift animate-fade-in-up"
                style={{ animationDelay: `${0.03 * i}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    t.type === "credit" ? "bg-tertiary-container" : t.type === "interest" ? "bg-primary-container" : "bg-surface-container"
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] ${
                      t.type === "credit" ? "text-on-tertiary-container" : t.type === "interest" ? "text-on-surface" : "text-secondary"
                    }`}>{t.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-body-md text-body-md text-on-surface font-medium truncate">{t.title}</span>
                      <span className={`font-data-mono text-data-mono font-semibold shrink-0 ${
                        t.type === "debit" ? "text-error" : "text-tertiary"
                      }`}>{t.amount}</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-secondary">{t.subtitle} • {t.date}</span>
                  </div>
                </div>
                {expanded === t.id && (
                  <div className="mt-3 pt-3 border-t border-surface-container">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-secondary uppercase">Statut</span>
                      <span className={`font-label-sm text-label-sm ${
                        t.status === "completed" ? "text-tertiary" : t.status === "pending" ? "text-secondary" : "text-error"
                      }`}>
                        {t.status === "completed" ? "Complétée" : t.status === "pending" ? "En attente" : "Échouée"}
                      </span>
                    </div>
                    <span className="font-data-mono text-label-sm text-secondary block mt-1.5">
                      ID: TX-{t.id.toString().padStart(6, "0")}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Export */}
          <div className="pt-space-sm animate-fade-in-up animate-fade-in-up-delay-3">
            <button className="w-full h-11 bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-medium rounded-lg shadow-sm flex items-center justify-between px-space-md hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">description</span>
                <span>Télécharger l&apos;extrait PDF</span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav active="portefeuille" />
    </>
  );
}
