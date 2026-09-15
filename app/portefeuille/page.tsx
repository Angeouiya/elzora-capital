"use client";

import { useState } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";

export default function PortefeuillePage() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3500);
    }, 1200);
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">NEXORA CAPITAL</span>
              <span className="font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface truncate max-w-[140px]">Mon Portefeuille</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <Link href="/" className="min-h-[44px] px-space-sm flex items-center justify-center font-label-sm text-label-sm text-on-surface font-medium hover:text-primary transition-colors">Connexion</Link>
            <a className="min-h-[44px] px-space-md py-space-xs rounded-full bg-primary-container text-on-background font-label-sm text-label-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity" href="#">Créer un compte</a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 ml-space-xs">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full px-space-md py-space-md space-y-space-md">
          {/* Personal Header */}
          <div className="flex flex-col space-y-space-xs animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Mon Portefeuille</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps">
                VÉRIFIÉ
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">Amadou Koné &bull; Investisseur Privé</p>
          </div>

          {/* 3 KPI Cards */}
          <div className="flex flex-col space-y-space-sm">
            {/* KPI 1: Capital engagé */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm hover-lift animate-fade-in-up">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Capital engagé restant</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">lock</span>
              </div>
              <div className="font-data-display text-data-display text-on-surface font-medium animate-count-up">950 000 <span className="font-label-sm text-label-sm font-normal text-secondary">FCFA</span></div>
              <div className="mt-space-xs flex items-center gap-space-xs font-body-sm text-body-sm text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span>Dans 3 projets actifs</span>
              </div>
            </div>
            {/* KPI 2: Intérêts perçus */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm hover-lift animate-fade-in-up animate-fade-in-up-delay-1">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Intérêts réels perçus</span>
                <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              </div>
              <div className="font-data-display text-data-display text-on-surface font-medium animate-count-up">+76 400 <span className="font-label-sm text-label-sm font-normal text-secondary">FCFA</span></div>
              <div className="mt-space-xs font-body-sm text-body-sm text-tertiary">
                Sommes effectives déjà encaissées
              </div>
            </div>
            {/* KPI 3: Solde disponible */}
            <div className="bg-tertiary-container/30 p-space-md rounded-lg shadow-sm hover-lift card-hover-glow animate-fade-in-up animate-fade-in-up-delay-2">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-on-tertiary-container uppercase tracking-wider font-semibold">Solde disponible</span>
                <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">account_balance_wallet</span>
              </div>
              <div className="font-data-display text-data-display text-on-surface font-semibold animate-count-up">145 000 <span className="font-label-sm text-label-sm font-normal text-on-tertiary-container">FCFA</span></div>
              <div className="mt-space-xs font-body-sm text-body-sm text-on-tertiary-container">
                Fonds libres de tout engagement
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-space-sm pt-space-xs animate-fade-in-up animate-fade-in-up-delay-2">
            <button className="min-h-[44px] px-space-sm py-space-sm bg-primary-container text-on-background font-label-sm text-label-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 active:opacity-80 transition-opacity" type="button">
              <span className="material-symbols-outlined text-[18px]">north_east</span>
              <span>Verser sur ma banque</span>
            </button>
            <button className="min-h-[44px] px-space-sm py-space-sm bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 hover:bg-surface-container-low transition-colors" type="button">
              <span className="material-symbols-outlined text-[18px]">savings</span>
              <span>Réinvestir</span>
            </button>
          </div>

          {/* Prochaine échéance */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm space-y-space-sm animate-fade-in-up animate-fade-in-up-delay-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">calendar_month</span>
                <span className="font-label-caps text-label-caps uppercase text-secondary tracking-wider">Prochaine échéance</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps">
                EN ATTENTE
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-space-xs">
              <div>
                <p className="font-headline-sm text-headline-sm font-semibold text-on-surface leading-tight">15 Octobre 2024</p>
                <p className="font-body-sm text-body-sm text-secondary">Atelier Nova SARL</p>
              </div>
              <div className="text-right">
                <p className="font-data-mono text-data-mono text-on-surface font-semibold">+666 FCFA</p>
                <p className="font-body-sm text-body-sm text-secondary">Coupon mensuel</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-space-xs text-secondary font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>En attente de paiement &bull; Date de valeur garantie</span>
            </div>
          </div>

          {/* Investissements actifs */}
          <div className="space-y-space-sm pt-space-xs animate-fade-in-up animate-fade-in-up-delay-3">
            <div className="flex items-center justify-between px-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Investissements actifs</h2>
              <span className="font-label-sm text-label-sm text-secondary">3 positions</span>
            </div>
            {/* Position 1 */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm space-y-space-sm hover-lift">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-caps text-label-caps uppercase text-secondary">Atelier Nova SARL</span>
                  <h3 className="font-body-lg text-body-lg text-on-surface font-medium">Ensachage robotisé</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-on-tertiary-container font-label-caps text-label-caps font-semibold">
                  En cours régulier
                </span>
              </div>
              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Souscription</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">50 000 F</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Rendement</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">8% / 6m</span>
                </div>
                <div className="text-right">
                  <span className="font-label-caps text-label-caps text-secondary block">Progression</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">Échéance 1/6</span>
                </div>
              </div>
            </div>
            {/* Position 2 */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm space-y-space-sm hover-lift animate-fade-in-up animate-fade-in-up-delay-1">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-caps text-label-caps uppercase text-secondary">Agro-Alliance SARL</span>
                  <h3 className="font-body-lg text-body-lg text-on-surface font-medium">Stock anacarde</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-on-tertiary-container font-label-caps text-label-caps font-semibold">
                  À jour
                </span>
              </div>
              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Souscription</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">300 000 F</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Rendement</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">7,5% / 12m</span>
                </div>
                <div className="text-right">
                  <span className="font-label-caps text-label-caps text-secondary block">Progression</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">Échéance 4/12</span>
                </div>
              </div>
            </div>
            {/* Position 3 */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm space-y-space-sm hover-lift animate-fade-in-up animate-fade-in-up-delay-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-caps text-label-caps uppercase text-secondary">Sahel Logistique</span>
                  <h3 className="font-body-lg text-body-lg text-on-surface font-medium">Véhicules frigorifiques</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-on-tertiary-container font-label-caps text-label-caps font-semibold">
                  À jour
                </span>
              </div>
              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Souscription</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">600 000 F</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary block">Rendement</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">9% / 18m</span>
                </div>
                <div className="text-right">
                  <span className="font-label-caps text-label-caps text-secondary block">Progression</span>
                  <span className="font-data-mono text-data-mono text-on-surface font-medium">Échéance 6/18</span>
                </div>
              </div>
            </div>
          </div>

          {/* Download Statement */}
          <div className="pt-space-xs pb-space-sm animate-fade-in-up animate-fade-in-up-delay-4">
            <button
              className={`w-full min-h-[44px] px-space-md py-space-sm bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-medium rounded-lg shadow-sm flex items-center justify-between hover:bg-surface-container-low transition-colors ${downloading ? "opacity-75" : ""}`}
              type="button"
              onClick={handleDownload}
            >
              {downloading ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Génération du document scellé...</span>
                </div>
              ) : downloaded ? (
                <>
                  <div className="flex items-center gap-2 text-tertiary">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Relevé T3-2024 téléchargé</span>
                  </div>
                  <span className="material-symbols-outlined text-tertiary text-[18px]">download_done</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[20px]">description</span>
                    <span>Télécharger le relevé trimestriel officiel (PDF)</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[18px]">download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="portefeuille" />
    </>
  );
}
