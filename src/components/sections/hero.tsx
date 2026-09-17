"use client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import type { PlatformStats } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import {
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Users,
  Sprout,
} from "lucide-react";

export function Hero() {
  const { setView } = useAppStore();
  const { data: stats } = useFetch<PlatformStats>("/api/stats");

  const statsBar = [
    {
      icon: TrendingUp,
      label: "Capital levé",
      value: stats ? formatCompact(stats.totalRaised) : "—",
    },
    {
      icon: Sprout,
      label: "Projets actifs",
      value: stats ? String(stats.activeProjects) : "—",
    },
    {
      icon: Users,
      label: "Investisseurs",
      value: stats ? stats.totalBackers.toLocaleString("fr-FR") : "—",
    },
    {
      icon: ShieldCheck,
      label: "Emplois créés",
      value: stats ? stats.totalJobs.toLocaleString("fr-FR") : "—",
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-border/60 baobab-pattern">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-5 border-primary/30 bg-background/60 px-3 py-1 text-xs font-medium text-primary"
          >
            🌍 Plateforme agréée — Zone UEMOA · BCEAO
          </Badge>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Investissez dans l'
            <span className="text-gradient-gold">Afrique de l'Ouest</span>
            <br className="hidden sm:block" /> qui entreprend.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Baobab Capital est la plateforme de référence de la levée de capitaux
            participatif privé en zone UEMOA. Accédez à des opportunités d'investissement
            sélectionnées dans l'agro-industrie, la finTech, l'énergie et la santé.
            À partir de <strong className="text-foreground">50 000 FCFA</strong>.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => setView("projects")}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              Découvrir les opportunités
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("how")}
              className="w-full sm:w-auto"
            >
              Comment ça marche ?
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Due diligence rigoureuse
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Ticket minimum 50 000 FCFA
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              8 pays couverts
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {statsBar.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-xl border border-border/60 bg-background/60 p-4 text-center backdrop-blur-sm"
              >
                <Icon className="mb-2 h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-foreground sm:text-2xl">
                  {s.value}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
