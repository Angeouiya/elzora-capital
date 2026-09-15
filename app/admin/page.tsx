"use client";

import { useState } from "react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";

export default function AdminPage() {
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setApproved(true);
  };

  const handleReject = () => {
    alert("Suspension initiée : Formulaire de demande de complément transmis à l'Analyste 1 et notification envoyée au porteur de projet.");
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">Nexora Capital</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-none">Offres</span>
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
          {/* Admin Badge Bar */}
          <div className="bg-inverse-surface rounded-lg p-space-md text-inverse-on-surface shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between gap-space-sm mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface text-on-surface font-label-caps text-label-caps tracking-wider uppercase font-semibold">
                  CONSOLE AUDIT &amp; RISQUES
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase tracking-wider font-semibold animate-shimmer">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  4-YEUX ACTIF
                </span>
              </div>
              <span className="font-data-mono text-data-mono text-secondary-container">TX-9042-CI</span>
            </div>
            <div className="flex items-center justify-between pt-space-xs">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-variant flex items-center justify-center text-inverse-surface font-semibold text-body-sm">
                  MD
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-inverse-on-surface leading-tight">M. Diop</span>
                  <span className="font-label-sm text-label-sm text-secondary-container">Analyste Senior Risques &amp; Décaissements</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-caps text-label-caps text-secondary-container uppercase tracking-wider block">Session Sécurisée</span>
                <span className="font-data-mono text-data-mono text-tertiary-fixed-dim">UEMOA-BRVM / ISO 27001</span>
              </div>
            </div>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-1 gap-space-sm">
            {/* Metric 1 */}
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm animate-fade-in-up hover-lift">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">En attente de décaissement</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">2 dossiers</span>
                    <span className="font-data-mono text-data-mono text-primary font-medium">65 000 000 FCFA</span>
                  </div>
                </div>
                <span className="p-2 rounded-lg bg-surface-container text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-primary-container h-full rounded-full w-3/4"></div>
              </div>
            </div>
            {/* Metrics 2 & 3 */}
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm animate-fade-in-up-delay-1 hover-lift">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider block leading-tight">Taux Impayés 30j</span>
                <span className="font-headline-md text-headline-md text-on-surface font-semibold mt-1 block">0,00 %</span>
                <div className="flex items-center gap-1 mt-1 text-tertiary">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span className="font-label-sm text-label-sm">Conforme Bourse</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm animate-fade-in-up-delay-2 hover-lift">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider block leading-tight">Comptes Séquestres</span>
                <span className="font-headline-md text-headline-md text-on-surface font-semibold mt-1 block">100 %</span>
                <div className="flex items-center gap-1 mt-1 text-tertiary">
                  <span className="material-symbols-outlined text-[14px]">balance</span>
                  <span className="font-label-sm text-label-sm">Équilibré Banque</span>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Dossier */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm space-y-space-md animate-fade-in-up-delay-2 card-hover-glow">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps tracking-wider uppercase font-semibold">
                    PRIORITÉ 1
                  </span>
                  <span className="font-data-mono text-data-mono text-secondary">#NX-AGRO-2025</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold block">Agro-Alliance SARL</span>
                <span className="font-body-md text-body-md text-on-surface-variant">Financement campagne anacarde</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">agriculture</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-surface-container-low rounded-lg p-space-md space-y-space-sm">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant font-body-sm">Collecte investisseurs (100%)</span>
                <span className="font-data-mono text-data-mono text-on-surface font-medium">50 000 000 FCFA</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant font-body-sm">Commission Nexora (6% emprunteur)</span>
                <span className="font-data-mono text-data-mono text-secondary font-medium">- 3 000 000 FCFA</span>
              </div>
              <div className="pt-space-xs border-t-0 bg-surface-container p-space-sm rounded">
                <div className="flex justify-between items-baseline">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">Net à décaisser</span>
                  <span className="font-data-display text-data-display text-on-surface font-semibold">47 000 000 FCFA</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block mt-0.5">Virement RTGS BCEAO compte séquestre SGCI</span>
              </div>
            </div>

            {/* Guarantees */}
            <div className="rounded-lg bg-tertiary-container/30 p-space-sm space-y-1.5">
              <div className="flex items-center gap-2 text-on-tertiary-container">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold">Garanties &amp; Conformité légale</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-tertiary-container pl-6">
                Sûreté réelle inscrite au RCCM d&apos;Abidjan. Nantissement de 420t de stocks d&apos;anacarde contrôlé et certifié par huissier ministériel.
              </p>
            </div>

            {/* 4-Eyes Protocol */}
            <div className="space-y-space-xs bg-surface-container-lowest p-space-xs rounded-lg">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-semibold block mb-2">
                Protocole de Contrôle Croisé (4-Yeux)
              </span>
              {/* Step 1 Complete */}
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </span>
                  <div>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium block">Analyste 1 : J. Fall</span>
                    <span className="font-label-sm text-label-sm text-secondary">Vérification complétude et KYC</span>
                  </div>
                </div>
                <span className="font-data-mono text-data-mono text-tertiary font-medium">Validé 11:20</span>
              </div>
              {/* Step 2 Pending */}
              <div className="flex items-center justify-between p-2 rounded bg-primary-container/20">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center animate-bounce">
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                  </span>
                  <div>
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold block">Validateur 2 : M. Diop (Vous)</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Attente signature électronique OTP</span>
                  </div>
                </div>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">REQUIS</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`space-y-space-sm pt-space-xs ${approved ? "opacity-40 pointer-events-none" : ""}`}>
              <button
                className="w-full h-12 bg-primary-container text-on-surface font-headline-sm text-headline-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm active:opacity-90 transition-opacity glow-primary"
                onClick={handleApprove}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                <span>Approuver le décaissement (47M FCFA)</span>
              </button>
              <button
                className="w-full h-11 bg-error-container text-error font-body-lg text-body-lg font-medium rounded-lg flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
                onClick={handleReject}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">report_problem</span>
                <span>Demander un complément / Suspendre</span>
              </button>
            </div>

            {/* Status Toast */}
            {approved && (
              <div className="p-space-sm rounded-lg bg-tertiary text-on-tertiary font-body-sm text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                <span>Ordre de virement cryptographique généré avec succès. Écriture transmise au CORE-BANKING.</span>
              </div>
            )}
          </div>

          {/* Audit Journal */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm space-y-space-sm animate-fade-in-up-delay-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">history_edu</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                  Journal d&apos;Audit Temps Réel (BCEAO/UEMOA)
                </span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary uppercase">2 Dernières Écritures</span>
            </div>
            <div className="space-y-space-xs">
              {/* Entry 1 */}
              <div className="p-space-sm rounded bg-surface-container-low flex flex-col space-y-1 animate-fade-in-up-delay-3">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">Décaissement Validé &bull; Cacao-Export CI</span>
                  <span className="font-data-mono text-data-mono text-tertiary font-medium">18 000 000 FCFA</span>
                </div>
                <div className="flex justify-between items-center text-secondary">
                  <span className="font-label-sm text-label-sm">Double signature : Fall / Ndiaye</span>
                  <span className="font-data-mono text-data-mono">Aujourd&apos;hui, 09:42:15</span>
                </div>
              </div>
              {/* Entry 2 */}
              <div className="p-space-sm rounded bg-surface-container-low flex flex-col space-y-1 animate-fade-in-up-delay-4">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">Levée d&apos;hypothèque &bull; Sol-Invest Dakar</span>
                  <span className="font-data-mono text-data-mono text-secondary font-medium">Archivage Notaire</span>
                </div>
                <div className="flex justify-between items-center text-secondary">
                  <span className="font-label-sm text-label-sm">Certificat de radiation conservateur</span>
                  <span className="font-data-mono text-data-mono">Aujourd&apos;hui, 08:15:02</span>
                </div>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                Immuabilité SHA-256
              </span>
              <a className="text-primary font-medium hover:underline" href="#">Voir les 48 écritures du jour →</a>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="offres" />
    </>
  );
}
