"use client";

import { useState } from "react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CircleCheck,
  CirclePlus,
  ChevronRight,
  FileUp,
  Hourglass,
  SlidersHorizontal,
  User,
} from "lucide-react";

export default function EntreprisePage() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleUploadClick = () => {
    const fileInput = document.getElementById("compliance-file-input") as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
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
              <span className="font-headline-sm text-headline-sm text-on-surface leading-none">Entreprise</span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <button className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
              <SlidersHorizontal className="w-[20px] h-[20px]" strokeWidth={1.5} />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="text-on-primary w-[18px] h-[18px]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-24 bg-surface px-space-md min-h-screen">
        <div className="flex flex-col w-full space-y-space-lg">
          {/* Context Header */}
          <div className="animate-fade-in-up flex flex-col pt-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container inline-block"></span>
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">Plateforme Émetteur</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="font-body-md text-body-md text-secondary font-medium">Atelier Nova SARL &bull; PME Agro-industrie</p>
              <span className="font-data-mono text-label-sm text-secondary">ID: AN-CI-8842</span>
            </div>
          </div>

          {/* Primary Action CTA */}
          <div className="animate-fade-in-up animate-fade-in-up-delay-1">
            <button className="glow-primary w-full bg-primary-container active:scale-[0.99] transition-transform text-on-primary-fixed font-headline-sm text-headline-sm py-space-md px-space-lg rounded flex items-center justify-between shadow-sm group" type="button">
              <div className="flex items-center gap-space-sm">
                <CirclePlus className="w-[24px] h-[24px]" strokeWidth={1.5} />
                <span className="font-semibold tracking-tight">Déposer un nouveau projet</span>
              </div>
              <ArrowRight className="w-[20px] h-[20px] transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-space-sm">
            {/* Metric 1: Financements actifs */}
            <div className="animate-fade-in-up hover-lift bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Financements Actifs</span>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-semibold">100% Clôturé</span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-data-display text-data-display text-on-surface font-semibold">50 000 000</span>
                <span className="font-data-mono text-body-sm text-secondary">FCFA</span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden mt-space-sm mb-1">
                <div className="bg-primary h-full w-full"></div>
              </div>
              <span className="font-body-sm text-body-sm text-secondary">Levée globale souscrite via Nexora Capital</span>
            </div>
            {/* Metric 2: Prochaine échéance */}
            <div className="animate-fade-in-up animate-fade-in-up-delay-1 hover-lift bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Prochaine Échéance</span>
                <span className="font-data-mono text-label-sm text-primary font-semibold">Échéance J-12</span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-data-display text-data-display text-on-surface font-semibold">1 666 667</span>
                <span className="font-data-mono text-body-sm text-secondary">FCFA</span>
              </div>
              <div className="flex items-center gap-space-xs text-secondary mt-space-xs">
                <CalendarClock className="w-[16px] h-[16px] text-primary" strokeWidth={1.5} />
                <span className="font-body-sm text-body-sm">15 Nov. 2024 &bull; Coupon #1 + Amortissement</span>
              </div>
            </div>
            {/* Metric 3: Compte d'exploitation */}
            <div className="animate-fade-in-up animate-fade-in-up-delay-2 hover-lift bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Compte d&apos;Exploitation Dédié</span>
                <span className="w-2 h-2 rounded-full bg-primary"></span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-data-display text-data-display text-on-surface font-semibold">14 250 000</span>
                <span className="font-data-mono text-body-sm text-secondary">FCFA</span>
              </div>
              <div className="flex items-center justify-between text-secondary mt-space-xs">
                <span className="font-body-sm text-body-sm">Disponibilité immédiate</span>
                <span className="font-data-mono text-label-sm text-on-surface-variant font-medium">Auto-débit armé</span>
              </div>
            </div>
          </div>

          {/* Financements en cours */}
          <div className="animate-fade-in-up flex flex-col space-y-space-sm pt-space-xs">
            <div className="flex items-center justify-between px-space-xs">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Financements en cours</h3>
              <span className="font-data-mono text-label-sm text-secondary">2 dossiers</span>
            </div>
            {/* Card 1: Active Project */}
            <div className="hover-lift bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md">
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Projet Industriel</span>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">Ligne d&apos;ensachage robotisée</h4>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-1 rounded bg-tertiary-container text-on-tertiary-container font-semibold whitespace-nowrap">
                  Amortissement (1/6)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm bg-surface-container-low p-space-md rounded">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase">Montant financé</span>
                  <p className="font-data-mono text-body-md text-on-surface font-medium mt-0.5">50 000 000 FCFA</p>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase">Conditions</span>
                  <p className="font-data-mono text-body-md text-on-surface font-medium mt-0.5">8,00% &bull; 6 mois</p>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase">Prochain Coupon</span>
                  <p className="font-data-mono text-body-md text-primary font-medium mt-0.5">15 Nov. 2024</p>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase">Progression</span>
                  <p className="font-data-mono text-body-md text-on-surface font-medium mt-0.5">16.6% soldé</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-body-sm text-body-sm text-secondary">Calendrier conforme aux stipulations</span>
                <button className="font-label-caps text-label-caps text-primary hover:underline uppercase tracking-wider font-semibold flex items-center gap-1" type="button">
                  Échéancier
                  <ChevronRight className="w-[14px] h-[14px]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            {/* Card 2: Instruction */}
            <div className="hover-lift bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md">
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Extension Logistique</span>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">Agrandissement hangar stockage</h4>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-semibold whitespace-nowrap">
                  Instruction Nexora
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <Hourglass className="text-secondary w-[20px] h-[20px]" strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md text-on-surface">Comité des risques en délibération</span>
                    <span className="font-data-mono text-label-sm text-secondary">Soumis le 02 Oct. 2024</span>
                  </div>
                </div>
                <span className="font-data-mono text-label-sm text-on-surface font-medium">Phase 2/3</span>
              </div>
            </div>
          </div>

          {/* Site Photo */}
          <div className="animate-fade-in-up bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col space-y-space-xs">
            <div className="relative w-full h-36 rounded overflow-hidden">
              <img className="w-full h-full object-cover" alt="Site d'exploitation" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZ1sAtapLWCxFdtFdRemDhHXxkzszuL5N-p5BIp_aHnnUUADrJnjjkLmdNdgt8EzE6RYNhZu32LGfYn_FRJhMsmT9Hj2yLOH21GC0Osc8ORsC3Nwj06rpJTnFKqm52eGQkNAZRDnydLFz0KjQtr18_6Nbru_ysLG6XoILMNKPyIdGhCUy4BIHBdGz8jRv35NWlW43a8FzrvOsGkKCQ0cQ-cShkrscEZ4BuliyQj8RTqaXRP8yQh3aM7A" />
              <div className="absolute bottom-2 left-2 bg-inverse-surface/80 text-inverse-on-surface px-2 py-0.5 rounded font-label-caps text-label-caps uppercase">
                Site d&apos;Exploitation &bull; San Pedro
              </div>
            </div>
          </div>

          {/* Action Requise */}
          <div className="animate-fade-in-up bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-sm">
            <div className="flex items-center gap-space-xs text-on-surface">
              <BellRing className="text-error w-[20px] h-[20px]" strokeWidth={1.5} />
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-error font-semibold">Action Requise</span>
            </div>
            <div className="flex flex-col space-y-1">
              <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Transmission du bilan semestriel certifié</h4>
              <p className="font-body-sm text-body-sm text-secondary">
                Échéance contractuelle fixée au <span className="font-semibold text-on-surface">30 Novembre 2024</span> pour le maintien des facilités de crédit.
              </p>
            </div>
            <div className="pt-space-xs">
              <button
                className={`glow-primary w-full bg-surface-container-high active:bg-secondary-container text-on-surface font-label-caps text-label-caps uppercase tracking-wider py-space-md px-space-md rounded flex items-center justify-center gap-space-xs transition-colors font-semibold ${uploadedFile ? "bg-tertiary-container" : ""}`}
                type="button"
                onClick={handleUploadClick}
              >
                {uploadedFile ? (
                  <>
                    <CircleCheck className="w-[18px] h-[18px] text-tertiary" strokeWidth={1.5} />
                    <span className="truncate max-w-[200px] text-tertiary">{uploadedFile}</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span>Téléverser le document</span>
                  </>
                )}
              </button>
              <input accept=".pdf,.xlsx,.xls" className="hidden" id="compliance-file-input" type="file" onChange={handleFileChange} />
            </div>
          </div>
        </div>
      </main>

      <BottomNav active="entreprise" />
    </>
  );
}
