"use client";

import { useState } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";
import { BottomNav } from "@/components/BottomNav";

const offers = [
  {
    id: 1, sector: "Industrie", city: "Dakar", name: "ATELIER NOVA", code: "NOV-01",
    desc: "Nouvelle ligne d'ensachage automatisée", rate: "8,0 %", period: "6 mois",
    ticket: "10 000", collected: "30 M", target: "50 M", percent: 60,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP6z7FTFPm2Io_jTYZdjdDWL6-rSuMkNw-12XvW4oLiOUSRiTRnOIfRf5mQQu3K7yjs845iBPfIGQHXPqpiIDLAqfoKdEspVKfw5RNahDp0CuM2sumH5vZvHvf27kGDc-_8Vz6oIozEIfLZ5BfdbjlZ8q8iGllGlz2IkkrFEHOydxuaConfVhIJ8G0DSrJhwvBRQ45mFRsD41KcZueL8lDrSB6AeZuKKWHfwUlGLoi2Kuvw5l-csF-Jw",
  },
  {
    id: 2, sector: "Agriculture", city: "Abidjan", name: "AGRO-ALLIANCE", code: "AGR-04",
    desc: "Financement campagne anacarde", rate: "7,5 %", period: "12 mois",
    ticket: "25 000", collected: "42 M", target: "50 M", percent: 84,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBk20XGBSyH1jxHgF32O7uXvRNoM6KaLOx7yviSVv2ZYKvz4KitPekTyhtyacTcbZACzATy_mxIaP3eP19gYJ4fdDQ7ovDcFnoI0diT3W1AmmxVkoOn82pEDLehSJsMaUVzc__6srtg2crBJE9j-idAh5WLi6jjZwBWDpqnc5OQ_imS7L6NCAnBzH4c7_JS4DaIOQ-NE71U7T4HvXQnpIGGxhVbO9SorbU6kJPodmJsYmvKL4k_OQcffA",
  },
  {
    id: 3, sector: "Transport", city: "Bamako", name: "LOGI-SAHEL", code: "TRP-09",
    desc: "Flotte de camions frigorifiques", rate: "9,0 %", period: "18 mois",
    ticket: "50 000", collected: "18 M", target: "20 M", percent: 90,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsbg821xQOosh29xD8D1aDLmRrz4SsbNMz2xe5_mes57OrOahhEIRYFSDTLKhCCRNQspAGv0S8prcgJfHhb2A1rUY_0tvMegaKxKK4KxCtMOtRKYYmNI0eOe0pBXxJ3NQr0c_jHuwuWt4NrmUXSNwG5v-LWmyka4e6ZXNIzUZ5lsw-xzt9-L8Skl7a4gRV5jQVSs8YqpxJP1SzzvYgsVoBknF34ER-QyNIXGaY-6Dokp_KQUvCkeRMzQ",
  },
  {
    id: 4, sector: "Énergie", city: "Thiès", name: "SOLIS OUEST", code: "NRG-02",
    desc: "Mini-centrale solaire industrielle", rate: "8,5 %", period: "12 mois",
    ticket: "20 000", collected: "36 M", target: "60 M", percent: 60,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX5VJd8cC0lL5FxyPPbsFHl_-MZH2GorAE8l1FOQCsNblHRnt8c-CnAKGEQZJcnAPYz3etniL-J1NkaTGQry5MElLNFKxwrrxak8MvZxDK3RzJraxC1HOxm34XpQNcNu4YnV2P6dftWrT_WfY01qz4IzLq_yRCjGoANJWofch0_XkHvPhQX7_2fc_Or0mUuP1Ct9ZRlzXgZSrH8aZSQsD1wuJ8M18JxAwSUxeCwtb-qIzSoajPzkMWMQ",
  },
  {
    id: 5, sector: "Immobilier", city: "San-Pédro", name: "BÂTIR-CI", code: "IMM-08",
    desc: "Hangar logistique portuaire", rate: "6,5 %", period: "6 mois",
    ticket: "100 000", collected: "70 M", target: "100 M", percent: 70,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDUDgMM3B3efX5XueFfgnySknCBL-a2mQD-iwTXCoBaJibKDxKgs4D-92dWBy28uF1dqq9cyWBx2X8SndpTyYDKudTcV4LHL-JlasT66CjEp2RqODUW0eC1gELIw_VCk_ZByoDxRTzNzKSGHwEeqPWmZ85-G6ig6bdKad5ufmKwM3yiSL4CI8xi_dlYNXjCbP3gFJ7mz64PbAshMEORQSig6Fphts_yXHNRyQYRrjXHUEBHoJtNTtMekg",
  },
  {
    id: 6, sector: "Santé", city: "Lomé", name: "PHARMA-SUD", code: "SAN-03",
    desc: "Extension laboratoire de conditionnement", rate: "8,0 %", period: "9 mois",
    ticket: "25 000", collected: "12 M", target: "30 M", percent: 40,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVnsV2QmCrVcJ7OCh57wPoTNZd3n1PtvPkpJP-vsfoNe1TmmwsoH1XpBWDKvKJca0A8mN9e_s6sCeujWJVY8zaAhLaRx0mKHwxK9f7VR-bjik5QSFTtYskCpnZfz1mib75KJsDbTSLA5gsHrl7mlYnNd1kQjYPdWsCIBWix2mdPmK3cvJU1iZdXq-NnaYgjrYbyzZDtxexrvdFBmSf8krI-Ci7Xu1e9Blq4OUknednA5Xlhf9pJ-XwWw",
  },
];

