"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  ArrowUpRight,
  Building2,
  ArrowRight,
  TrendingUp,
  Wallet,
  CalendarDays,
} from "lucide-react";

interface OfferItem {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  minTicket: number;
  maxTicket: number;
  targetAmount: number;
  collectedAmount: number;
  investorCount: number;
  status: string;
  endDate: string | null;
  project: {
    title: string;
    description: string;
    sector: string;
    city: string | null;
    company: { name: string };
  };
}

const FCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const rate = (bps: number) => (bps / 100).toFixed(1).replace(".", ",") + " %";

export default function OffresPage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState("Tous");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  const sectors = ["Tous", ...Array.from(new Set(offers.map((o) => o.project.sector)))];

  const filtered = offers.filter((o) => {
    const matchSector = activeSector === "Tous" || o.project.sector === activeSector;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      o.project.company.name.toLowerCase().includes(q) ||
      o.project.title.toLowerCase().includes(q) ||
      o.project.description.toLowerCase().includes(q);
    return matchSector && matchSearch;
  });

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-4 sm:px-space-md max-w-6xl mx-auto flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-space-sm">
            <NexoraLogo size={32} />
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">NEXORA CAPITAL</span>
              <span className="font-headline-sm text-headline-sm font-semibold leading-tight text-on-surface">Offres</span>
            </div>
          </Link>
          <div className="flex items-center gap-space-xs">
            <Link href="/connexion" className="hidden sm:flex min-h-[44px] px-space-sm items-center justify-center font-label-sm text-label-sm text-on-surface font-medium hover:text-primary transition-colors">Connexion</Link>
            <Link href="/inscription" className="min-h-[44px] px-3 sm:px-space-md py-space-xs rounded-full bg-primary-container text-on-background font-label-sm text-label-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"><span className="sm:hidden">Créer</span><span className="hidden sm:inline">Créer un compte</span></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full">
          <section className="px-space-md pt-space-md pb-space-sm flex flex-col gap-space-xs animate-fade-in-up">
            <div className="flex items-center gap-space-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Marché primaire</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight leading-tight">Investissez dans des entreprises.</h1>
            <p className="font-body-md text-body-md text-secondary leading-normal">Financement direct de projets d&apos;entreprises rigoureusement analysés en Afrique de l&apos;Ouest.</p>
          </section>

          <section className="px-space-md pb-space-md flex flex-col gap-space-sm sticky top-16 z-40 bg-surface/95 backdrop-blur-md pt-space-xs animate-fade-in-up animate-fade-in-up-delay-1">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-space-sm text-secondary w-[20px] h-[20px] pointer-events-none" strokeWidth={1.5} />
              <input
                className="w-full h-12 md:h-11 pl-10 pr-space-md bg-surface-container-lowest text-on-surface font-body-md text-base md:text-body-md rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container/60 transition-all placeholder:text-secondary"
                placeholder="Rechercher une entreprise, un secteur..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-space-xs overflow-x-auto py-0.5 -mx-space-md px-space-md" style={{ scrollbarWidth: "none" }}>
              <button className="shrink-0 flex items-center justify-center h-11 w-11 md:h-8 md:w-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors" type="button" aria-label="Filtres">
                <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSector(s)}
                  className={`shrink-0 px-space-md h-11 md:h-8 rounded-full font-label-sm text-label-sm transition-colors ${activeSector === s ? "bg-on-surface text-surface-container-lowest font-semibold" : "bg-surface-container-lowest text-secondary font-medium hover:text-on-surface"}`}
                  type="button"
                >{s}</button>
              ))}
            </div>
          </section>

          <section className="px-space-md max-w-6xl mx-auto w-full flex flex-col md:grid md:grid-cols-2 xl:grid-cols-3 gap-space-md animate-fade-in-up animate-fade-in-up-delay-2">
            {loading ? (
              <div className="py-space-xl flex flex-col items-center gap-space-sm">
                <div className="w-8 h-8 border-2 border-secondary/30 border-t-primary rounded-full animate-spin" />
                <p className="font-body-md text-body-md text-secondary">Chargement des offres…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-space-xl flex flex-col items-center gap-space-sm">
                <p className="font-body-md text-body-md text-secondary">Aucune offre ne correspond à votre recherche.</p>
              </div>
            ) : (
              filtered.map((o) => {
                const percent = o.targetAmount > 0 ? Math.min(100, Math.round((o.collectedAmount / o.targetAmount) * 100)) : 0;
                return (
                  <article key={o.id} className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm hover-lift card-hover-glow">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{o.project.company.name}</h2>
                        <span className="font-label-caps text-label-caps text-secondary uppercase">{o.project.sector}{o.project.city ? ` • ${o.project.city}` : ""}</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">{o.project.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-space-xs py-2 bg-surface-container-low rounded-lg p-2.5">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps uppercase text-secondary">Rémunération contractuelle</span>
                        <span className="font-data-mono text-body-lg font-semibold text-on-surface">{rate(o.rate)} <span className="font-body-sm text-body-sm font-normal text-secondary">/ {o.ratePeriod === "TOTAL" ? `${o.duration} mois (total)` : "par an"}</span></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps uppercase text-secondary">Investissement minimum</span>
                        <span className="font-data-mono text-body-lg font-semibold text-on-surface">{new Intl.NumberFormat("fr-FR").format(o.minTicket)} <span className="font-body-sm text-body-sm font-normal text-secondary">FCFA</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="text-secondary font-medium">Collecté : <strong className="font-data-mono font-semibold text-on-surface">{new Intl.NumberFormat("fr-FR").format(o.collectedAmount)}</strong> / {new Intl.NumberFormat("fr-FR").format(o.targetAmount)} FCFA</span>
                        <span className="font-data-mono font-bold text-on-surface">{percent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#101010]/8 ring-1 ring-inset ring-[#101010]/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#9BD900] to-[#B6FF00] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-700 ease-out animate-progress-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                      <div className="flex items-center gap-space-xs text-secondary">
                        <Wallet className="w-[14px] h-[14px]" strokeWidth={1.5} />
                        <span className="font-label-sm text-label-sm">{o.investorCount} investisseur(s)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs pt-1">
                      <Link href={`/offres/${o.id}`} className="flex-1 h-11 bg-[#B6FF00] text-[#101010] rounded-xl flex items-center justify-center gap-1.5 font-label-sm text-label-sm font-semibold shadow-[0_2px_12px_rgba(182,255,0,0.35)] hover:shadow-[0_4px_20px_rgba(182,255,0,0.45)] hover:brightness-105 active:brightness-95 transition-all">
                        <span>Voir l&apos;offre</span>
                        <ArrowUpRight className="w-[16px] h-[16px]" strokeWidth={2} />
                      </Link>
                      <button aria-label="Enregistrer l'offre" className="w-11 h-11 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors" type="button">
                        <Bookmark className="w-[20px] h-[20px]" strokeWidth={1.5} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="px-space-md pt-space-xl pb-space-md flex flex-col gap-space-md">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Processus</span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Comment fonctionne Nexora</h2>
            </div>
            <div className="flex flex-col gap-space-sm">
              {[
                { n: "01", t: "Explorez les projets", d: "Dossiers d'entreprises rigoureusement analysés et vérifiés par notre équipe d'analyse." },
                { n: "02", t: "Allouez votre capital", d: "Choisissez librement votre montant et investissez directement dès 10 000 FCFA." },
                { n: "03", t: "Percevez vos remboursements", d: "Suivez les échéances contractuelles de votre portefeuille et encaissez vos intérêts en toute clarté." },
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

          <section className="px-space-md pb-space-lg">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                <Building2 className="w-[22px] h-[22px]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-snug">Vous cherchez des capitaux pour votre entreprise ?</h3>
                <p className="font-body-md text-body-md text-secondary leading-normal">Présentez votre projet à notre équipe d&apos;analyse et accédez à des financements adaptés.</p>
              </div>
              <Link href="/entreprise" className="w-full h-11 bg-surface-container-lowest text-on-surface rounded-lg flex items-center justify-between px-space-md font-label-sm text-label-sm font-semibold hover:bg-surface-container-low transition-colors shadow-sm ring-1 ring-on-surface/10">
                <span>Soumettre un dossier</span>
                <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
