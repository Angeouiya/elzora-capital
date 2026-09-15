"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

/* ------------------------------------------------------------------ */
/* Custom toggle switch                                                */
/* ------------------------------------------------------------------ */

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tone?: "primary" | "green";
}

function Toggle({ checked, onChange, label, tone = "primary" }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative w-12 h-7 rounded-full shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 ${
        checked
          ? tone === "green"
            ? "bg-tertiary shadow-[0_0_12px_rgba(31,108,58,0.35)]"
            : "bg-primary-container shadow-[0_0_12px_rgba(182,255,0,0.45)]"
          : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          checked
            ? tone === "green"
              ? "translate-x-5 bg-on-tertiary"
              : "translate-x-5 bg-on-surface"
            : "translate-x-0 bg-surface-container-lowest"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section header (neo-swiss numbered label)                           */
/* ------------------------------------------------------------------ */

function SectionHeader({
  index,
  title,
  meta,
  error = false,
}: {
  index: string;
  title: string;
  meta?: ReactNode;
  error?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-space-xs">
      <div className="flex items-baseline gap-space-sm">
        <span className={`font-data-mono text-data-mono ${error ? "text-error" : "text-tertiary"}`}>{index}</span>
        <h2 className={`font-label-caps text-label-caps uppercase tracking-wider ${error ? "text-error" : "text-secondary"}`}>{title}</h2>
      </div>
      {meta}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings row with a toggle                                          */
/* ------------------------------------------------------------------ */

function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  tone = "primary",
}: {
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  tone?: "primary" | "green";
}) {
  return (
    <div
      className="flex items-center justify-between gap-space-sm px-space-md py-space-sm cursor-pointer select-none hover:bg-surface-container-low/60 transition-colors"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-space-sm min-w-0">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="font-body-md text-body-md font-medium text-on-surface leading-tight">{title}</p>
          <p className="font-body-sm text-body-sm text-secondary leading-tight mt-0.5">{subtitle}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} tone={tone} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings row acting as a link / navigation entry                    */
/* ------------------------------------------------------------------ */

function LinkRow({
  icon,
  title,
  subtitle,
  value,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="group w-full flex items-center justify-between gap-space-sm px-space-md py-space-sm text-left hover:bg-surface-container-low/60 transition-colors"
    >
      <div className="flex items-center gap-space-sm min-w-0">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="font-body-md text-body-md font-medium text-on-surface leading-tight">{title}</p>
          <p className="font-body-sm text-body-sm text-secondary leading-tight mt-0.5">{subtitle}</p>
        </div>
      </div>
      <span className="flex items-center gap-1 shrink-0">
        {value && <span className="font-body-md text-body-md text-secondary">{value}</span>}
        <span className="material-symbols-outlined text-[20px] text-secondary transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-on-surface">chevron_right</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ParametresPage() {
  /* Toggles */
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  /* Profile visibility dropdown */
  const visibilityOptions = ["Public", "Investisseurs vérifiés", "Privé"];
  const [profileVisibility, setProfileVisibility] = useState("Investisseurs vérifiés");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visibilityOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setVisibilityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visibilityOpen]);

  return (
    <>
      {/* Header */}
      <AppHeader title="Paramètres" subtitle="NEXORA CAPITAL" showBack={true} />

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full px-space-md py-space-md space-y-space-lg">

          {/* Page heading */}
          <div className="animate-fade-in-up space-y-1 pt-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Paramètres du compte</h1>
            <p className="font-body-md text-body-md text-secondary">Préférences, sécurité et informations bancaires de votre compte.</p>
          </div>

          {/* 01 — Général */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-1 space-y-space-xs">
            <SectionHeader index="01" title="Général" />
            <div className="bg-surface-container-lowest rounded-lg shadow-sm divide-y divide-surface-container hover-lift">
              <ToggleRow icon="notifications" title="Notifications push" subtitle="Alertes en temps réel des projets" checked={pushEnabled} onChange={setPushEnabled} />
              <ToggleRow icon="mail" title="Notifications email" subtitle="Relevés et confirmations d’opération" checked={emailEnabled} onChange={setEmailEnabled} />
              <ToggleRow icon="sms" title="Notifications SMS" subtitle="Rappels d’échéance critiques" checked={smsEnabled} onChange={setSmsEnabled} />
              <LinkRow icon="language" title="Langue" subtitle="Langue de l’interface" value="Français" />
              <LinkRow icon="payments" title="Devise d’affichage" subtitle="Unité des montants affichés" value={<span className="font-data-mono text-data-mono text-secondary">FCFA (XOF)</span>} />
            </div>
          </section>

          {/* 02 — Sécurité */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-2 space-y-space-xs">
            <SectionHeader
              index="02"
              title="Sécurité"
              meta={
                twoFactorEnabled ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/60 text-on-tertiary-container font-label-caps text-label-caps">
                    <span className="w-1 h-1 rounded-full bg-tertiary animate-pulse"></span>
                    SÉCURITÉ ÉLEVÉE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps">
                    <span className="w-1 h-1 rounded-full bg-secondary"></span>
                    À RENFORCER
                  </span>
                )
              }
            />
            <div className="bg-surface-container-lowest rounded-lg shadow-sm divide-y divide-surface-container hover-lift">
              <LinkRow icon="password" title="Changer le mot de passe" subtitle="Dernière modification le 12 juin 2024" />
              <ToggleRow icon="verified_user" title="Authentification à deux facteurs" subtitle="Code à usage unique (TOTP)" checked={twoFactorEnabled} onChange={setTwoFactorEnabled} tone="green" />
              <LinkRow icon="devices" title="Sessions actives" subtitle="Appareils actuellement connectés" value="2 appareils" />
              <LinkRow icon="history" title="Historique de connexion" subtitle="Dernières activités du compte" />
            </div>
          </section>

          {/* 03 — Comptes bancaires */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-3 space-y-space-xs">
            <SectionHeader index="03" title="Comptes bancaires liés" meta={<span className="font-label-sm text-label-sm text-tertiary">2 comptes</span>} />
            <div className="bg-surface-container-lowest rounded-lg shadow-sm divide-y divide-surface-container hover-lift">
              {/* BOA */}
              <div className="flex items-center gap-space-sm px-space-md py-space-sm cursor-pointer hover:bg-surface-container-low/60 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">account_balance</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="font-body-md text-body-md font-medium text-on-surface">BOA Sénégal</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-surface font-label-caps text-label-caps">PAR DÉFAUT</span>
                  </div>
                  <p className="font-data-mono text-data-mono text-secondary mt-0.5">•••• 4912 • Virement sous 24 h</p>
                </div>
                <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">chevron_right</span>
              </div>
              {/* Wave */}
              <div className="flex items-center gap-space-sm px-space-md py-space-sm cursor-pointer hover:bg-surface-container-low/60 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">smartphone</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="font-body-md text-body-md font-medium text-on-surface">Wave</span>
                    <span className="px-2 py-0.5 rounded-full bg-tertiary-container/60 text-on-tertiary-container font-label-caps text-label-caps">MOBILE MONEY</span>
                  </div>
                  <p className="font-data-mono text-data-mono text-secondary mt-0.5">••• 89 • Versement instantané</p>
                </div>
                <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">chevron_right</span>
              </div>
              {/* Add account */}
              <div className="px-space-md py-space-sm">
                <button
                  type="button"
                  className="w-full min-h-[44px] rounded-lg border border-dashed border-outline-variant/80 text-on-surface-variant font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary hover:bg-primary-container/10 transition-all duration-200 active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Ajouter un compte
                </button>
              </div>
            </div>
          </section>

          {/* 04 — Confidentialité */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-4 space-y-space-xs">
            <SectionHeader index="04" title="Confidentialité" />
            <div className="bg-surface-container-lowest rounded-lg shadow-sm divide-y divide-surface-container hover-lift">
              {/* Visibility dropdown */}
              <div className="relative" ref={visibilityRef}>
                <button
                  type="button"
                  aria-expanded={visibilityOpen}
                  aria-haspopup="listbox"
                  onClick={() => setVisibilityOpen((open) => !open)}
                  className="w-full flex items-center justify-between gap-space-sm px-space-md py-space-sm text-left select-none hover:bg-surface-container-low/60 transition-colors"
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">visibility</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-body-md text-body-md font-medium text-on-surface leading-tight">Visibilité du profil</p>
                      <p className="font-body-sm text-body-sm text-secondary leading-tight mt-0.5">Qui peut consulter votre profil</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="font-body-md text-body-md text-secondary">{profileVisibility}</span>
                    <span className={`material-symbols-outlined text-[20px] text-secondary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visibilityOpen ? "rotate-180" : ""}`}>expand_more</span>
                  </span>
                </button>
                {visibilityOpen && (
                  <div
                    role="listbox"
                    aria-label="Visibilité du profil"
                    className="absolute right-4 top-full z-30 mt-space-xs w-60 bg-surface-container-lowest rounded-lg shadow-[0_12px_32px_rgba(0,0,0,0.14)] border border-surface-container animate-scale-in origin-top-right overflow-hidden"
                  >
                    {visibilityOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={profileVisibility === option}
                        onClick={() => {
                          setProfileVisibility(option);
                          setVisibilityOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-space-md py-space-sm text-left hover:bg-surface-container-low transition-colors"
                      >
                        <span className={`font-body-md text-body-md ${profileVisibility === option ? "text-on-surface font-semibold" : "text-secondary"}`}>{option}</span>
                        {profileVisibility === option && (
                          <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ToggleRow icon="analytics" title="Partage de données" subtitle="Statistiques anonymisées d’usage" checked={dataSharingEnabled} onChange={setDataSharingEnabled} />
              <ToggleRow icon="campaign" title="Consentement marketing" subtitle="Offres partenaires et actualités" checked={marketingEnabled} onChange={setMarketingEnabled} />
            </div>
          </section>

          {/* 05 — Légal */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-4 space-y-space-xs">
            <SectionHeader index="05" title="Légal et assistance" />
            <div className="bg-surface-container-lowest rounded-lg shadow-sm divide-y divide-surface-container hover-lift">
              <LinkRow icon="description" title="Conditions Générales d’Utilisation" subtitle="CGU de la plateforme" />
              <LinkRow icon="privacy_tip" title="Politique de confidentialité" subtitle="Collecte et protection des données" />
              <LinkRow icon="gavel" title="Mentions légales" subtitle="Éditeur et hébergement" />
              <LinkRow icon="support_agent" title="Nous contacter" subtitle="Support 7j/7 • support@nexora.capital" />
            </div>
          </section>

          {/* 06 — Zone de danger */}
          <section className="animate-fade-in-up animate-fade-in-up-delay-4 space-y-space-xs">
            <SectionHeader index="06" title="Zone de danger" error={true} />
            <div className="bg-error-container/40 border border-error/20 rounded-lg p-space-md space-y-space-sm">
              <button
                type="button"
                className="w-full min-h-[48px] rounded-lg border border-error/50 bg-surface-container-lowest/60 text-error font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 hover:border-error hover:bg-error/10 transition-all duration-200 active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                Désactiver mon compte
              </button>
              <button
                type="button"
                className="w-full min-h-[48px] rounded-lg bg-error text-on-error font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all duration-200 active:scale-[0.99] shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                Supprimer mon compte
              </button>
              <p className="font-body-sm text-body-sm text-on-error-container/80 text-center leading-snug pt-0.5">
                La désactivation reste réversible pendant 30 jours. La suppression est définitive.
              </p>
            </div>
          </section>

          {/* Version */}
          <footer className="animate-fade-in-up animate-fade-in-up-delay-4 flex flex-col items-center gap-1 pt-space-xs pb-space-sm">
            <span className="font-data-mono text-data-mono text-secondary">Nexora Capital v2.4.1 • Build 2024.09.15</span>
          </footer>
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="portefeuille" />
    </>
  );
}
