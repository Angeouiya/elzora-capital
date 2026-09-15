"use client";

import { useState } from "react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";

export default function ConditionsPage() {
  const [amount, setAmount] = useState("35 000 000");
  const [rate, setRate] = useState("7.5");
  const [ratePeriod, setRatePeriod] = useState("6");
  const [duration, setDuration] = useState("6");
  const [frequency, setFrequency] = useState("Mensuelle");

  const adjustAmount = (delta: number) => {
    const current = parseInt(amount.replace(/\s+/g, ""), 10) || 0;
    const next = current + delta;
    setAmount(next.toLocaleString("fr-FR"));
  };

  const ratePeriods = [
    { label: "Sur 6 mois", value: "6" },
    { label: "Sur 12 mois", value: "12" },
    { label: "Sur 18 mois", value: "18" },
  ];

  const frequencies = ["Mensuelle", "Trimestrielle", "In fine"];

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">Nexora Capital</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-none">Entreprise</span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <button className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-24 bg-surface px-space-md min-h-screen">
        <div className="flex flex-col w-full pb-8">
          {/* Title & Badge */}
          <div className="animate-fade-in-up flex flex-col mb-6">
            <div className="flex items-center justify-between">
              <h1 className="font-headline-md text-headline-md text-on-surface">Nouveau Financement</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Brouillon auto
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Sauvegardé il y a 2 minutes &bull; Référence #NX-2024-884</p>
          </div>

          {/* Progress Stepper */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-1 w-full bg-surface-container-low p-3 rounded-lg mb-6 overflow-x-auto">
            <div className="flex items-center min-w-[340px] justify-between relative">
              <div className="flex items-center gap-1.5 z-10">
                <div className="w-6 h-6 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface">Entreprise</span>
              </div>
              <div className="h-0.5 w-6 bg-tertiary-container mx-1"></div>
              <div className="flex items-center gap-1.5 z-10">
                <div className="w-6 h-6 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface">Projet</span>
              </div>
              <div className="h-0.5 w-6 bg-primary-container mx-1"></div>
              <div className="flex items-center gap-1.5 z-10 px-2 py-1 rounded bg-primary-container">
                <div className="w-5 h-5 rounded-full bg-on-primary-fixed text-primary-fixed flex items-center justify-center font-data-mono text-[11px] font-bold">
                  3
                </div>
                <span className="font-label-caps text-label-caps text-on-primary-fixed font-bold">Conditions</span>
              </div>
              <div className="h-0.5 w-6 bg-surface-container-high mx-1"></div>
              <div className="flex items-center gap-1.5 z-10 opacity-40">
                <div className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-data-mono text-[11px]">
                  4
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Pièces</span>
              </div>
              <div className="h-0.5 w-6 bg-surface-container-high mx-1"></div>
              <div className="flex items-center gap-1.5 z-10 opacity-40">
                <div className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-data-mono text-[11px]">
                  5
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Fin</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-2 bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-6">
            {/* Info Box */}
            <div className="flex items-start gap-3 p-3.5 rounded bg-surface-container-low">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                L&apos;entreprise définit librement le taux, la durée et la fréquence proposés aux investisseurs, sous réserve de validation par le comité Nexora.
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant" htmlFor="amount-input">Montant recherché</label>
                <span className="font-data-mono text-body-sm text-on-surface-variant">Devise : XOF (FCFA)</span>
              </div>
              <div className="relative flex items-center">
                <input
                  className="w-full h-12 bg-surface-container-low text-on-surface font-data-display text-headline-sm px-4 rounded focus:outline-none focus:bg-surface-container"
                  id="amount-input"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="absolute right-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">FCFA</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="px-3 py-1.5 rounded bg-surface-container-high active:bg-primary-container text-on-surface font-data-mono text-body-sm transition-colors" onClick={() => adjustAmount(5000000)} type="button">
                  +5M
                </button>
                <button className="px-3 py-1.5 rounded bg-surface-container-high active:bg-primary-container text-on-surface font-data-mono text-body-sm transition-colors" onClick={() => adjustAmount(10000000)} type="button">
                  +10M
                </button>
                <button className="px-3 py-1.5 rounded bg-surface-container-high active:bg-primary-container text-on-surface font-data-mono text-body-sm transition-colors" onClick={() => adjustAmount(20000000)} type="button">
                  +20M
                </button>
              </div>
            </div>

            {/* Rate & Period */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant" htmlFor="rate-input">Taux proposé aux investisseurs</label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-12 bg-surface-container-low text-on-surface font-data-mono text-headline-sm px-4 rounded focus:outline-none focus:bg-surface-container"
                    id="rate-input"
                    type="text"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                  <span className="absolute right-4 font-headline-sm text-on-surface font-semibold">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Période exacte de référence du taux</label>
                <div className="grid grid-cols-3 gap-2">
                  {ratePeriods.map((p) => (
                    <button
                      key={p.value}
                      className={`py-2.5 px-2 rounded font-body-sm text-center transition-colors ${ratePeriod === p.value ? "bg-on-surface text-surface-lowest font-medium" : "bg-surface-container-high text-on-surface-variant"}`}
                      onClick={() => setRatePeriod(p.value)}
                      type="button"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant" htmlFor="duration-select">Durée globale du financement</label>
              <div className="relative">
                <select
                  className="w-full h-12 appearance-none bg-surface-container-low text-on-surface font-body-md px-4 rounded focus:outline-none focus:bg-surface-container"
                  id="duration-select"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="3">3 mois</option>
                  <option value="6">6 mois</option>
                  <option value="9">9 mois</option>
                  <option value="12">12 mois</option>
                  <option value="18">18 mois</option>
                  <option value="24">24 mois</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-3 pointer-events-none text-on-surface-variant">
                  expand_more
                </span>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Fréquence de remboursement</label>
              <div className="grid grid-cols-3 gap-2">
                {frequencies.map((f) => (
                  <button
                    key={f}
                    className={`py-2.5 px-2 rounded font-body-sm text-center transition-colors ${frequency === f ? "bg-on-surface text-surface-lowest font-medium" : "bg-surface-container-high text-on-surface-variant"}`}
                    onClick={() => setFrequency(f)}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Projection Card */}
            <div className="card-hover-glow rounded-lg p-4 bg-tertiary-container/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">verified</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold text-on-tertiary-container">Modélisation Prévisionnelle</span>
              </div>
              <div className="flex flex-col gap-2 pt-1 font-body-sm text-body-sm text-on-tertiary-container">
                <div className="flex justify-between items-center">
                  <span>Charge totale d&apos;intérêts :</span>
                  <span className="font-data-mono font-bold text-[14px]">2 625 000 FCFA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Commission Nexora (6%) :</span>
                  <span className="font-data-mono font-bold text-[14px]">2 100 000 FCFA</span>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-tertiary-container/80 pt-1">
                *La commission Nexora de 6% est déduite directement au décaissement. Capital net alloué : <span className="font-data-mono font-semibold">32 900 000 FCFA</span>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-3 mt-6 flex flex-col gap-3">
            <button className="glow-primary w-full h-12 rounded bg-primary-container text-on-primary-fixed font-headline-sm text-body-lg font-bold flex items-center justify-center gap-2 active:opacity-90 shadow-sm transition-opacity" type="button">
              <span>Continuer vers Budget &amp; Pièces</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <button className="w-full py-2.5 text-center text-on-surface-variant font-body-md hover:text-on-surface transition-colors" type="button">
              Enregistrer et quitter
            </button>
          </div>
        </div>
      </main>

      <BottomNav active="entreprise" />
    </>
  );
}