const sectors = ["Tous (6)", "Industrie", "Agriculture", "Immobilier", "Énergie", "Transport"];

export default function OffresPage() {
  const [activeSector, setActiveSector] = useState("Tous (6)");
  const [search, setSearch] = useState("");

  const filtered = offers.filter((o) => {
    const matchSector = activeSector === "Tous (6)" || o.sector === activeSector;
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.desc.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchSearch;
  });

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-space-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">NEXORA CAPITAL</span>
              <span className="font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface truncate max-w-[140px]">Offres</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <Link href="/" className="min-h-[44px] px-space-sm flex items-center justify-center font-label-sm text-label-sm text-on-surface font-medium hover:text-primary transition-colors">Accueil</Link>
            <a className="min-h-[44px] px-space-md py-space-xs rounded-full bg-primary-container text-on-background font-label-sm text-label-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity" href="#">Créer un compte</a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 ml-space-xs">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full">
          {/* Page Header */}
          <section className="px-space-md pt-space-md pb-space-sm flex flex-col gap-space-xs animate-fade-in-up">
            <div className="flex items-center gap-space-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Marché primaire • T2 2025</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight leading-tight">Investissez dans des entreprises.</h1>
            <p className="font-body-md text-body-md text-secondary leading-normal">Financement direct de projets d&apos;entreprises rigoureusement audités en Afrique de l&apos;Ouest.</p>
          </section>

          {/* Search & Filters */}
          <section className="px-space-md pb-space-md flex flex-col gap-space-sm sticky top-16 z-40 bg-surface/95 backdrop-blur-md pt-space-xs animate-fade-in-up animate-fade-in-up-delay-1">
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-space-sm text-secondary text-[20px] pointer-events-none">search</span>
              <input className="w-full h-11 pl-10 pr-space-md bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-on-surface transition-all placeholder:text-secondary placeholder:font-normal" placeholder="Rechercher une entreprise, un secteur..." type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-space-xs overflow-x-auto py-0.5 -mx-space-md px-space-md" style={{ scrollbarWidth: "none" }}>
              <button className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSector(s)}
                  className={`shrink-0 px-space-md h-8 rounded-full font-label-sm text-label-sm transition-colors ${activeSector === s ? "bg-on-surface text-surface-container-lowest font-semibold" : "bg-surface-container-lowest text-secondary font-medium hover:text-on-surface"}`}
                  type="button"
                >{s}</button>
              ))}
            </div>
          </section>

          {/* Offers Grid */}
          <section className="px-space-md flex flex-col gap-space-md animate-fade-in-up animate-fade-in-up-delay-2">
            {filtered.map((o) => (
              <article key={o.id} className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm transition-transform active:scale-[0.99] hover-lift card-hover-glow">
                <div className="relative w-full h-44 rounded-lg overflow-hidden bg-surface-container">
                  <img className="w-full h-full object-cover" alt={o.desc} src={o.img} />
                  <div className="absolute top-space-xs left-space-xs bg-surface/90 backdrop-blur-sm px-2.5 py-1 rounded">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">{o.sector} • {o.city}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{o.name}</h2>
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Code #{o.code}</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">{o.desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-space-xs py-2 bg-surface-container-low rounded-lg p-2.5">
                  <div className="flex flex-col">
                    <span className="font-label-caps text-label-caps uppercase text-secondary">Rendement contractuel</span>
                    <span className="font-data-mono text-body-lg font-semibold text-on-surface">{o.rate} <span className="font-body-sm text-body-sm font-normal text-secondary">/ {o.period}</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-caps text-label-caps uppercase text-secondary">Ticket d&apos;entrée</span>
                    <span className="font-data-mono text-body-lg font-semibold text-on-surface">{o.ticket} <span className="font-body-sm text-body-sm font-normal text-secondary">FCFA</span></span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between font-label-sm text-label-sm">
                    <span className="text-secondary font-medium">Collecté : <strong className="font-data-mono font-semibold text-on-surface">{o.collected}</strong> / {o.target} FCFA</span>
                    <span className="font-data-mono font-bold text-on-surface">{o.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-on-surface rounded-full transition-all duration-500 animate-progress-fill" style={{ width: `${o.percent}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs pt-1">
                  <Link href="/projet" className="flex-1 h-11 bg-primary-container text-on-background rounded-lg flex items-center justify-center gap-1.5 font-label-sm text-label-sm font-semibold hover:opacity-90 transition-opacity">
                    <span>Voir l&apos;offre</span>
                    <span className="material-symbols-outlined text-[16px]">north_east</span>
                  </Link>
                  <button aria-label="Mettre en favoris" className="w-11 h-11 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors" type="button">
                    <span className="material-symbols-outlined text-[20px]">bookmark</span>
                  </button>
                </div>
              </article>
            ))}
          </section>

          {/* How it works */}
          <section className="px-space-md pt-space-xl pb-space-md flex flex-col gap-space-md">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Processus d&apos;allocation</span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Comment fonctionne Nexora</h2>
            </div>
            <div className="flex flex-col gap-space-sm">
              {[
                { n: "01", t: "Explorez les projets", d: "Dossiers d'entreprises rigoureusement analysés et vérifiés par nos experts financiers indépendants." },
                { n: "02", t: "Allouez votre capital", d: "Choisissez librement votre montant et investissez directement dès 10 000 FCFA sans intermédiaire opaque." },
                { n: "03", t: "Percevez vos remboursements", d: "Suivez les échéances contractuelles de votre portefeuille et encaissez vos intérêts réguliers en toute clarté." },
              ].map((step) => (
                <div key={step.n} className="bg-surface-container-lowest p-space-md rounded-xl flex items-start gap-space-md shadow-sm hover-lift animate-fade-in-up animate-fade-in-up-delay-1">
                  <div className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0 font-data-mono font-bold text-body-md">{step.n}</div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-headline-sm text-body-lg font-bold text-on-surface">{step.t}</span>
                    <p className="font-body-md text-body-md text-secondary leading-normal">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Entreprise */}
          <section className="px-space-md pb-space-lg">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[22px]">domain_add</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-snug">Vous cherchez des capitaux pour votre entreprise ?</h3>
                <p className="font-body-md text-body-md text-secondary leading-normal">Présentez votre projet à notre comité d&apos;analyse financière et accédez à des financements non dilutifs.</p>
              </div>
              <Link href="/entreprise" className="w-full h-11 bg-surface-container-lowest text-on-surface rounded-lg flex items-center justify-between px-space-md font-label-sm text-label-sm font-semibold hover:bg-surface-container-low transition-colors shadow-sm ring-1 ring-on-surface/10">
                <span>Soumettre un dossier</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="offres" />
    </>
  );
}
