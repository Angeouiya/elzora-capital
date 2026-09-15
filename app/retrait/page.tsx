"use client";

import { useState } from "react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";

export default function RetraitPage() {
  const [amount, setAmount] = useState("100 000");
  const [destination, setDestination] = useState("boa");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const parseNumber = (str: string) => parseInt(str.replace(/\D/g, ""), 10) || 0;

  const updateAmount = (rawVal: number) => {
    const val = Math.min(rawVal, 145000);
    const formatted = formatNumber(val);
    setAmount(formatted);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseNumber(e.target.value);
    updateAmount(val);
  };

  const handleQuickAmount = (val: number) => {
    updateAmount(val);
  };

  const handleSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  const etaText = destination === "wave" ? "Immédiat (Moins de 5 min)" : "Demain avant 12h00";

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">Nexora Capital</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-none">Portefeuille</span>
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
        <div className="flex flex-col w-full space-y-space-md">
          {/* Back Navigation */}
          <div className="animate-fade-in-up flex items-center justify-between pt-space-xs">
            <button aria-label="Retour" className="w-10 h-10 -ml-2 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95" type="button" onClick={() => window.history.back()}>
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Réseau BCEAO Sécurisé
            </div>
          </div>

          {/* Screen Heading */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-1 space-y-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Retrait de fonds</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Transférez votre solde disponible vers votre compte bancaire ou Mobile Money.</p>
          </div>

          {/* Available Balance Card */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-2 card-hover-glow rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">account_balance</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Solde disponible</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-tertiary-container text-on-tertiary-container">Fonds libres</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="font-data-display text-data-display font-semibold tracking-tight text-on-surface">145 000</span>
                <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">FCFA</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Sans engagement</span>
            </div>
          </div>

          {/* Amount Input Card */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm space-y-space-md">
            <div>
              <label className="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant mb-1.5" htmlFor="amount-input">
                Montant à retirer
              </label>
              <div className="relative flex items-center bg-surface-container-low rounded-lg px-space-md py-3 focus-within:bg-surface-container-highest transition-colors">
                <input
                  className="w-full bg-transparent font-data-display text-data-display font-semibold text-on-surface focus:outline-none tracking-tight"
                  id="amount-input"
                  inputMode="numeric"
                  placeholder="0"
                  type="text"
                  value={amount}
                  onChange={handleInputChange}
                />
                <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant ml-2 shrink-0">FCFA</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Retrait minimum : 5 000 FCFA</span>
              </div>
            </div>
            {/* Quick Amount Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              <button className="py-2 px-1 rounded-lg bg-surface-container text-on-surface text-center font-data-mono text-data-mono hover:bg-surface-container-high transition-colors active:scale-95" type="button" onClick={() => handleQuickAmount(25000)}>
                25k
              </button>
              <button className="py-2 px-1 rounded-lg bg-surface-container text-on-surface text-center font-data-mono text-data-mono hover:bg-surface-container-high transition-colors active:scale-95" type="button" onClick={() => handleQuickAmount(50000)}>
                50k
              </button>
              <button className="py-2 px-1 rounded-lg bg-surface-container text-on-surface text-center font-data-mono text-data-mono font-medium hover:bg-surface-container-high transition-colors active:scale-95" type="button" onClick={() => handleQuickAmount(100000)}>
                100k
              </button>
              <button className="py-2 px-1 rounded-lg bg-primary-fixed text-on-primary-fixed text-center font-label-caps text-label-caps uppercase tracking-wider hover:opacity-90 transition-opacity active:scale-95" type="button" onClick={() => handleQuickAmount(145000)}>
                Tout (145k)
              </button>
            </div>
          </div>

          {/* Destination */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Destination du versement</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">2 comptes vérifiés</span>
            </div>
            <div className="space-y-2">
              {/* BOA */}
              <label
                className={`hover-lift relative flex items-start p-space-md rounded-xl shadow-sm cursor-pointer transition-all duration-150 active:scale-[0.99] select-none ${destination === "boa" ? "bg-surface-container-lowest" : "bg-surface-container-low opacity-85 hover:opacity-100"}`}
                onClick={() => setDestination("boa")}
              >
                <input type="radio" name="withdrawal_dest" value="boa" checked={destination === "boa"} onChange={() => setDestination("boa")} className="sr-only" />
                <div className={`mt-0.5 mr-3 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${destination === "boa" ? "bg-on-surface text-surface" : "bg-surface-container-high text-transparent"}`}>
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">BOA Sénégal</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container text-on-surface-variant shrink-0">Bancaire</span>
                  </div>
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-0.5 truncate">IBAN terminant par &bull;&bull;&bull;&bull; 4912</p>
                  <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">schedule</span>
                    <span>Délai standard : 24h ouvrées</span>
                  </div>
                </div>
              </label>
              {/* Wave */}
              <label
                className={`hover-lift relative flex items-start p-space-md rounded-xl shadow-sm cursor-pointer transition-all duration-150 active:scale-[0.99] select-none ${destination === "wave" ? "bg-surface-container-lowest" : "bg-surface-container-low opacity-85 hover:opacity-100"}`}
                onClick={() => setDestination("wave")}
              >
                <input type="radio" name="withdrawal_dest" value="wave" checked={destination === "wave"} onChange={() => setDestination("wave")} className="sr-only" />
                <div className={`mt-0.5 mr-3 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${destination === "wave" ? "bg-on-surface text-surface" : "bg-surface-container-high text-transparent"}`}>
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">Wave Mobile Money</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-medium shrink-0">Instantané</span>
                  </div>
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-0.5 truncate">+221 77 &bull;&bull;&bull; &bull;&bull; 89</p>
                  <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                    <span>Réception immédiate (0 à 5 min)</span>
                  </div>
                </div>
              </label>
              {/* Add new */}
              <button className="w-full flex items-center justify-center gap-2 p-space-md rounded-xl bg-surface-container-low text-on-surface font-headline-sm text-headline-sm font-medium hover:bg-surface-container transition-colors active:scale-[0.99]" type="button">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Ajouter un nouveau compte bancaire</span>
              </button>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="animate-fade-in-up rounded-xl bg-surface-container-lowest/70 backdrop-blur-sm p-space-md space-y-3">
            <div className="flex items-center justify-between font-body-md text-body-md">
              <span className="text-on-surface-variant">Frais de virement</span>
              <div className="text-right">
                <span className="font-data-mono text-data-mono font-medium text-tertiary">0 FCFA</span>
                <span className="block font-label-caps text-label-caps uppercase tracking-wider text-on-tertiary-container">Pris en charge par Nexora</span>
              </div>
            </div>
            <div className="h-px bg-surface-container-high"></div>
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface font-medium">Montant crédité</span>
              <div className="flex items-baseline gap-1">
                <span className="font-data-display text-data-display font-semibold text-on-surface">{amount}</span>
                <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">FCFA</span>
              </div>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm pt-1">
              <span className="text-on-surface-variant">Délai estimé de réception</span>
              <span className="font-data-mono text-data-mono font-medium text-on-surface">{etaText}</span>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-1 flex items-start gap-2 px-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">verified_user</span>
            <p className="font-body-sm text-body-sm leading-tight text-secondary">
              Opération conforme aux directives de l&apos;Union Économique et Monétaire Ouest-Africaine (UEMOA) et régulée par la BCEAO. Les fonds transitent par un compte séquestre certifié.
            </p>
          </div>

          {/* CTA Button */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-2 pt-2">
            <button
              className={`glow-primary w-full min-h-[52px] py-3.5 px-space-md rounded-lg font-headline-sm text-headline-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm ${submitted ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-surface hover:opacity-95 active:bg-primary-fixed-dim"} ${submitting ? "opacity-75" : ""}`}
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <span className="material-symbols-outlined text-[20px] font-normal">lock</span>
              <span>
                {submitting ? "Traitement sécurisé en cours..." : submitted ? "Retrait initié avec succès !" : `Confirmer le retrait de ${amount} FCFA`}
              </span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav active="portefeuille" />
    </>
  );
}
