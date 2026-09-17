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
import { SECTORS } from "@/lib/countries";
import type { OfferDTO } from "@/lib/types";

const COUNTRIES = [
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
];

const INSTRUMENTS = [
  { code: "debt", name: "Dette" },
  { code: "equity", name: "Capital" },
];

export function Explore() {
  const [sector, setSector] = useState("all");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Explorer les offres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Chargement des offres…"
            : `${offers.length} offre${offers.length > 1 ? "s" : ""} disponible${offers.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Secteur
            </label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les secteurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les secteurs</SelectItem>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Pays
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les pays</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Instrument
            </label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les instruments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les instruments</SelectItem>
                {INSTRUMENTS.map((i) => (
                  <SelectItem key={i.code} value={i.code}>
                    {i.name}
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
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Aucune offre ne correspond à vos filtres
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Essayez d&rsquo;élargir votre recherche.
          </p>
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
