"use client";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { PlatformStats } from "@/lib/types";
import { formatCompact, formatFCFA } from "@/lib/format";
import {
  Globe2,
  TrendingUp,
  Factory,
  HeartPulse,
  GraduationCap,
  Zap,
  Sprout,
  ArrowRight,
} from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  Sénégal: "🇸🇳",
  "Côte d'Ivoire": "🇨🇮",
  Mali: "🇲🇱",
  "Burkina Faso": "🇧🇫",
  Niger: "🇳🇪",
  Togo: "🇹🇬",
  Bénin: "🇧🇯",
  "Guinée-Bissau": "🇬🇼",
  Ghana: "🇬🇭",
  Nigeria: "🇳🇬",
};

const SECTOR_INFO: Record<string, { icon: any; blurb: string }> = {
  "Agro-industrie": {
    icon: Sprout,
    blurb:
      "L'Afrique de l'Ouest détient 60 % des terres arables non exploitées de la planète. Transformation locale = valeur ajoutée.",
  },
  FinTech: {
    icon: TrendingUp,
    blurb:
      "200 millions d'Africains non bancarisés. Le mobile money génère 14,2 Md FCFA de revenus annuels dans l'UEMOA.",
  },
  Énergie: {
    icon: Zap,
    blurb:
      "Le déficit énergétique coûte 2 % de PIB/an. Le solaire est devenu la source la moins chère du continent.",
  },
  Santé: {
    icon: HeartPulse,
    blurb:
      "Déficit de 2,5 millions de lits. Démographie galopante = besoins en infrastructures médicales colossaux.",
  },
  Éducation: {
    icon: GraduationCap,
    blurb:
      "60 % de la population a moins de 25 ans. L'EdTech comble le gap d'accès à l'enseignement supérieur.",
  },
  Immobilier: {
    icon: Factory,
    blurb:
      "Déficit de 12 millions de logements en zone UEMOA. Urbanisation accélérée = demande structurelle.",
  },
  Logistique: {
    icon: Factory,
    blurb:
      "Coût logistique = 2x la moyenne mondiale. Last-mile et hubs régionaux : moteurs du commerce intra-africain.",
  },
  Commerce: {
    icon: Factory,
    blurb:
      "ZLECAf = marché de 1,3 milliard de consommateurs. La classe moyenne ouest-africaine double tous les 8 ans.",
  },
};

const CHART_COLOR = "oklch(0.55 0.13 162)";

export function MarketInsights() {
  const { setView } = useAppStore();
  const { data, loading } = useFetch<PlatformStats>("/api/stats");

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Marché · UEMOA + CEDEAO
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Le marché ouest-africain de l'investissement
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Une économie de 400 millions d'habitants, un PIB régional en croissance de
          6,5 %/an, et un marché intégré (ZLECAf) qui ouvre 1,3 milliard de
          consommateurs. Découvrez où va le capital.
        </p>
      </div>

      {/* Macroeconomic highlights */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "PIB zone UEMOA", value: "175 Md USD", sub: "+6,5 % en 2024" },
          { label: "Population CEDEAO", value: "400 M", sub: "60 % < 25 ans" },
          { label: "Investissements PE/Afrique", value: "3,9 Md USD", sub: "2024" },
          { label: "Startups financées", value: "1 250+", sub: "Afrique francophone" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-primary">{s.sub}</p>
          </Card>
        ))}
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Capital by sector */}
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Capital levé par secteur
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Répartition du financement participatif sur Baobab Capital
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.bySector} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCompact(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  width={90}
                  stroke="var(--border)"
                />
                <Tooltip
                  formatter={(v: number) => formatFCFA(v)}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.bySector.map((_, i) => (
                    <Cell key={i} fill={CHART_COLOR} fillOpacity={1 - i * 0.12} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Capital by country */}
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
              <Globe2 className="h-5 w-5 text-primary" />
              Capital levé par pays
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Géographie des flux d'investissement
            </p>
            <div className="space-y-2.5">
              {data.byCountry.map((c, i) => {
                const max = data.byCountry[0]?.value || 1;
                const widthPct = (c.value / max) * 100;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-7 text-lg">{COUNTRY_FLAGS[c.name] || "🌍"}</span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-muted-foreground">
                          {formatCompact(c.value)}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            background: CHART_COLOR,
                            opacity: 1 - i * 0.1,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Sector deep dives */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          Les secteurs porteurs
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(SECTOR_INFO).slice(0, 8).map(([name, info]) => {
            const Icon = info.icon;
            const sectorStats = data?.bySector.find((s) => s.name === name);
            return (
              <Card key={name} className="p-4 transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {sectorStats && (
                    <span className="text-xs font-bold text-foreground">
                      {formatCompact(sectorStats.value)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {info.blurb}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center">
        <h3 className="text-xl font-bold text-foreground">
          Prêt à participer à la croissance ouest-africaine ?
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Parcourez les opportunités sélectionnées et investissez à partir de
          50 000 FCFA.
        </p>
        <Button
          onClick={() => setView("projects")}
          className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Voir les opportunités
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
