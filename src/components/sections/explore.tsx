"use client";
import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { COUNTRIES, SECTORS, getCountryLabel, getSectorLabel } from "@/lib/countries";
import type { OfferDTO } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const COPY = {
  fr: {
    kicker: "Marché privé",
    title: "Explorer les offres",
    loading: "Chargement des offres…",
    count: (value: number) => `${value} offre${value > 1 ? "s" : ""} disponible${value > 1 ? "s" : ""}`,
    filters: "Filtres",
    sector: "Secteur",
    country: "Pays",
    instrument: "Instrument",
    allSectors: "Tous les secteurs",
    allCountries: "Tous les pays",
    allInstruments: "Tous les instruments",
    debt: "Dette",
    equity: "Capital",
    empty: "Aucune offre ne correspond à vos filtres",
    emptyText: "Essayez d’élargir votre recherche.",
    reset: "Réinitialiser les filtres",
  },
  en: {
    kicker: "Private market",
    title: "Explore opportunities",
    loading: "Loading opportunities…",
    count: (value: number) => `${value} opportunit${value === 1 ? "y" : "ies"} available`,
    filters: "Filters",
    sector: "Sector",
    country: "Country",
    instrument: "Instrument",
    allSectors: "All sectors",
    allCountries: "All countries",
    allInstruments: "All instruments",
    debt: "Debt",
    equity: "Equity",
    empty: "No opportunity matches your filters",
    emptyText: "Try broadening your search.",
    reset: "Reset filters",
  },
};

const INSTRUMENTS = [
  { code: "debt", name: "Dette" },
  { code: "equity", name: "Capital" },
];

export function Explore() {
  const locale = useAppStore((state) => state.locale);
  const initialSector = useAppStore((state) => state.exploreSector);
  const [sector, setSector] = useState(initialSector ?? "all");
  const [country, setCountry] = useState("all");
  const [instrument, setInstrument] = useState("all");

  const qs = new URLSearchParams({
    sector,
    country,
    instrument,
  }).toString();
  const { data, loading } = useFetch<{ offers: OfferDTO[] }>(
    `/api/offers?${qs}`
  );

  const offers = data?.offers ?? [];
  const copy = COPY[locale];

  return (
    <div className="page-shell reveal-in">
      {/* Header */}
      <div className="mb-6">
        <p className="page-kicker">{copy.kicker}</p>
        <h1 className="page-title mt-1">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? copy.loading
            : copy.count(offers.length)}
        </p>
      </div>

      {/* Filters */}
      <div className="surface-card mb-6 rounded-2xl border border-border bg-white/75 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {copy.filters}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {copy.sector}
            </label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={copy.allSectors} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allSectors}</SelectItem>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getSectorLabel(s, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {copy.country}
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={copy.allCountries} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allCountries}</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {getCountryLabel(c.code, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {copy.instrument}
            </label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={copy.allInstruments} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allInstruments}</SelectItem>
                {INSTRUMENTS.map((i) => (
                  <SelectItem key={i.code} value={i.code}>
                    {i.code === "debt" ? copy.debt : copy.equity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="surface-card rounded-2xl border border-dashed border-border bg-white/65 px-5 py-10 text-center sm:p-12">
          <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {copy.empty}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.emptyText}
          </p>
          {(sector !== "all" || country !== "all" || instrument !== "all") ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSector("all");
                setCountry("all");
                setInstrument("all");
              }}
              className="mt-4 rounded-full text-xs"
            >
              {copy.reset}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
