"use client";

import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTORS, getSectorLabel } from "@/lib/countries";
import { ArrowRight, BadgeCheck, CircleCheck, Compass, FileSearch, Handshake, Network, Send, ShieldCheck, Smartphone } from "lucide-react";
import type { OfferDTO } from "@/lib/types";

const COPY = {
  fr: {
    kicker: "Capital privé · Afrique de l’Ouest",
    title: "Investir dans ce qui transforme la région.",
    intro: "Une expérience claire pour découvrir des entreprises sélectionnées, comprendre chaque dossier et engager son capital avec discernement.",
    opportunities: "Découvrir les opportunités", raise: "Présenter mon projet",
    proof: [["Sélection", "Dossiers analysés"], ["Territoire", "8 pays UEMOA"], ["Règlement", "Carte & Mobile Money"], ["Clarté", "Risques présentés"]],
    signature: "Notre conviction", signatureTitle: "Le capital mérite mieux qu’une simple liste d’offres.", signatureText: "NEXORA organise l’information, met les risques au premier plan et rend chaque décision plus lisible. Nous privilégions la clarté à toute promesse irréaliste.", signaturePoints: [["Dossiers structurés", "L’essentiel au même endroit"], ["Risques visibles", "Aucun point important masqué"], ["Décision éclairée", "Vous gardez la main"]],
    market: "Sélection actuelle", open: "Opportunités ouvertes", loading: "Chargement…",
    offerCount: (count: number) => `${count} offre${count > 1 ? "s" : ""} ouverte${count > 1 ? "s" : ""} aux souscriptions`, all: "Explorer tout le marché",
    next: "La prochaine sélection est en préparation", nextText: "Chaque dossier passe par une analyse avant publication. Créez votre compte pour suivre les prochaines ouvertures.", notify: "Créer mon accès",
    journey: "La méthode NEXORA", journeyTitle: "Simple à parcourir. Sérieux dans le fond.", step: "0", more: "Comprendre tout le parcours", economy: "Économie réelle", sectors: "Des secteurs qui façonnent le quotidien",
    steps: [["Candidature", "L’entreprise transmet ses informations financières, juridiques et opérationnelles."], ["Lecture approfondie", "Le dossier est analysé, structuré et documenté avant toute publication."], ["Mise en relation", "Les investisseurs décident, souscrivent puis suivent leur engagement dans la durée."]],
  },
  en: {
    kicker: "Private capital · West Africa", title: "Invest in what is transforming the region.", intro: "A clear experience to discover selected businesses, understand each opportunity and commit capital with discernment.",
    opportunities: "Discover opportunities", raise: "Present my project",
    proof: [["Selection", "Reviewed applications"], ["Coverage", "8 WAEMU countries"], ["Settlement", "Card & Mobile Money"], ["Clarity", "Risks presented"]],
    signature: "Our conviction", signatureTitle: "Capital deserves more than a simple list of deals.", signatureText: "NEXORA organizes information, puts risk in full view and makes each decision clearer. We favor clarity over unrealistic promises.", signaturePoints: [["Structured files", "The essentials in one place"], ["Visible risks", "No important point hidden"], ["Informed decision", "You stay in control"]],
    market: "Current selection", open: "Open opportunities", loading: "Loading…", offerCount: (count: number) => `${count} opportunit${count === 1 ? "y" : "ies"} open for investment`, all: "Explore the full market",
    next: "The next selection is being prepared", nextText: "Every application is reviewed before publication. Create your account to follow upcoming openings.", notify: "Create my access",
    journey: "The NEXORA method", journeyTitle: "Simple to navigate. Serious underneath.", step: "0", more: "Understand the full journey", economy: "Real economy", sectors: "Sectors shaping everyday life",
    steps: [["Application", "The company shares its financial, legal and operational information."], ["Deep review", "The application is reviewed, structured and documented before publication."], ["Connection", "Investors decide, subscribe and follow their commitment over time."]],
  },
} as const;

const STEP_ICONS = [Send, FileSearch, Network];
const PROOF_ICONS = [BadgeCheck, Compass, Smartphone, ShieldCheck];
const SIGNATURE_ICONS = [FileSearch, ShieldCheck, CircleCheck];

