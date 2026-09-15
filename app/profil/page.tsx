"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

/* ─── tiny helpers ─── */
const kycSteps = [
  { label: "Identité", icon: "verified_user", done: true },
  { label: "Adresse", icon: "home", done: true },
  { label: "Revenus", icon: "payments", done: true },
  { label: "Expérience", icon: "school", done: false, progress: 75 },
];

const activityLog = [
  { icon: "login", label: "Connexion réussie", time: "Aujourd'hui, 09:15", color: "text-tertiary" },
  { icon: "task_alt", label: "Investissement confirmé", time: "Hier, 14:30", color: "text-on-primary-container" },
  { icon: "badge", label: "Document KYC approuvé", time: "12 Sept. 2024", color: "text-tertiary" },
  { icon: "lock_reset", label: "Mot de passe mis à jour", time: "01 Sept. 2024", color: "text-secondary" },
];

export default function ProfilPage() {
  const [twoFA, setTwoFA] = useState(true);

  return (
    <div className="min-h-screen bg-surface pb-28">
      <AppHeader title="Mon Profil" showBack subtitle="NEXORA CAPITAL" />

      {/* ─── main content ─── */}
      <main className="pt-[80px] px-space-md flex flex-col gap-space-lg max-w-lg mx-auto">

        {/* ═══ Profile Card ═══ */}
        <section className="animate-fade-in-up flex flex-col items-center text-center pt-space-lg">
          {/* Avatar */}
          <div className="relative mb-space-sm">
            <div className="w-24 h-24 rounded-full bg-on-surface flex items-center justify-center shadow-lg glow-primary">
              <span className="font-data-display text-[32px] font-semibold text-primary-container tracking-tight">
                AK
              </span>
            </div>
            {/* verified badge */}
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-tertiary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-tertiary text-[16px]">verified</span>
            </span>
          </div>

          <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Amadou Koné
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-0.5">
            Dakar, Sénégal
          </p>
          <span className="mt-space-xs inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-[14px] text-secondary">calendar_month</span>
            <span className="font-label-sm text-label-sm text-secondary">Membre depuis Janvier 2024</span>
          </span>
        </section>

        {/* ═══ Investment Summary ═══ */}
        <section className="animate-fade-in-up animate-fade-in-up-delay-1">
          <div className="grid grid-cols-2 gap-space-sm">
            {[
              { label: "Total investi", value: "950 000", unit: "FCFA", icon: "savings" },
              { label: "Intérêts gagnés", value: "+76 400", unit: "FCFA", icon: "trending_up" },
              { label: "Projets actifs", value: "3", unit: "", icon: "pie_chart" },
              { label: "Niveau", value: "Privilège", unit: "", icon: "workspace_premium" },
            ].map((s) => (
              <div
                key={s.label}
                className="hover-lift card-hover-glow bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-xs"
              >
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-on-primary-container">{s.icon}</span>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-data-display text-data-display text-on-surface">{s.value}</span>
                  {s.unit && <span className="font-label-sm text-label-sm text-secondary">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* member level banner */}
          <div className="mt-space-sm bg-on-surface rounded-xl px-space-md py-space-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary-container text-[22px]">workspace_premium</span>
              <div>
                <p className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Niveau membre</p>
                <p className="font-headline-sm text-headline-sm font-semibold text-primary-container">Investisseur Privilège</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">chevron_right</span>
          </div>
        </section>

        {/* ═══ Account Info ═══ */}
        <section className="animate-fade-in-up animate-fade-in-up-delay-2">
          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-secondary mb-space-sm">
            Informations du compte
          </h2>
          <div className="bg-surface-container-lowest rounded-xl divide-y divide-surface-container">
            {/* email */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">mail</span>
                <div>
                  <p className="font-label-sm text-label-sm text-secondary">Email</p>
                  <p className="font-body-md text-body-md text-on-surface">amadou.kone@email.com</p>
                </div>
              </div>
              <button className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px] text-secondary">edit</span>
              </button>
            </div>
            {/* phone */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">phone</span>
                <div>
                  <p className="font-label-sm text-label-sm text-secondary">Téléphone</p>
                  <p className="font-body-md text-body-md text-on-surface">+221 77 *** ** 89</p>
                </div>
              </div>
              <button className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px] text-secondary">edit</span>
              </button>
            </div>
            {/* investor id */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">fingerprint</span>
                <div>
                  <p className="font-label-sm text-label-sm text-secondary">ID Investisseur</p>
                  <p className="font-data-mono text-data-mono text-on-surface">INV-2024-0842</p>
                </div>
              </div>
              <button className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[18px] text-secondary">content_copy</span>
              </button>
            </div>
            {/* kyc status */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">shield_person</span>
                <div>
                  <p className="font-label-sm text-label-sm text-secondary">Statut KYC</p>
                  <p className="font-body-md text-body-md text-on-surface">Niveau 2 — Vérifié</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container text-tertiary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Vérifié
              </span>
            </div>
          </div>
        </section>

        {/* ═══ KYC Verification Progress ═══ */}
        <section className="animate-fade-in-up animate-fade-in-up-delay-3">
          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-secondary mb-space-sm">
            Progression KYC
          </h2>
          <div className="bg-surface-container-lowest rounded-xl p-space-md">
            <div className="flex flex-col gap-space-md">
              {kycSteps.map((step) => (
                <div key={step.label} className="flex items-center gap-space-sm">
                  {/* step indicator */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      step.done
                        ? "bg-tertiary-container"
                        : "bg-surface-container-high"
                    }`}
                  >
                    {step.done ? (
                      <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-secondary text-[18px]">{step.icon}</span>
                    )}
                  </div>
                  {/* label + optional bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-body-md text-body-md ${step.done ? "text-on-surface" : "text-secondary"}`}>
                        {step.label}
                      </span>
                      {step.done ? (
                        <span className="font-label-sm text-label-sm text-tertiary">Complété</span>
                      ) : (
                        <span className="font-data-mono text-data-mono text-secondary">{step.progress}%</span>
                      )}
                    </div>
                    {!step.done && (
                      <div className="mt-1 h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-container animate-progress-fill"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* overall */}
            <div className="mt-space-md pt-space-sm border-t border-surface-container flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Progression globale</span>
              <span className="font-data-mono text-data-mono font-semibold text-on-primary-container">75 %</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-on-surface animate-progress-fill"
                style={{ width: "75%" }}
              />
            </div>
          </div>
        </section>

        {/* ═══ Security ═══ */}
        <section className="animate-fade-in-up animate-fade-in-up-delay-4">
          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-secondary mb-space-sm">
            Sécurité
          </h2>
          <div className="hover-lift card-hover-glow bg-surface-container-lowest rounded-xl divide-y divide-surface-container">
            {/* 2FA toggle */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">security</span>
                <div>
                  <p className="font-body-md text-body-md text-on-surface">Authentification 2FA</p>
                  <p className="font-label-sm text-label-sm text-secondary">Protection renforcée</p>
                </div>
              </div>
              <button
                onClick={() => setTwoFA((v) => !v)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                  twoFA ? "bg-on-surface" : "bg-surface-container-high"
                }`}
                aria-label="Basculer 2FA"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
                    twoFA ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* password */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">lock</span>
                <div>
                  <p className="font-body-md text-body-md text-on-surface">Mot de passe</p>
                  <p className="font-label-sm text-label-sm text-secondary">Modifié il y a 45 jours</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]">chevron_right</span>
            </div>
            {/* sessions */}
            <div className="flex items-center justify-between px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary">devices</span>
                <div>
                  <p className="font-body-md text-body-md text-on-surface">Sessions actives</p>
                  <p className="font-label-sm text-label-sm text-secondary">2 appareils connectés</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high font-data-mono text-data-mono text-on-surface">
                2
              </span>
            </div>
            {/* link to settings */}
            <Link
              href="/parametres"
              className="flex items-center justify-between px-space-md py-space-sm group"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-secondary group-hover:text-on-primary-container transition-colors">settings</span>
                <p className="font-body-md text-body-md text-on-surface group-hover:text-on-primary-container transition-colors">
                  Paramètres du compte
                </p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px] group-hover:text-on-primary-container group-hover:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </Link>
          </div>
        </section>

        {/* ═══ Activity Log ═══ */}
        <section className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-secondary mb-space-sm">
            Activité récente
          </h2>
          <div className="bg-surface-container-lowest rounded-xl divide-y divide-surface-container">
            {activityLog.map((item) => (
              <div key={item.label} className="flex items-center gap-space-sm px-space-md py-space-sm">
                <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                  <span className={`material-symbols-outlined text-[18px] ${item.color}`}>{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">{item.label}</p>
                  <p className="font-label-sm text-label-sm text-secondary">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <BottomNav active="portefeuille" />
    </div>
  );
}
