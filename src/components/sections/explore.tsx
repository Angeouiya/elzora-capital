"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDown, SearchX, SlidersHorizontal } from "lucide-react";
import { COUNTRIES, SECTORS, getCountryLabel, getSectorLabel } from "@/lib/countries";
import type { OfferDTO } from "@/lib/types";
import { useAppStore } from "@/lib/store";

const COPY = {
  fr: { kicker: "Marché privé", title: "Choisissez avec clarté.", intro: "Filtrez la sélection, comparez les conditions et ouvrez chaque dossier pour comprendre son activité, son financement et ses risques.", loading: "Chargement de la sélection…", count: (n: number) => `${n} opportunité${n > 1 ? "s" : ""}`, filters: "Affiner la sélection", sector: "Secteur", country: "Pays", instrument: "Instrument", allSectors: "Tous les secteurs", allCountries: "Tous les pays", allInstruments: "Tous les instruments", debt: "Dette", equity: "Capital", empty: "Aucune offre dans cette sélection", emptyText: "Modifiez un ou plusieurs filtres pour élargir votre recherche.", reset: "Tout réinitialiser", results: "Résultats" },
  en: { kicker: "Private market", title: "Choose with clarity.", intro: "Filter the selection, compare terms and open each opportunity to understand its activity, financing and risks.", loading: "Loading the selection…", count: (n: number) => `${n} opportunit${n === 1 ? "y" : "ies"}`, filters: "Refine the selection", sector: "Sector", country: "Country", instrument: "Instrument", allSectors: "All sectors", allCountries: "All countries", allInstruments: "All instruments", debt: "Debt", equity: "Equity", empty: "No opportunity in this selection", emptyText: "Change one or more filters to broaden your search.", reset: "Reset everything", results: "Results" },
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
  const filtered = sector !== "all" || country !== "all" || instrument !== "all";
  const reset = () => { setSector("all"); setCountry("all"); setInstrument("all"); };

  return (
    <div className="page-shell reveal-in">
      <section className="grid overflow-hidden rounded-[1.75rem] bg-[#1b0617] text-white lg:grid-cols-[.82fr_1.18fr]">
        <div className="p-6 sm:p-9 lg:p-11">
          <p className="editorial-kicker">{copy.kicker}</p>
          <h1 className="mt-5 text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/65">{copy.intro}</p>
          <div className="mt-8 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15"><ArrowDown className="h-4 w-4 text-[#d79c9f]" /></span><p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">{loading ? copy.loading : copy.count(offers.length)}</p></div>
        </div>

        <div className="border-t border-white/10 bg-white/[.055] p-5 backdrop-blur lg:border-l lg:border-t-0 sm:p-7 lg:p-9">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#e7bfcf]"><SlidersHorizontal className="h-4 w-4" />{copy.filters}</div>
          <div className="mt-5 grid gap-4">
            <Filter label={copy.sector}><Select value={sector} onValueChange={setSector}><SelectTrigger className="border-white/15 bg-white/95"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allSectors}</SelectItem>{SECTORS.map((item) => <SelectItem key={item} value={item}>{getSectorLabel(item, locale)}</SelectItem>)}</SelectContent></Select></Filter>
            <div className="grid gap-4 sm:grid-cols-2">
              <Filter label={copy.country}><Select value={country} onValueChange={setCountry}><SelectTrigger className="border-white/15 bg-white/95"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allCountries}</SelectItem>{COUNTRIES.map((item) => <SelectItem key={item.code} value={item.code}>{getCountryLabel(item.code, locale)}</SelectItem>)}</SelectContent></Select></Filter>
              <Filter label={copy.instrument}><Select value={instrument} onValueChange={setInstrument}><SelectTrigger className="border-white/15 bg-white/95"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy.allInstruments}</SelectItem><SelectItem value="debt">{copy.debt}</SelectItem><SelectItem value="equity">{copy.equity}</SelectItem></SelectContent></Select></Filter>
            </div>
          </div>
          {filtered ? <Button variant="ghost" onClick={reset} className="mt-4 px-0 text-xs text-white/65 hover:bg-transparent hover:text-white">{copy.reset}</Button> : null}
        </div>
      </section>

      <section className="pt-8 sm:pt-10">
        <div className="mb-5 flex items-center justify-between"><div><p className="page-kicker">{copy.results}</p><p className="mt-1 text-sm text-muted-foreground">{loading ? copy.loading : copy.count(offers.length)}</p></div>{filtered ? <Button variant="outline" size="sm" onClick={reset} className="hidden sm:inline-flex">{copy.reset}</Button> : null}</div>
        {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[27rem] rounded-[1.35rem]" />)}</div>
          : offers.length === 0 ? <div className="public-panel py-12 text-center"><SearchX className="mx-auto h-8 w-8 text-[#7b286d]" /><h2 className="mt-3 text-base font-extrabold">{copy.empty}</h2><p className="mt-1 text-sm text-muted-foreground">{copy.emptyText}</p><Button variant="outline" onClick={reset} className="mt-5">{copy.reset}</Button></div>
          : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} eager={index === 0} />)}</div>}
      </section>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.15em] text-white/52">{label}</span>{children}</label>;
}
