"use client";

import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTORS, getSectorLabel } from "@/lib/countries";
import { ArrowRight, BadgeCheck, CircleCheck, Compass, FileSearch, Handshake, Network, Send, Smartphone } from "lucide-react";
import type { OfferDTO } from "@/lib/types";
import { formatDisplayMoney } from "@/lib/display-money";

const COPY = {
  fr: {
    kicker: "Capital privé · Afrique de l’Ouest",
    title: "Investir dans ce qui transforme la région.",
    intro: "Une expérience claire pour découvrir des entreprises sélectionnées, comprendre chaque dossier et engager son capital avec discernement.",
    from: "Accessible dès", opportunities: "Découvrir les opportunités", raise: "Présenter mon projet",
    proof: [["Sélection", "Dossiers analysés"], ["Territoire", "8 pays UEMOA"], ["Règlement", "Carte & Mobile Money"]],
    signature: "Notre conviction", signatureTitle: "Le capital mérite mieux qu’une simple liste d’offres.", signatureText: "NEXORA organise l’information, met les risques au premier plan et rend chaque décision plus lisible — sans promettre ce qui ne peut pas l’être.",
    market: "Sélection actuelle", open: "Opportunités ouvertes", loading: "Chargement…",
    offerCount: (count: number) => `${count} offre${count > 1 ? "s" : ""} ouverte${count > 1 ? "s" : ""} aux souscriptions`, all: "Explorer tout le marché",
    next: "La prochaine sélection est en préparation", nextText: "Chaque dossier passe par une analyse avant publication. Créez votre compte pour suivre les prochaines ouvertures.", notify: "Créer mon accès",
    journey: "La méthode NEXORA", journeyTitle: "Simple à parcourir. Sérieux dans le fond.", step: "0", more: "Comprendre tout le parcours", economy: "Économie réelle", sectors: "Des secteurs qui façonnent le quotidien",
    steps: [["Candidature", "L’entreprise transmet ses informations financières, juridiques et opérationnelles."], ["Lecture approfondie", "Le dossier est analysé, structuré et documenté avant toute publication."], ["Mise en relation", "Les investisseurs décident, souscrivent puis suivent leur engagement dans la durée."]],
  },
  en: {
    kicker: "Private capital · West Africa", title: "Invest in what is transforming the region.", intro: "A clear experience to discover selected businesses, understand each opportunity and commit capital with discernment.",
    from: "Accessible from", opportunities: "Discover opportunities", raise: "Present my project",
    proof: [["Selection", "Reviewed applications"], ["Coverage", "8 WAEMU countries"], ["Settlement", "Card & Mobile Money"]],
    signature: "Our conviction", signatureTitle: "Capital deserves more than a simple list of deals.", signatureText: "NEXORA organizes information, puts risk in full view and makes each decision clearer — without promising what cannot be guaranteed.",
    market: "Current selection", open: "Open opportunities", loading: "Loading…", offerCount: (count: number) => `${count} opportunit${count === 1 ? "y" : "ies"} open for investment`, all: "Explore the full market",
    next: "The next selection is being prepared", nextText: "Every application is reviewed before publication. Create your account to follow upcoming openings.", notify: "Create my access",
    journey: "The NEXORA method", journeyTitle: "Simple to navigate. Serious underneath.", step: "0", more: "Understand the full journey", economy: "Real economy", sectors: "Sectors shaping everyday life",
    steps: [["Application", "The company shares its financial, legal and operational information."], ["Deep review", "The application is reviewed, structured and documented before publication."], ["Connection", "Investors decide, subscribe and follow their commitment over time."]],
  },
} as const;

const STEP_ICONS = [Send, FileSearch, Network];
const PROOF_ICONS = [BadgeCheck, Compass, Smartphone];

