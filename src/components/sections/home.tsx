"use client";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTORS } from "@/lib/countries";
import {
  Search,
  Building2,
  FileText,
  ArrowRight,
  LayoutGrid,
  ShieldCheck,
  Landmark,
  Smartphone,
  CircleCheck,
} from "lucide-react";
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
    <div className="page-shell reveal-in">
      <section className="relative overflow-hidden rounded-[1.4rem] border border-[#541249]/20 bg-[linear-gradient(135deg,#541249_0%,#380C31_45%,#130410_100%)] px-5 py-7 text-white shadow-[0_24px_70px_rgba(56,12,49,.24)] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#A55B98]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-1/2 bg-[linear-gradient(135deg,transparent,rgba(165,91,152,.12))]" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[1.45fr_.55fr]">
          <div className="max-w-3xl">
            <p className="page-kicker hero-kicker">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Investissement privé · Zone UEMOA
            </p>
            <h1 className="mt-4 max-w-3xl text-[2.15rem] font-black leading-[.98] tracking-[-.055em] sm:text-5xl lg:text-[3.65rem]">
              Le capital qui fait grandir l&rsquo;Afrique de l&rsquo;Ouest.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/68 sm:text-base sm:leading-7">
              Accédez à des entreprises sélectionnées, analysez chaque
              opportunité et investissez simplement en dette ou en capital.
              Dès 10&nbsp;000 FCFA.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => setView("explore")}
              className="btn-nexora w-full sm:w-auto"
              size="lg"
            >
              <Search className="h-4 w-4" />
              Voir les opportunités
            </Button>
            <Button
              onClick={() => setView("register")}
              variant="outline"
              size="lg"
              className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Building2 className="h-4 w-4" />
              Lever des fonds
            </Button>
          </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
            {[
              { icon: ShieldCheck, label: "Dossiers vérifiés", value: "Sélection rigoureuse" },
              { icon: Landmark, label: "Cadre régional", value: "8 pays UEMOA" },
              { icon: Smartphone, label: "Paiements", value: "Carte & Mobile Money" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[.055] p-3.5 backdrop-blur-sm last:col-span-2 lg:last:col-span-1">
                <div className="flex items-center gap-2 text-[#F2C7EB]">
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[.12em]">{label}</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offres en cours */}
      <section className="mt-9 sm:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="page-kicker">Marché privé</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.025em] text-foreground sm:text-2xl">
              Opportunités ouvertes
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
          <div className="surface-card rounded-2xl border border-dashed border-border bg-white/65 px-5 py-8 text-center sm:py-10">
            <CircleCheck className="mx-auto h-8 w-8 text-positive" />
            <p className="mt-3 text-sm font-semibold text-foreground">La prochaine sélection est en préparation</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              Chaque dossier est vérifié avant sa publication. Créez votre compte pour suivre les nouvelles opportunités.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setView("register")}>
              Être informé
              <ArrowRight className="h-4 w-4" />
            </Button>
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
      <section className="mt-10 section-rule pt-9 sm:mt-12 sm:pt-11">
        <p className="page-kicker">Parcours encadré</p>
        <h2 className="mb-5 mt-1 text-xl font-extrabold tracking-[-.025em] text-foreground sm:text-2xl">Simple pour investir. Exigeant pour sélectionner.</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="surface-card rounded-2xl border border-border bg-white/75 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-black/15"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-nexora-pale text-positive">
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
      <section className="mt-10 section-rule pt-9 sm:mt-12 sm:pt-11">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="page-kicker">Économie réelle</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.025em] text-foreground sm:text-2xl">Secteurs financés</h2></div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scroll-area-fancy sm:flex-wrap sm:overflow-visible">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setView("explore")}
              className="shrink-0 rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
