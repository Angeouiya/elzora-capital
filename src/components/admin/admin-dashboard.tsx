"use client";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { fmtCompact, fmtFCFA } from "@/lib/finance";
import {
  TrendingUp,
  Building2,
  FileSearch,
  ShieldCheck,
  Users,
  Coins,
  ArrowRight,
  Activity,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types — réponses API
// ---------------------------------------------------------------------------
interface OfferRow {
  id: string;
  status: string;
  raisedAmount: number;
  fundingGoal: number;
  backersCount: number;
  closingDate: string;
  project: {
    id: string;
    title: string;
    sector: string;
    country: string;
    instrumentType: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface ProjectRow {
  id: string;
  title: string;
  status: string;
  sector: string;
  country: string;
  fundingGoal: number;
  company: {
    legalName: string;
    tradeName?: string | null;
    verificationStatus: string;
  };
}

interface AdminStatsResponse {
  stats: {
    totalRaised: number;
    totalInvestments: number;
    openOffers: number;
    totalProjects: number;
    pendingProjects: number;
    totalCompanies: number;
    totalUsers: number;
    totalInvestors: number;
  };
  offers: OfferRow[];
  projects: ProjectRow[];
  users: Array<{ id: string; kycStatus: string }>;
  companies: Array<{ id: string; verificationStatus: string }>;
}

interface ProjectEventRow {
  id: string;
  eventType: string;
  description: string;
  actor: string;
  createdAt: string;
}

interface AnalysisProjectRow extends ProjectRow {
  timeline?: ProjectEventRow[];
}

interface AnalysisResponse {
  projects?: AnalysisProjectRow[];
  error?: string;
}

const PENDING_STATUSES = ["submitted", "under_review", "complement_requested"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  under_review: "En analyse",
  complement_requested: "Complément demandé",
  rejected: "Rejeté",
  approved: "Approuvé",
  offer_prepared: "Offre préparée",
  offer_confirmed: "Offre confirmée",
  published: "Publié",
  funding: "En collecte",
  funded: "Financé",
  repaying: "En remboursement",
  completed: "Terminé",
  defaulted: "En défaut",
  closed: "Clôturé",
};

interface ActivityEntry {
  id: string;
  icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
  time: string;
}

// Métadonnée d'affichage par eventType
const EVENT_META: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  submitted: { icon: FileText, color: "text-muted-foreground", label: "Dossier soumis" },
  under_review: { icon: FileSearch, color: "text-amber-700", label: "Analyse démarrée" },
  complement_requested: {
    icon: AlertCircle,
    color: "text-amber-700",
    label: "Complément demandé",
  },
  approved: { icon: CheckCircle2, color: "text-positive", label: "Dossier approuvé" },
  rejected: { icon: XCircle, color: "text-nexora-danger", label: "Dossier refusé" },
  offer_prepared: { icon: FileText, color: "text-muted-foreground", label: "Offre préparée" },
  offer_confirmed: { icon: CheckCircle2, color: "text-positive", label: "Offre confirmée" },
  published: { icon: Send, color: "text-positive", label: "Offre publiée" },
  funded: { icon: Coins, color: "text-positive", label: "Financement atteint" },
  payment_confirmed: {
    icon: Coins,
    color: "text-positive",
    label: "Échéance confirmée",
  },
  payment_declared: {
    icon: CalendarClock,
    color: "text-amber-700",
    label: "Échéance déclarée",
  },
  investment_confirmed: {
    icon: CheckCircle2,
    color: "text-positive",
    label: "Investissement confirmé",
  },
};

function fmtRelative(d: string): string {
  const now = Date.now();
  const t = new Date(d).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l&rsquo;instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(d).toLocaleDateString("fr-FR");
}

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${
        highlight ? "border-nexora-lime/60 bg-nexora-pale" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${highlight ? "text-positive" : "text-foreground"}`} />
      </div>
      <p
        className={`tnum mt-2 text-2xl font-bold ${
          highlight ? "text-positive" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function AdminDashboard() {
  const setView = useAppStore((s) => s.setView);
  const { data, loading } = useFetch<AdminStatsResponse>("/api/admin/stats");

  // Fetch additionnelle pour l'activité récente (timeline des projets)
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/analysis")
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as AnalysisResponse;
      })
      .then((d) => {
        if (!active || !d?.projects) return;
        const all: Array<ProjectEventRow & { projectTitle: string }> = [];
        for (const p of d.projects) {
          for (const ev of p.timeline || []) {
            all.push({ ...ev, projectTitle: p.title });
          }
        }
        all.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const top = all.slice(0, 8);
        const entries: ActivityEntry[] = top.map((ev) => {
          const meta = EVENT_META[ev.eventType] || {
            icon: Activity,
            color: "text-muted-foreground",
            label: ev.eventType,
          };
          const Icon = meta.icon;
          return {
            id: ev.id,
            icon: Icon,
            color: meta.color,
            title: meta.label,
            desc: `${ev.projectTitle}${ev.description ? ` — ${ev.description}` : ""}`,
            time: fmtRelative(ev.createdAt),
          };
        });
        setActivity(entries);
        setActivityLoading(false);
      })
      .catch(() => {
        if (active) setActivityLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { sectorData, countryData } = useMemo(() => {
    if (!data?.offers) return { sectorData: [], countryData: [] };
    const bySector = new Map<string, number>();
    const byCountry = new Map<string, number>();
    for (const o of data.offers) {
      const sec = o.project?.sector || "Autre";
      bySector.set(sec, (bySector.get(sec) || 0) + Number(o.raisedAmount || 0));
      const country = o.project?.country || "Autre";
      byCountry.set(country, (byCountry.get(country) || 0) + 1);
    }
    return {
      sectorData: Array.from(bySector.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      countryData: Array.from(byCountry.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [data]);

  const pendingProjects = useMemo(() => {
    if (!data?.projects) return [];
    return data.projects.filter((p) => PENDING_STATUSES.includes(p.status));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="mb-6 h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const { stats } = data;

  const sectorChartConfig: ChartConfig = {
    value: { label: "Capital levé", color: "#541249" },
  };
  const countryChartConfig: ChartConfig = {
    value: { label: "Offres", color: "#7A246C" },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Pilotage
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue d&rsquo;ensemble de l&rsquo;activité plateforme — données live depuis la base.
        </p>
      </div>

      {/* 6 métriques */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Capital levé total"
          value={fmtCompact(stats.totalRaised)}
          icon={TrendingUp}
          hint={fmtFCFA(stats.totalRaised)}
        />
        <MetricCard
          label="Offres ouvertes"
          value={String(stats.openOffers)}
          icon={Building2}
          hint={`${stats.totalProjects} projets au total`}
        />
        <MetricCard
          label="Projets en attente"
          value={String(stats.pendingProjects)}
          icon={FileSearch}
          hint={stats.pendingProjects > 0 ? "À traiter" : "File vide"}
          highlight={stats.pendingProjects > 0}
        />
        <MetricCard
          label="Entreprises vérifiées"
          value={String(
            data.companies.filter((c) => c.verificationStatus === "verified").length
          )}
          icon={ShieldCheck}
          hint={`${stats.totalCompanies} au total`}
        />
        <MetricCard
          label="Investisseurs inscrits"
          value={String(stats.totalInvestors)}
          icon={Users}
          hint="comptes particuliers"
        />
        <MetricCard
          label="Investissements confirmés"
          value={fmtCompact(stats.totalInvestments)}
          icon={Coins}
          hint={fmtFCFA(stats.totalInvestments)}
        />
      </div>

      {/* Layout 2 colonnes */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tâches prioritaires */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileSearch className="h-4 w-4" />
                Tâches prioritaires
                <span className="tnum text-xs font-normal text-muted-foreground">
                  ({pendingProjects.length})
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setView("admin_analysis")}
              >
                Voir l&rsquo;analyse
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-2 overflow-y-auto p-3 scroll-area-fancy">
              {pendingProjects.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Aucun dossier en attente d&rsquo;analyse.
                </div>
              ) : (
                pendingProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-md border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>
                          {p.company?.tradeName || p.company?.legalName}
                        </span>
                        <span className="text-border">·</span>
                        <span>{p.sector}</span>
                        <span className="text-border">·</span>
                        <span className="tnum">{fmtCompact(p.fundingGoal)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                      <Button
                        size="sm"
                        className="btn-nexora"
                        onClick={() => setView("admin_analysis")}
                      >
                        Analyser
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 2 charts */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Capital levé par secteur
              </p>
              {sectorData.length > 0 ? (
                <ChartContainer config={sectorChartConfig} className="h-[220px] w-full">
                  <BarChart data={sectorData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#e5e5e3" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      tick={{ fontSize: 11, fill: "#6b6b6b" }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(v) => fmtCompact(Number(v))}
                        />
                      }
                    />
                    <Bar dataKey="value" fill="#541249" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Offres par pays
              </p>
              {countryData.length > 0 ? (
                <ChartContainer config={countryChartConfig} className="h-[220px] w-full">
                  <BarChart data={countryData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid vertical={false} stroke="#e5e5e3" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#6b6b6b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      tick={{ fontSize: 11, fill: "#6b6b6b" }}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="value" fill="#7A246C" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ul className="max-h-[640px] space-y-1 overflow-y-auto scroll-area-fancy">
                {activityLoading ? (
                  [...Array(5)].map((_, i) => (
                    <li key={i} className="p-2.5">
                      <Skeleton className="h-12 w-full" />
                    </li>
                  ))
                ) : activity.length === 0 ? (
                  <li className="p-6 text-center text-xs text-muted-foreground">
                    Aucun événement enregistré.
                  </li>
                ) : (
                  activity.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 rounded-md p-2.5 hover:bg-secondary/60"
                      >
                        <div className={`mt-0.5 shrink-0 ${a.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground">
                            {a.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {a.desc}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {a.time}
                          </p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Notice séparation des pouvoirs */}
          <div className="mt-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
            <p className="text-[11px] leading-relaxed text-positive">
              L&rsquo;analyste recommande, le comité décide. Celui qui prépare ne
              peut pas approuver seul.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