export function Home() {
  const setView = useAppStore((s) => s.setView);
  const openExploreSector = useAppStore((s) => s.openExploreSector);
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const { data, loading } = useFetch<{ offers: OfferDTO[] }>("/api/offers");
  const offers = data?.offers ?? [];
  const copy = COPY[locale];
  const proofItems: ReadonlyArray<readonly [string, string]> = copy.proof;
  const journeySteps: ReadonlyArray<readonly [string, string]> = copy.steps;

  return (
    <div className="page-shell reveal-in">
      <section className="public-hero home-hero-gradient min-h-[33rem] text-white sm:min-h-[40rem] lg:min-h-[43rem]">
        <div className="relative flex min-h-[33rem] flex-col justify-between p-5 sm:min-h-[40rem] sm:p-9 lg:min-h-[43rem] lg:p-12">
          <div className="max-w-[48rem] pt-3 sm:pt-8 lg:pt-10">
            <p className="editorial-kicker">{copy.kicker}</p>
            <h1 className="display-title mt-6 max-w-[47rem]">{copy.title}</h1>
            <p className="mt-6 max-w-[38rem] text-sm leading-6 text-white/72 sm:text-base sm:leading-7">{copy.intro}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[.14em] text-[#e8bdbe]">{copy.from} {formatDisplayMoney(10_000, displayCurrency, locale)}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setView("explore")} className="btn-nexora h-12 w-full px-5 sm:w-auto">{copy.opportunities}<ArrowRight className="h-4 w-4" /></Button>
              <Button onClick={() => setView("register")} variant="outline" className="h-12 w-full border-white/20 bg-white/7 px-5 text-white hover:bg-white/13 hover:text-white sm:w-auto"><Handshake className="h-4 w-4" />{copy.raise}</Button>
            </div>
          </div>
          <div className="-mx-1 mt-8 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-px sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/10 sm:bg-white/10 sm:px-0 sm:pb-0">
            {proofItems.map(([label, value], index) => { const Icon = PROOF_ICONS[index]; return (
              <div key={label} className="flex min-w-[10.75rem] snap-start items-center gap-3 rounded-2xl border border-white/10 bg-[#160513]/72 px-4 py-3.5 backdrop-blur-xl sm:min-w-0 sm:rounded-none sm:border-0 sm:px-5 sm:py-4"><Icon className="h-5 w-5 shrink-0 text-[#d79c9f]" /><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/48">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div></div>
            ); })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
        <div><p className="page-kicker">{copy.signature}</p><div className="copper-line mt-4 max-w-32" /></div>
        <div><h2 className="max-w-3xl text-2xl font-black leading-tight tracking-[-.04em] text-foreground sm:text-4xl">{copy.signatureTitle}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{copy.signatureText}</p></div>
      </section>

      <section className="border-t border-[#541249]/10 pt-8 sm:pt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="page-kicker">{copy.market}</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.open}</h2><p className="mt-1.5 text-sm text-muted-foreground">{loading ? copy.loading : copy.offerCount(offers.length)}</p></div>
          <Button variant="ghost" onClick={() => setView("explore")} className="hidden text-[#541249] sm:inline-flex">{copy.all}<ArrowRight className="h-4 w-4" /></Button>
        </div>
        {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[25rem] rounded-2xl" />)}</div>
          : offers.length === 0 ? <div className="public-panel px-5 py-9 text-center sm:py-11"><CircleCheck className="mx-auto h-8 w-8 text-[#541249]" /><p className="mt-3 text-sm font-bold">{copy.next}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{copy.nextText}</p><Button variant="outline" className="mt-4" onClick={() => setView("register")}>{copy.notify}<ArrowRight className="h-4 w-4" /></Button></div>
          : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{offers.slice(0, 6).map((offer, index) => <OfferCard key={offer.id} offer={offer} eager={index === 0} />)}</div>}
        <Button variant="outline" onClick={() => setView("explore")} className="mt-5 w-full sm:hidden">{copy.all}<ArrowRight className="h-4 w-4" /></Button>
      </section>

      <section className="mt-12 overflow-hidden rounded-[1.75rem] bg-[#f1e9ef] p-5 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="page-kicker">{copy.journey}</p><h2 className="mt-3 text-2xl font-black tracking-[-.04em] sm:text-4xl">{copy.journeyTitle}</h2><Button variant="link" onClick={() => setView("how")} className="mt-4 h-auto p-0 text-[#541249]">{copy.more}<ArrowRight className="h-4 w-4" /></Button></div>
          <div className="grid gap-3">{journeySteps.map(([title, description], index) => { const Icon = STEP_ICONS[index]; return (
            <article key={title} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 sm:grid-cols-[auto_10rem_1fr] sm:items-center"><span className="index-mark">{copy.step}{index + 1}</span><h3 className="text-sm font-extrabold"><Icon className="mr-2 inline h-4 w-4 text-[#7b286d]" />{title}</h3><p className="col-start-2 text-sm leading-6 text-muted-foreground sm:col-start-3">{description}</p></article>
          ); })}</div>
        </div>
      </section>

      <section className="py-11 sm:py-14">
        <p className="page-kicker">{copy.economy}</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.sectors}</h2>
        <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 scroll-area-fancy sm:flex-wrap sm:overflow-visible">{SECTORS.map((sector) => <Button key={sector} variant="outline" onClick={() => openExploreSector(sector)} className="shrink-0 rounded-full border-[#541249]/14 bg-white/75 hover:border-[#541249]/30 hover:bg-[#f7eaf5]">{getSectorLabel(sector, locale)}</Button>)}</div>
      </section>
    </div>
  );
}
