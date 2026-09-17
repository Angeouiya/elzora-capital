"use client";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTORS } from "@/lib/countries";
import { Search, Building2, FileText, ArrowRight, LayoutGrid } from "lucide-react";
import type { OfferDTO } from "@/lib/types";

const STEPS = [
  {
    icon: Building2,
    title: "Dépôt",
    desc: "L&rsquo;entreprise soumet un dossier analysé par l&rsquo;équipe NEXORA.",
  },
  {
    icon: FileText,
    title: "Analyse",
    desc: "Cabinet indépendant, structuration financière, publication de l&rsquo;offre.",
  },
  {
    icon: LayoutGrid,
    title: "Financement",
    desc: "Les investisseurs souscrivent ; les fonds sont décaissés à l&rsquo;entreprise.",
  },
];

export function Home() {
  const setView = useAppStore((s) => s.setView);
  const { data, loading } = useFetch<{ offers: OfferDTO[] }>("/api/offers");

  const offers = data?.offers ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Compact hero */}
      <section className="rounded-xl border border-border bg-secondary/40 p-6 sm:p-10">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-positive">
            Afrique de l&rsquo;Ouest · UEMOA · XOF
          </p>
          <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
            Investir dans les champions de l&rsquo;Afrique de l&rsquo;Ouest
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Financement participatif en dette et en capital pour les
            entreprises vérifiées de la région UEMOA. À partir de 10 000 FCFA.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => setView("explore")}
              className="btn-nexora"
              size="lg"
            >
              <Search className="h-4 w-4" />
              Explorer les offres
            </Button>
            <Button
              onClick={() => setView("register")}
              variant="outline"
              size="lg"
            >
              <Building2 className="h-4 w-4" />
              Financer mon entreprise
            </Button>
          </div>
        </div>
      </section>

      {/* Offres en cours */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Offres en cours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Chargement…"
                : `${offers.length} offre${offers.length > 1 ? "s" : ""} ouverte${offers.length > 1 ? "s" : ""} aux souscriptions`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("explore")}
            className="text-foreground"
          >
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune offre ouverte pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 6).map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </section>

      {/* Comment ça marche */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Comment ça marche
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-nexora-pale text-positive">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Étape {i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                {step.title}
              </h3>
              <p
                className="mt-1 text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: step.desc }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 text-right">
          <Button
            variant="link"
            size="sm"
            onClick={() => setView("how")}
            className="px-0 text-foreground"
          >
            En savoir plus
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Secteurs */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-foreground">Secteurs</h2>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setView("explore")}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
