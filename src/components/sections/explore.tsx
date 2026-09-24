"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowDown, RotateCcw, SearchX, SlidersHorizontal } from "lucide-react";
import { COUNTRIES, SECTORS, getCountryLabel, getSectorLabel } from "@/lib/countries";
import type { OfferDTO } from "@/lib/types";
import { useAppStore } from "@/lib/store";

const COPY = {
  fr: { kicker: "Marché privé", title: "Investir, sans perdre le fil.", intro: "Une sélection lisible d’entreprises, avec les conditions, l’avancement et les risques à portée de main.", loading: "Chargement…", count: (n: number) => `${n} opportunité${n > 1 ? "s" : ""}`, filters: "Filtres", filterTitle: "Affiner la sélection", filterHint: "Choisissez vos préférences. Les résultats se mettent à jour immédiatement.", sector: "Secteur", country: "Pays", instrument: "Type de financement", allSectors: "Tous les secteurs", allCountries: "Tous les pays", allInstruments: "Tous les financements", debt: "Avec remboursement", equity: "Au capital", empty: "Aucune offre dans cette sélection", emptyText: "Modifiez un ou plusieurs filtres pour élargir votre recherche.", reset: "Réinitialiser", done: "Voir les résultats", results: "Opportunités", active: "actif" },
  en: { kicker: "Private market", title: "Invest without losing the thread.", intro: "A clear selection of companies, with terms, progress and risks always within reach.", loading: "Loading…", count: (n: number) => `${n} opportunit${n === 1 ? "y" : "ies"}`, filters: "Filters", filterTitle: "Refine the selection", filterHint: "Choose your preferences. Results update immediately.", sector: "Sector", country: "Country", instrument: "Funding type", allSectors: "All sectors", allCountries: "All countries", allInstruments: "All funding types", debt: "With repayment", equity: "Company ownership", empty: "No opportunity in this selection", emptyText: "Change one or more filters to broaden your search.", reset: "Reset", done: "View results", results: "Opportunities", active: "active" },
};

export function Explore() {
  const locale = useAppStore((s) => s.locale);
  const initialSector = useAppStore((s) => s.exploreSector);
  const [sector, setSector] = useState(initialSector ?? "all");
  const [country, setCountry] = useState("all");
  const [instrument, setInstrument] = useState("all");
  const qs = new URLSearchParams({ sector, country, instrument }).toString();
  const { data, loading } = useFetch<{ offers: OfferDTO[] }>(`/api/offers?${qs}`);
  const offers = data?.offers ?? [];
  const copy = COPY[locale];
  const activeCount = [sector, country, instrument].filter((value) => value !== "all").length;
  const filtered = activeCount > 0;
  const reset = () => { setSector("all"); setCountry("all"); setInstrument("all"); };

  const filters = (
    <div className="grid gap-3 md:grid-cols-3">
      <Filter label={copy.sector}><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allSectors}</SelectItem>{SECTORS.map((item) => <SelectItem key={item} value={item}>{getSectorLabel(item, locale)}</SelectItem>)}</SelectContent></Select></Filter>
      <Filter label={copy.country}><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allCountries}</SelectItem>{COUNTRIES.map((item) => <SelectItem key={item.code} value={item.code}>{getCountryLabel(item.code, locale)}</SelectItem>)}</SelectContent></Select></Filter>
      <Filter label={copy.instrument}><Select value={instrument} onValueChange={setInstrument}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allInstruments}</SelectItem><SelectItem value="debt">{copy.debt}</SelectItem><SelectItem value="equity">{copy.equity}</SelectItem></SelectContent></Select></Filter>
    </div>
  );

  return (
    <div className="reveal-in overflow-x-clip pb-28 lg:pb-10">
      <section className="public-hero public-page-hero text-white">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#a55b98]/15 blur-3xl" />
        <div className="public-page-hero-inner relative flex items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="editorial-kicker">{copy.kicker}</p>
            <h1 className="mt-3 text-[2rem] font-black leading-[.98] tracking-[-.05em] sm:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:mt-4 sm:leading-7">{copy.intro}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[.06]"><ArrowDown className="h-4 w-4 text-[#e7bfcf]" /></span>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-white/60">{loading ? copy.loading : copy.count(offers.length)}</p>
          </div>
        </div>
      </section>

      <div className="page-shell explore-page-body">

      <section className="sticky top-[4.05rem] z-30 -mx-1 mt-3 rounded-2xl border border-[#541249]/10 bg-[#fffefd]/94 p-2 shadow-[0_12px_34px_rgba(56,12,49,.08)] backdrop-blur-xl sm:static sm:mx-0 sm:mt-5 sm:p-4">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="min-w-0 px-2">
            <p className="truncate text-sm font-extrabold">{copy.results}</p>
            <p className="text-[11px] text-muted-foreground">{loading ? copy.loading : copy.count(offers.length)}</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative shrink-0 rounded-xl border-[#541249]/15 bg-white">
                <SlidersHorizontal className="h-4 w-4" />{copy.filters}
                {filtered ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#541249] px-1 text-[10px] font-bold text-white" aria-label={`${activeCount} ${copy.active}`}>{activeCount}</span> : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[86dvh] rounded-t-[1.75rem] border-[#541249]/10 bg-[#fffefd] px-5 pb-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
              <SheetHeader className="px-0 pb-2 text-left">
                <SheetTitle>{copy.filterTitle}</SheetTitle>
                <SheetDescription>{copy.filterHint}</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto py-2">{filters}</div>
              <SheetFooter className="grid grid-cols-[auto_1fr] px-0 pt-3">
                <Button type="button" variant="outline" onClick={reset} disabled={!filtered} aria-label={copy.reset}><RotateCcw className="h-4 w-4" /></Button>
                <SheetClose asChild><Button type="button" className="btn-nexora">{copy.done}</Button></SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:block">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#6c195e]"><SlidersHorizontal className="h-4 w-4" />{copy.filterTitle}</div>
            {filtered ? <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />{copy.reset}</Button> : null}
          </div>
          {filters}
        </div>
      </section>

      <section className="pt-5 sm:pt-7">
        <div className="mb-4 hidden items-end justify-between md:flex"><div><p className="page-kicker">{copy.results}</p><p className="mt-1 text-sm text-muted-foreground">{loading ? copy.loading : copy.count(offers.length)}</p></div></div>
        {loading ? <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[1.35rem] sm:h-[27rem]" />)}</div>
          : offers.length === 0 ? <div className="public-panel py-10 text-center"><SearchX className="mx-auto h-8 w-8 text-[#7b286d]" /><h2 className="mt-3 text-base font-extrabold">{copy.empty}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{copy.emptyText}</p><Button variant="outline" onClick={reset} className="mt-5">{copy.reset}</Button></div>
          : <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))]">{offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} eager={index === 0} compactOnMobile />)}</div>}
      </section>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</span>{children}</label>;
}
