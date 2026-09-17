"use client";
import { useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { fmtCompact, fmtFCFA } from "@/lib/finance";
import { Coins, ShieldCheck, Lock, Inbox } from "lucide-react";

// ---------------------------------------------------------------------------
// Modèle tarifaire NEXORA (CONFIGURÉ — figé contractuellement) :
//   - 6 % upfront (commission initiale sur capital financé)
//   - 2 %/an de suivi (prorata temporis sur la durée)
//   - 0 % pour l&rsquo;investisseur (aucun frais côté investisseur)
// Reproduction exacte du scénario section 28 : 1M financé → 60k + 10k = 70k
// ---------------------------------------------------------------------------

interface OfferRow {
  id: string;
  status: string;
  fundingGoal: number;
  raisedAmount: number;
  annualFollowUpPct: number;
  upfrontCommissionPct: number;
  durationMonths: number | null;
  project: {
    id: string;
    title: string;
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

// Projets dont le financement est atteint (donc commission due)
const FUNDED_STATUSES = new Set(["funded", "repaying", "completed", "defaulted"]);

interface CommissionRow {
  id: string;
  offer: string;
  company: string;
  funded: number;
  durationMonths: number;
  upfrontPct: number;
  followUpPctAnnual: number;
  upfront: number;
  followUp: number;
  total: number;
}

function computeRow(o: OfferRow): CommissionRow {
  const funded = Number(o.fundingGoal || 0);
  const durationMonths = Number(o.durationMonths || 0);
  const upfrontPct = Number(o.upfrontCommissionPct || 6);
  const followUpPctAnnual = Number(o.annualFollowUpPct || 2);
  const upfront = Math.round((funded * upfrontPct) / 100);
  const followUp =
    durationMonths > 0
      ? Math.round((funded * followUpPctAnnual * durationMonths) / (100 * 12))
      : 0;
  return {
    id: o.id,
    offer: o.project?.title || "—",
    company: o.project?.company?.tradeName || o.project?.company?.legalName || "—",
    funded,
    durationMonths,
    upfrontPct,
    followUpPctAnnual,
    upfront,
    followUp,
    total: upfront + followUp,
  };
}

// Ligne d&rsquo;exemple théorique pour le scénario section 28
// (uniquement pour l&rsquo;empty state — clairement étiquetée "exemple de référence")
const REF28_ROW: CommissionRow = {
  id: "ref28",
  offer: "Exemple de référence (section 28)",
  company: "Téranga Commerce (exemple)",
  funded: 1_000_000,
  durationMonths: 6,
  upfrontPct: 6,
  followUpPctAnnual: 2,
  upfront: 60_000,
  followUp: 10_000,
  total: 70_000,
};

export function AdminCommissions() {
  const { data, loading } = useFetch<AdminStatsResponse>("/api/admin/stats");

  const rows = useMemo<CommissionRow[]>(() => {
    if (!data?.offers) return [];
    return data.offers
      .filter((o) => FUNDED_STATUSES.has(o.status))
      .map(computeRow);
  }, [data]);

  const totals = useMemo(() => {
    const upfront = rows.reduce((a, r) => a + r.upfront, 0);
    const followUp = rows.reduce((a, r) => a + r.followUp, 0);
    return { upfront, followUp, total: upfront + followUp };
  }, [rows]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="mb-6 h-9 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Commissions plateforme
        </h1>
        <p className="text-sm text-muted-foreground">
          Tarification contractuelle figée : 6 % upfront + 2 %/an de suivi.
          0 % côté investisseur.
        </p>
      </div>

      {/* Notice — versionné et figé */}
      <div className="mb-6 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          Versionner et figer la tarification contractuelle. Aucune modification
          rétroactive. Tout ajustement futur ne s&rsquo;applique qu&rsquo;aux
          nouvelles offres publiées après la date d&rsquo;effet.
        </p>
      </div>

      {/* Modèle tarifaire (CONFIGURÉ) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Commission initiale (upfront)
            </span>
            <Coins className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">6 %</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Prélevée à la mise en place, sur le capital effectivement financé.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Suivi annuel
            </span>
            <Coins className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">2 %/an</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Prorata temporis sur la durée du financement.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Frais investisseur
            </span>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-muted-foreground">0 %</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Aucun frais d&rsquo;inscription ni de gestion côté investisseur.
          </p>
        </Card>
      </div>

      {/* Table — LIVE commissions calculées depuis les offres financées */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Coins className="h-4 w-4" />
            Revenus plateforme par offre financée
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({rows.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">
                Aucune offre financée à ce jour
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Les commissions apparaîtront automatiquement ici dès qu&rsquo;une
                offre atteint le statut « financé ». Aucune donnée inventée.
              </p>

              {/* Exemple théorique section 28 — clairement étiqueté */}
              <div className="mx-auto mt-6 max-w-2xl rounded-md border border-dashed border-nexora-lime/50 bg-nexora-pale/60 p-4 text-left">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-positive">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Exemple de référence — section 28 du brief (théorique, pas une donnée live)
                </p>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="text-xs">Offre</TableHead>
                      <TableHead className="text-xs">Entreprise</TableHead>
                      <TableHead className="text-right text-xs">Financé</TableHead>
                      <TableHead className="text-xs">Durée</TableHead>
                      <TableHead className="text-right text-xs">Upfront (6 %)</TableHead>
                      <TableHead className="text-right text-xs">Suivi (2 %/an)</TableHead>
                      <TableHead className="text-right text-xs">Total CA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="text-xs font-medium text-foreground">
                        {REF28_ROW.offer}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {REF28_ROW.company}
                      </TableCell>
                      <TableCell className="tnum text-right text-xs">
                        {fmtFCFA(REF28_ROW.funded)}
                      </TableCell>
                      <TableCell className="tnum text-xs text-muted-foreground">
                        {REF28_ROW.durationMonths} mois
                      </TableCell>
                      <TableCell className="tnum text-right text-xs font-semibold">
                        {fmtFCFA(REF28_ROW.upfront)}
                      </TableCell>
                      <TableCell className="tnum text-right text-xs">
                        {fmtFCFA(REF28_ROW.followUp)}
                      </TableCell>
                      <TableCell className="tnum text-right text-xs font-bold">
                        {fmtFCFA(REF28_ROW.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                  <TableHead>Offre</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">Financé</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead className="text-right">Upfront</TableHead>
                  <TableHead className="text-right">Suivi (2 %/an)</TableHead>
                  <TableHead className="text-right">Total CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium text-foreground">
                      {r.offer}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.company}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {fmtFCFA(r.funded)}
                    </TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {r.durationMonths} mois
                    </TableCell>
                    <TableCell className="tnum text-right text-sm font-semibold">
                      {fmtFCFA(r.upfront)}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {fmtFCFA(r.followUp)}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm font-bold text-foreground">
                      {fmtFCFA(r.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-xs font-semibold">
                    Total CA plateforme (offres financées)
                  </TableCell>
                  <TableCell className="tnum text-right font-bold">
                    {fmtCompact(totals.upfront)}
                  </TableCell>
                  <TableCell className="tnum text-right font-bold">
                    {fmtCompact(totals.followUp)}
                  </TableCell>
                  <TableCell className="tnum text-right text-base font-bold text-foreground">
                    {fmtCompact(totals.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 28 reference (callout) */}
      <div className="mt-6 rounded-lg border border-nexora-lime/40 bg-nexora-pale p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-positive">
          <ShieldCheck className="h-4 w-4" />
          Scénario de référence — section 28
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-background p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Capital financé
            </p>
            <p className="tnum mt-1 text-lg font-bold text-foreground">
              {fmtFCFA(1_000_000)}
            </p>
          </div>
          <div className="rounded-md bg-background p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Commission upfront (6 %)
            </p>
            <p className="tnum mt-1 text-lg font-bold text-foreground">
              {fmtFCFA(60_000)}
            </p>
          </div>
          <div className="rounded-md bg-background p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Suivi 2 %/an × 6 mois
            </p>
            <p className="tnum mt-1 text-lg font-bold text-foreground">
              {fmtFCFA(10_000)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-positive">
          Soit un CA plateforme de{" "}
          <span className="tnum font-bold">70 000 FCFA</span> sur
          l&rsquo;opération complète. Le net entreprise est de{" "}
          <span className="tnum font-bold">940 000 FCFA</span> (1 000 000 −
          60 000), l&rsquo;entreprise rembourse{" "}
          <span className="tnum font-bold">1 090 000 FCFA</span> à terme échu
          (capital + 80 000 d&rsquo;intérêts + 10 000 de suivi).
        </p>
      </div>
    </div>
  );
}
