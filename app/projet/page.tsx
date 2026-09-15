"use client";

import { useState } from "react";
import Link from "next/link";

export default function ProjetPage() {
  const [activeTab, setActiveTab] = useState("projet");
  const [investAmount, setInvestAmount] = useState(50000);

  const rate = 0.08;
  const interest = investAmount * rate;
  const total = investAmount + interest;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

  const tabs = [
    { id: "projet", label: "Projet" },
    { id: "finances", label: "Finances" },
    { id: "documents", label: "Documents" },
    { id: "suivi", label: "Suivi" },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <button aria-label="Retour" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-[18px]">savings</span>
            </div>
            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate max-w-[170px]">Detail Offre</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-surface pt-16 pb-safe min-h-screen">
        <div className="flex flex-col w-full">
          {/* Breadcrumb */}
          <div className="px-space-md py-space-sm flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-label-caps text-label-caps text-secondary uppercase">
              <span>Opportunites</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Industrie</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-label-caps uppercase bg-surface-container-highest text-on-surface-variant font-semibold">Emission Obligataire</span>
          </div>

          {/* Identity */}
          <div className="px-space-md pt-space-xs pb-space-md">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
              <h2 className="font-label-sm text-label-sm font-semibold text-secondary uppercase tracking-wider">Atelier Nova SARL - Dakar, Senegal</h2>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface leading-tight font-semibold">{"Ligne d'ensachage et de conditionnement automatisee"}</h1>
          </div>

          {/* Photo */}
          <div className="px-space-md mb-space-md">
            <div className="relative w-full h-52 rounded-lg overflow-hidden bg-surface-container shadow-sm">
              <img className="w-full h-full object-cover" alt="Site industriel" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOWOnzFBavXx2lIoYLamSgyW0HUE_-hPvx41j_xJihlB_QpeuV50jJF2UMXT-zFdrFFdH3ZMi2yyMOwecrXwUnEEUNhc-rbQycPeqTeU5JbtX7DMl7sHVSHiYZydMcBphqvmA-kszbFvVQ6rO1yAZPUd28KV3ziC4qtH3k-WPQmnyvtdar8_5D9pteRFaEYkJHq6WfzaWsRQ-PJ-G2BOUq6KpQKeCIpNeKZGtnRpeiw6JKcl0EqvKnhQ" />
              <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-data-mono text-on-surface font-medium flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container inline-block"></span>
                Site operationnel Diamniadio
              </div>
            </div>
          </div>

          {/* Financial Summary 2x2 */}
          <div className="px-space-md mb-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Rendement</span>
                    <span className="material-symbols-outlined text-[16px] text-primary">percent</span>
                  </div>
                  <div>
                    <div className="font-data-display text-headline-sm font-semibold text-on-surface">8 %</div>
                    <div className="font-label-sm text-label-sm text-secondary">sur 6 mois (fixe)</div>
                  </div>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Maturite</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">calendar_month</span>
                  </div>
                  <div>
                    <div className="font-data-display text-headline-sm font-semibold text-on-surface">6 mois</div>
                    <div className="font-label-sm text-label-sm text-secondary">Echeance S2 2025</div>
                  </div>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Remboursement</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm font-semibold text-on-surface">In fine</div>
                    <div className="font-body-sm text-body-sm text-secondary">Coupons mensuels</div>
                  </div>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Accessibilite</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">toll</span>
                  </div>
                  <div>
                    <div className="font-data-mono text-label-sm font-semibold text-on-surface">10 000 FCFA</div>
                    <div className="font-body-sm text-body-sm text-secondary">Ticket unitaire min.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-space-md mb-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="font-data-mono font-semibold text-headline-sm text-on-surface">30 000 000</span>
                  <span className="font-label-caps text-label-caps text-secondary uppercase ml-1">FCFA</span>
                </div>
                <div className="font-data-mono text-body-sm font-medium text-primary">60% finances</div>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary-container" style={{ width: "60%" }}></div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-secondary">
                <span>{"Objectif : "}<strong className="text-on-surface font-medium">50 000 000 FCFA</strong></span>
                <span className="flex items-center gap-1 text-on-surface">
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                  <strong>14 jours</strong> restants
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="px-space-md mb-space-md">
            <div className="bg-error-container/40 rounded-xl p-3.5 flex gap-3 items-start shadow-sm">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">warning</span>
              <div className="space-y-1">
                <div className="font-label-caps text-label-caps uppercase font-bold text-error tracking-wider">Avertissement reglementaire AMF / CREPMF</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{"Le financement participatif comporte un risque de perte partielle ou totale du capital investi et un risque d'illiquidite."}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-space-md mb-space-sm">
            <div className="bg-surface-container-high p-1 rounded-lg flex items-center">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 text-center rounded-md font-label-sm text-label-sm transition-all ${activeTab === tab.id ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "font-medium text-secondary hover:text-on-surface"}`}>{tab.label}</button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-space-md mb-space-md">
            {activeTab === "projet" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-md shadow-sm">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">{"Presentation de l'operation"}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-3">{"Fondee en 2018 au pole industriel de Diamniadio, Atelier Nova SARL s'est imposee comme un sous-traitant de reference pour l'ensachage agroalimentaire haut de gamme."}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{"Face a une saturation de 94 % de ses chaines semi-manuelles, l'entreprise engage l'installation d'un ensemble de pesage ponderal multi-tetes ultra-rapide."}</p>
                </div>
                <div className="pt-space-xs">
                  <h4 className="font-label-caps text-label-caps uppercase text-secondary font-semibold mb-3 tracking-wider">Repartition des investissements</h4>
                  <div className="w-full h-4 rounded-lg bg-surface-container-high overflow-hidden flex mb-2">
                    <div className="bg-primary h-full" style={{ width: "70%" }}></div>
                    <div className="bg-tertiary-fixed-dim h-full" style={{ width: "30%" }}></div>
                  </div>
                  <div className="space-y-2 pt-1 font-body-sm text-body-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span><span className="text-on-surface">{"Equipement robotise et convoyeurs etanches"}</span></span>
                      <span className="font-data-mono font-semibold text-on-surface">70 % (35M FCFA)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim inline-block"></span><span className="text-on-surface">{"Fonds de roulement & stocks de bobines"}</span></span>
                      <span className="font-data-mono font-semibold text-on-surface">30 % (15M FCFA)</span>
                    </div>
                  </div>
                </div>
                <div className="pt-space-xs">
                  <h4 className="font-label-caps text-label-caps uppercase text-secondary font-semibold mb-3 tracking-wider">{"Jalons d'execution technique"}</h4>
                  <div className="space-y-3 font-body-sm text-body-sm">
                    <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-primary">check_circle</span>
                      <div>
                        <div className="font-label-sm text-label-sm font-semibold text-on-surface">{"Mois 1 : Validation commande & acompte fournisseur"}</div>
                        <div className="text-secondary">{"Expedition maritime depuis Milan sous incoterm CIF Dakar."}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-secondary">radio_button_unchecked</span>
                      <div>
                        <div className="font-label-sm text-label-sm font-semibold text-on-surface">{"Mois 3 : Reception site & raccordements electriques"}</div>
                        <div className="text-secondary">{"Calibrage metrologique et tests d'etancheite sous vide."}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-secondary">radio_button_unchecked</span>
                      <div>
                        <div className="font-label-sm text-label-sm font-semibold text-on-surface">{"Mois 5 : Montee en regime industrielle & livraison clients"}</div>
                        <div className="text-secondary">{"Atteinte des cadences contractuelles de 4 800 sachets/heure."}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "finances" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-md shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Etats Financiers Certifies</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low p-3 rounded-lg">
                    <div className="font-label-caps text-label-caps text-secondary uppercase">CA N-1 (2024)</div>
                    <div className="font-data-mono text-headline-sm font-semibold text-on-surface mt-1">218M</div>
                    <div className="text-tertiary font-label-sm text-label-sm font-medium">+18.4% vs 2023</div>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded-lg">
                    <div className="font-label-caps text-label-caps text-secondary uppercase">EBITDA 2024</div>
                    <div className="font-data-mono text-headline-sm font-semibold text-on-surface mt-1">42.6M</div>
                    <div className="text-secondary font-label-sm text-label-sm">Marge brute 19.5%</div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "documents" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-2 shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">Documentation Reglementaire</h3>
                {[
                  { icon: "description", t: "Note d'information synthetique", s: "PDF - 1.4 Mo" },
                  { icon: "verified_user", t: "Rapport d'audit comptable independant", s: "PDF - 2.8 Mo" },
                  { icon: "balance", t: "Contrat cadre obligataire & garanties", s: "PDF - 890 Ko" },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">{doc.icon}</span>
                      <div>
                        <div className="font-label-sm text-label-sm font-semibold text-on-surface">{doc.t}</div>
                        <div className="font-data-mono text-body-sm text-secondary">{doc.s}</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-primary">download</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "suivi" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-md shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Indicateurs de Performance Post-Collecte</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{"Des la finalisation du tour de table, les souscripteurs ont acces a un journal de bord operationnel bimensuel."}</p>
              </div>
            )}
          </div>

          {/* Simulator */}
          <div className="px-space-md mb-space-xl">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Simulateur de rendement</h3>
                </div>
                <span className="font-label-caps text-label-caps text-secondary uppercase font-semibold">Taux 8% fixe</span>
              </div>
              <div className="space-y-1.5 mb-3">
                <label className="block font-label-caps text-label-caps uppercase text-secondary font-semibold">Montant envisage (FCFA)</label>
                <div className="relative flex items-center bg-surface-container-low rounded-lg px-3 py-2">
                  <input className="w-full bg-transparent font-data-display text-headline-sm text-on-surface font-semibold focus:outline-none" min={10000} step={5000} type="number" value={investAmount} onChange={(e) => setInvestAmount(Number(e.target.value))} />
                  <span className="font-data-mono text-body-md text-secondary font-semibold shrink-0 ml-2">FCFA</span>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                {[10000, 50000, 100000].map((d) => (
                  <button key={d} className="flex-1 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-data-mono text-body-sm font-medium transition-colors" onClick={() => setInvestAmount((p) => p + d)}>{"+" + d.toLocaleString("fr-FR")}</button>
                ))}
              </div>
              <div className="space-y-2 pt-2 pb-3">
                <div className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-secondary">Capital rembourse a terme</span>
                  <span className="font-data-mono font-medium text-on-surface">{fmt(investAmount)}</span>
                </div>
                <div className="bg-tertiary-container/40 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-label-sm text-label-sm font-semibold text-tertiary">Interets contractuels bruts</div>
                    <div className="text-[11px] text-on-tertiary-container">8 % sur 6 mois (versement mensuel)</div>
                  </div>
                  <div className="font-data-mono text-headline-sm font-semibold text-tertiary">{"+" + fmt(interest)}</div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase">Total previsionnel attendu</span>
                  <span className="font-data-display text-headline-sm font-semibold text-on-surface">{fmt(total)}</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-lg text-[11px] text-secondary leading-relaxed flex items-start gap-2 mt-2">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">info</span>
                <span>{"Remuneration contractuelle conditionnee au respect des engagements de l'emprunteur."}</span>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full p-space-md bg-surface/90 backdrop-blur-md pb-safe">
            <Link href="/souscription" className="w-full h-12 rounded bg-primary-container hover:opacity-90 text-on-background font-label-sm text-body-md font-semibold flex items-center justify-center gap-2 shadow-sm transition-all">
              <span>Investir dans ce projet</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
