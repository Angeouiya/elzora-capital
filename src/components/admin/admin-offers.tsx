"use client";
import { Fragment, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtCompact, fmtFCFA, fmtPct } from "@/lib/finance";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Ban,
  Lock,
  Users,
  Inbox,
} from "lucide-react";

interface OfferRow {
  id: string;
  status: string;
  fundingGoal: number;
  raisedAmount: number;
  committedAmount: number;
  backersCount: number;
  closingDate: string;
  publishedAt: string;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  project: {
    id: string;
    title: string;
    sector: string;
    country: string;
    instrumentType: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface AdminStatsResponse {
  stats: Record<string, number>;
  offers: OfferRow[];
  projects: unknown[];
  users: unknown[];
  companies: unknown[];
}

const STATUS_LABEL: Record<string, string> = {
  open: "Ouverte",
  closing: "Clôture",
  funded: "Financée",
  failed: "Échec",
  closed: "Clôturée",
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-nexora-pale text-positive",
    closing: "bg-amber-100 text-amber-900",
    funded: "bg-nexora-lime text-nexora-black",
    failed: "bg-[#FFF5F5] text-nexora-danger",
    closed: "bg-secondary text-muted-foreground",
  };
  return (
    <Badge className={`border-0 text-xs ${map[status] || "bg-secondary"}`}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

function instrumentLabel(o: OfferRow): string {
  if (o.project?.instrumentType === "equity") {
    return o.equityOfferedPct != null
      ? `Action · ${o.equityOfferedPct} %`
      : "Action";
  }
  if (o.annualRate == null) return "Dette";
  const period = o.ratePeriod === "annual" ? "/an" : " total";
  return `Dette · ${o.annualRate} %${period}`;
}

export function AdminOffers() {
  const openOffer = useAppStore((s) => s.openOffer);
  const { data, loading } = useFetch<AdminStatsResponse>("/api/admin/stats");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const offers = useMemo(() => {
    if (!data?.offers) return [];
    const list = [...data.offers].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    if (filter !== "all") return list.filter((o) => o.status === filter);
    return list;
  }, [data, filter]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="mb-4 h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Offres publiées
            </h1>
            <p className="text-sm text-muted-foreground">
              Suivi des campagnes en cours et clôturées — données live depuis la base.
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les offres</SelectItem>
              <SelectItem value="open">Ouvertes</SelectItem>
              <SelectItem value="closing">Clôture</SelectItem>
              <SelectItem value="funded">Financées</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="closed">Clôturées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notice */}
        <div className="mb-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
          <p className="text-[11px] leading-relaxed text-positive">
            Toute modification d&rsquo;une offre publiée déclenche une nouvelle
            procédure de validation. Les investisseurs sont avertis.
          </p>
        </div>

        {offers.length === 0 ? (
          <Card className="p-10 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              Aucune offre pour ce filtre
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aucune offre ne correspond au statut sélectionné. Aucune donnée inventée.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-8" />
                  <TableHead className="min-w-[200px]">Projet / Entreprise</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead className="text-right">Objectif</TableHead>
                  <TableHead className="text-right">Levé</TableHead>
                  <TableHead className="w-32">Progression</TableHead>
                  <TableHead className="text-right">Souscripteurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Clôture</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => {
                  const isOpen = expanded === o.id;
                  const pct =
                    o.fundingGoal > 0
                      ? Math.min(100, (Number(o.raisedAmount) / o.fundingGoal) * 100)
                      : 0;
                  const isActive = o.status === "open" || o.status === "closing";
                  return (
                    <Fragment key={o.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : o.id)}
                      >
                        <TableCell className="pl-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {o.project?.title}
                          </p>
                          <p className="line-clamp-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {o.project?.company?.tradeName || o.project?.company?.legalName}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          {instrumentLabel(o)}
                        </TableCell>
                        <TableCell className="tnum text-right text-sm">
                          {fmtCompact(o.fundingGoal)}
                        </TableCell>
                        <TableCell className="tnum text-right text-sm font-semibold">
                          {fmtCompact(o.raisedAmount)}
                        </TableCell>
                        <TableCell>
                          <Progress value={pct} className="h-1.5" />
                          <p className="tnum mt-0.5 text-[10px] text-muted-foreground">
                            {fmtPct(pct, 1)}
                          </p>
                        </TableCell>
                        <TableCell className="tnum text-right text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {o.backersCount}
                          </span>
                        </TableCell>
                        <TableCell>{statusBadge(o.status)}</TableCell>
                        <TableCell className="tnum text-xs text-muted-foreground">
                          {new Date(o.closingDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      className="h-7 px-2 text-xs text-amber-700"
                                    >
                                      <Ban className="mr-1 h-3.5 w-3.5" />
                                      Suspendre
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Action soumise à validation conformité
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      className="h-7 px-2 text-xs text-nexora-danger"
                                    >
                                      <Lock className="mr-1 h-3.5 w-3.5" />
                                      Clôturer
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Action soumise à validation conformité
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow
                          key={o.id + "-detail"}
                          className="bg-secondary/20 hover:bg-secondary/20"
                        >
                          <TableCell colSpan={10} className="p-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                              <DetailBlock
                                label="Conditions financières"
                                items={[
                                  ["Objectif", fmtFCFA(o.fundingGoal)],
                                  ["Levé", fmtFCFA(o.raisedAmount)],
                                  ["Engagé", fmtFCFA(o.committedAmount)],
                                  ["Commission upfront", `${o.upfrontCommissionPct} %`],
                                  ["Suivi annuel", `${o.annualFollowUpPct} %`],
                                ]}
                              />
                              <DetailBlock
                                label="Calendrier"
                                items={[
                                  ["Publiée le", new Date(o.publishedAt).toLocaleDateString("fr-FR")],
                                  ["Clôture", new Date(o.closingDate).toLocaleDateString("fr-FR")],
                                  ["Durée", o.durationMonths ? `${o.durationMonths} mois` : "—"],
                                  ["Type remboursement", o.repaymentType || "—"],
                                ]}
                              />
                              <DetailBlock
                                label="Projet"
                                items={[
                                  ["Secteur", o.project?.sector || "—"],
                                  ["Pays", o.project?.country || "—"],
                                  ["Instrument", o.project?.instrumentType === "equity" ? "Action" : "Dette"],
                                  ["Taux", o.annualRate != null ? `${o.annualRate} %` : "—"],
                                ]}
                              />
                              <div className="md:col-span-1 space-y-2">
                                <Button
                                  size="sm"
                                  className="btn-nexora w-full"
                                  onClick={() => openOffer(o.id)}
                                >
                                  Voir l&rsquo;offre publique
                                </Button>
                                <div className="rounded-md bg-background p-2.5">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Avertissement
                                  </p>
                                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                                    Suspendre / clôturer déclenche une procédure
                                    de validation et notifie tous les
                                    souscripteurs concernés.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function DetailBlock({
  label,
  items,
}: {
  label: string;
  items: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <dl className="mt-1 space-y-1">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 text-xs">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tnum font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