export function Home() {
  const setView = useAppStore((s) => s.setView);
  const openExploreSector = useAppStore((s) => s.openExploreSector);
  const locale = useAppStore((s) => s.locale);
  const { data, loading } = useFetch<{ offers: OfferDTO[] }>("/api/offers");
  const offers = data?.offers ?? [];
  const copy = COPY[locale];
  const proofItems: ReadonlyArray<readonly [string, string]> = copy.proof;
  const signaturePoints: ReadonlyArray<readonly [string, string]> = copy.signaturePoints;
  const journeySteps: ReadonlyArray<readonly [string, string]> = copy.steps;

  return (
    <div className="reveal-in overflow-x-clip">
      <section className="public-hero home-hero-gradient home-hero-fullbleed text-white">
        <div className="home-hero-light" aria-hidden="true" />
        <div className="home-hero-inner">
          <div className="home-hero-copy max-w-[48rem] pt-3 sm:pt-8 lg:pt-10">
            <p className="editorial-kicker">{copy.kicker}</p>
            <h1 className="display-title mt-6 max-w-[47rem]">{copy.title}</h1>
            <p className="mt-6 max-w-[38rem] text-sm leading-6 text-white/72 sm:text-base sm:leading-7">{copy.intro}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setView("explore")} className="btn-nexora h-12 w-full px-5 sm:w-auto">{copy.opportunities}<ArrowRight className="h-4 w-4" /></Button>
              <Button onClick={() => setView("register")} variant="outline" className="h-12 w-full border-white/20 bg-white/7 px-5 text-white hover:bg-white/13 hover:text-white sm:w-auto"><Handshake className="h-4 w-4" />{copy.raise}</Button>
            </div>
          </div>
          <div className="home-proof-grid">
            {proofItems.map(([label, value], index) => { const Icon = PROOF_ICONS[index]; return (
              <div key={label} className="home-proof-item"><span className="home-proof-icon"><Icon className="h-[1.1rem] w-[1.1rem]" /></span><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/48 sm:text-[10px]">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-white sm:text-sm">{value}</p></div></div>
            ); })}
          </div>
        </div>
      </section>

      <div className="page-shell home-content-shell">
      <section className="home-section-reveal relative my-7 overflow-hidden rounded-[1.75rem] border border-[#541249]/10 bg-[linear-gradient(125deg,#fff_0%,#fbf7fa_58%,#f1e3ee_100%)] p-5 shadow-[0_18px_50px_rgba(56,12,49,.07)] sm:my-9 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#7b286d]/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[.38fr_1.62fr] lg:items-start lg:gap-10">
          <div className="flex items-center gap-3 lg:block">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[.9rem] bg-[#541249] text-white shadow-[0_9px_22px_rgba(56,12,49,.2)]">
              <BadgeCheck className="h-[1.1rem] w-[1.1rem]" />
            </span>
            <div>
              <p className="page-kicker lg:mt-4">{copy.signature}</p>
              <div className="mt-2 h-px w-16 bg-gradient-to-r from-[#541249]/55 to-transparent lg:mt-4" />
            </div>
          </div>
          <div>
            <h2 className="max-w-3xl text-2xl font-black leading-[1.14] tracking-[-.04em] text-foreground sm:text-[2rem]">{copy.signatureTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[.9375rem] sm:leading-7">{copy.signatureText}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {signaturePoints.map(([title, description], index) => {
                const Icon = SIGNATURE_ICONS[index];
                return (
                  <div key={title} className="flex items-center gap-3 rounded-[1.05rem] border border-white/80 bg-white/72 px-3.5 py-3 shadow-[0_6px_18px_rgba(56,12,49,.045)] backdrop-blur-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[.7rem] bg-[#f3e7f1] text-[#6c195e]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-extrabold tracking-[-.01em] text-foreground">{title}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{description}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section-reveal border-t border-[#541249]/10 pt-8 sm:pt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="page-kicker">{copy.market}</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.open}</h2><p className="mt-1.5 text-sm text-muted-foreground">{loading ? copy.loading : copy.offerCount(offers.length)}</p></div>
          <Button variant="ghost" onClick={() => setView("explore")} className="hidden text-[#541249] sm:inline-flex">{copy.all}<ArrowRight className="h-4 w-4" /></Button>
        </div>
        {loading ? <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl sm:h-[25rem]" />)}</div>
          : offers.length === 0 ? <div className="public-panel px-5 py-9 text-center sm:py-11"><CircleCheck className="mx-auto h-8 w-8 text-[#541249]" /><p className="mt-3 text-sm font-bold">{copy.next}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{copy.nextText}</p><Button variant="outline" className="mt-4" onClick={() => setView("register")}>{copy.notify}<ArrowRight className="h-4 w-4" /></Button></div>
          : <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))]">{offers.slice(0, 4).map((offer, index) => <OfferCard key={offer.id} offer={offer} eager={index === 0} compactOnMobile />)}</div>}
        <Button variant="outline" onClick={() => setView("explore")} className="mt-5 w-full sm:hidden">{copy.all}<ArrowRight className="h-4 w-4" /></Button>
      </section>

      <section className="home-section-reveal mt-9 overflow-hidden rounded-[1.75rem] bg-[#f1e9ef] p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[.65fr_1.35fr]">
          <div><p className="page-kicker">{copy.journey}</p><h2 className="mt-3 text-2xl font-black tracking-[-.04em] sm:text-4xl">{copy.journeyTitle}</h2><Button variant="link" onClick={() => setView("how")} className="mt-4 h-auto p-0 text-[#541249]">{copy.more}<ArrowRight className="h-4 w-4" /></Button></div>
          <div className="grid gap-3">{journeySteps.map(([title, description], index) => { const Icon = STEP_ICONS[index]; return (
            <article key={title} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 sm:grid-cols-[auto_10rem_1fr] sm:items-center"><span className="index-mark">{copy.step}{index + 1}</span><h3 className="text-sm font-extrabold"><Icon className="mr-2 inline h-4 w-4 text-[#7b286d]" />{title}</h3><p className="col-start-2 text-sm leading-6 text-muted-foreground sm:col-start-3">{description}</p></article>
          ); })}</div>
        </div>
      </section>

      <section className="home-section-reveal py-9 sm:py-10">
        <p className="page-kicker">{copy.economy}</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.sectors}</h2>
        <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 scroll-area-fancy sm:flex-wrap sm:overflow-visible">{SECTORS.map((sector) => <Button key={sector} variant="outline" onClick={() => openExploreSector(sector)} className="shrink-0 rounded-full border-[#541249]/14 bg-white/75 hover:border-[#541249]/30 hover:bg-[#f7eaf5]">{getSectorLabel(sector, locale)}</Button>)}</div>
      </section>
      </div>
    </div>
  );
}
