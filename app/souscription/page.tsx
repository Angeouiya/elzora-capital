"use client";

import { useState } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";

export default function SouscriptionPage() {
  const [checkRisk1, setCheckRisk1] = useState(true);
  const [checkRisk2, setCheckRisk2] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("nexora");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const canSubmit = checkRisk1 && checkRisk2 && !signing && !signed;

  const handleSign = () => {
    if (!canSubmit) return;
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      setSigned(true);
    }, 1200);
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <button aria-label="Retour" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface hover:text-primary transition-colors" onClick={() => window.history.back()}>
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <NexoraLogo size={28} />
            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate max-w-[170px]">Souscription</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-surface pt-16 pb-safe min-h-screen">
        <div className="flex flex-col w-full pb-10">
          {/* Stepper Horizontal */}
          <div className="w-full px-space-md pt-space-md pb-space-sm bg-surface animate-fade-in-up">
            <div className="flex items-center justify-between relative">
              {/* Background Connecting Track */}
              <div className="absolute left-6 right-6 top-3.5 h-[2px] bg-surface-variant z-0"></div>
              {/* Active Progress Track */}
              <div className="absolute left-6 w-1/3 top-3.5 h-[2px] bg-on-surface z-0"></div>
              {/* Step 1: Completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-7 h-7 rounded-full bg-on-surface text-surface flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[15px]">check</span>
                </div>
                <span className="mt-1 font-label-caps text-label-caps text-on-surface font-medium">Montant</span>
              </div>
              {/* Step 2: Active */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-7 h-7 rounded-full bg-on-surface text-primary-container flex items-center justify-center ring-4 ring-surface-variant font-data-mono text-[12px] font-semibold">
                  2
                </div>
                <span className="mt-1 font-label-caps text-label-caps text-on-surface font-bold tracking-tight">Contrat &amp; Risques</span>
              </div>
              {/* Step 3: Pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-7 h-7 rounded-full bg-surface-container text-secondary flex items-center justify-center font-data-mono text-[12px]">
                  3
                </div>
                <span className="mt-1 font-label-caps text-label-caps text-secondary">Paiement</span>
              </div>
              {/* Step 4: Pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-7 h-7 rounded-full bg-surface-container text-secondary flex items-center justify-center font-data-mono text-[12px]">
                  4
                </div>
                <span className="mt-1 font-label-caps text-label-caps text-secondary">Confirmation</span>
              </div>
            </div>
          </div>

          <div className="px-space-md flex flex-col gap-space-md mt-space-sm">
            {/* Project Reminder */}
            <div className="w-full bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex items-start gap-space-sm hover-lift animate-fade-in-up animate-fade-in-up-delay-1">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-surface text-[20px]">factory</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-caps text-label-caps uppercase text-secondary">Projet PME</span>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-medium">8% &bull; 6 mois</span>
                </div>
                <p className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate mt-0.5">Atelier Nova SARL</p>
                <p className="font-body-sm text-body-sm text-secondary truncate">Ligne d&apos;ensachage automatisée</p>
              </div>
            </div>

            {/* Financial Details */}
            <div className="w-full bg-surface-container-lowest p-space-md rounded-lg shadow-sm animate-fade-in-up animate-fade-in-up-delay-2">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Détails financiers</span>
                <span className="font-label-caps text-label-caps text-secondary">DEVISE : XOF (FCFA)</span>
              </div>
              <div className="divide-y divide-surface-container-low mt-2">
                <div className="py-2.5 flex justify-between items-center text-on-surface">
                  <span className="font-body-sm text-body-sm text-secondary">Montant de votre souscription</span>
                  <span className="font-data-mono text-data-mono font-medium">50 000 FCFA</span>
                </div>
                <div className="py-2.5 flex justify-between items-start text-on-surface">
                  <div className="flex flex-col pr-2">
                    <span className="font-body-sm text-body-sm text-secondary">Frais de souscription</span>
                    <span className="font-label-sm text-label-sm text-tertiary font-medium">Pris en charge par l&apos;émetteur</span>
                  </div>
                  <span className="font-data-mono text-data-mono text-tertiary font-medium">0 FCFA</span>
                </div>
                <div className="py-3 flex justify-between items-center bg-surface-container-low px-space-sm rounded my-1">
                  <span className="font-body-md text-body-md font-semibold text-on-surface">Total à débiter</span>
                  <span className="font-data-display text-[20px] leading-tight font-bold text-on-surface">50 000 FCFA</span>
                </div>
                <div className="py-2.5 flex justify-between items-center text-on-surface">
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm text-secondary">Intérêts bruts prévisionnels</span>
                    <span className="font-label-sm text-label-sm text-secondary">Rendement contractuel</span>
                  </div>
                  <span className="font-data-mono text-data-mono font-semibold text-tertiary">+4 000 FCFA</span>
                </div>
                <div className="pt-2.5 flex items-start gap-2 text-secondary">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-0.5">calendar_month</span>
                  <span className="font-body-sm text-body-sm leading-relaxed">
                    Échéances : 6 versements mensuels des intérêts avec amortissement in fine du capital emprunté.
                  </span>
                </div>
              </div>
            </div>

            {/* Identity Verification */}
            <div className="w-full bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex items-center justify-between animate-fade-in-up animate-fade-in-up-delay-3">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="min-w-0">
                  <p className="font-body-md text-body-md font-semibold text-on-surface truncate">Amadou Koné</p>
                  <p className="font-label-sm text-label-sm text-secondary truncate">Compte investisseur vérifié</p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 rounded bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase font-semibold">
                UEMOA Niv. 2
              </span>
            </div>

            {/* Legal Documentation */}
            <div className="w-full bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md animate-fade-in-up animate-fade-in-up-delay-3">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Documentation légale</h3>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">Veuillez parcourir et valider les accords d&apos;investissement</p>
              </div>
              {/* PDF Link */}
              <a className="flex items-center justify-between p-space-sm rounded bg-surface-container-low hover:bg-surface-container transition-colors group" href="#">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-8 h-8 rounded bg-surface text-on-surface flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface truncate">Contrat-prêt-#NOVA-2024-03.pdf</p>
                    <p className="font-label-caps text-label-caps text-secondary">PDF &bull; 420 Ko</p>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm font-semibold text-primary group-hover:underline shrink-0 ml-2">Lire</span>
              </a>
              {/* Checkboxes */}
              <div className="flex flex-col gap-space-sm pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkRisk1}
                    onChange={(e) => setCheckRisk1(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-xs accent-on-surface shrink-0 cursor-pointer"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface leading-snug">
                    J&apos;ai pris connaissance de la note d&apos;information synthétique et des facteurs de risques propres à cette émission.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkRisk2}
                    onChange={(e) => setCheckRisk2(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-xs accent-on-surface shrink-0 cursor-pointer"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface leading-snug">
                    Je comprends que cet investissement ne constitue pas un dépôt bancaire garanti et comporte un risque de perte en capital.
                  </span>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="w-full bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm animate-fade-in-up animate-fade-in-up-delay-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Mode de débit</h3>
                <span className="font-label-caps text-label-caps text-secondary">Paiement instantané</span>
              </div>
              <div aria-label="Mode de paiement" className="flex flex-col gap-2 mt-1" role="radiogroup">
                {/* Option A: Solde Nexora */}
                <label className={`flex items-center justify-between p-3 rounded-lg bg-surface-container-low cursor-pointer relative card-hover-glow ${paymentMethod === "nexora" ? "border-2 border-on-surface" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="nexora"
                      checked={paymentMethod === "nexora"}
                      onChange={() => setPaymentMethod("nexora")}
                      className="w-4 h-4 accent-on-surface shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">Solde Compte Nexora</span>
                        <span className="bg-primary-container text-on-surface font-label-caps text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">Recommandé</span>
                      </div>
                      <p className="font-data-mono text-label-sm text-secondary">Disponible : 145 000 FCFA</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0">account_balance_wallet</span>
                </label>
                {/* Option B: Mobile Money */}
                <label className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors card-hover-glow">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile-money"
                      checked={paymentMethod === "mobile-money"}
                      onChange={() => setPaymentMethod("mobile-money")}
                      className="w-4 h-4 accent-on-surface shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="font-body-sm text-body-sm font-medium text-on-surface block truncate">Mobile Money</span>
                      <p className="font-label-sm text-label-sm text-secondary">Wave, Orange Money, MTN MoMo</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">smartphone</span>
                </label>
                {/* Option C: Virement */}
                <label className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors card-hover-glow">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="virement"
                      checked={paymentMethod === "virement"}
                      onChange={() => setPaymentMethod("virement")}
                      className="w-4 h-4 accent-on-surface shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="font-body-sm text-body-sm font-medium text-on-surface block truncate">Virement bancaire direct</span>
                      <p className="font-label-sm text-label-sm text-secondary">Traitement standard UEMOA</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">account_balance</span>
                </label>
              </div>
            </div>

            {/* CTA Button */}
            <div className="w-full flex flex-col gap-2 pt-space-xs animate-fade-in-up animate-fade-in-up-delay-4">
              <button
                className={`w-full min-h-[52px] bg-primary-container hover:opacity-95 active:bg-inverse-primary text-on-surface rounded-lg font-headline-sm text-body-lg font-bold flex items-center justify-center gap-2 px-space-md transition-all shadow-sm glow-primary ${!canSubmit ? "opacity-45 pointer-events-none" : ""}`}
                type="button"
                onClick={handleSign}
                disabled={!canSubmit}
              >
                {signing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    <span>Chiffrement &amp; Signature en cours...</span>
                  </>
                ) : signed ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Contrat signé avec succès</span>
                  </>
                ) : (
                  <>
                    <span>Signer le contrat et valider l&apos;investissement</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-secondary text-center">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Signature électronique certifiée &bull; Sécurisation SSL 256-bit</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
