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
} from "@/components/ui/table";
import { fmtCompact, fmtFCFA } from "@/lib/finance";
import {
  ShieldCheck,
  Building2,
  Coins,
  HandCoins,
  CalendarClock,
  Inbox,
} from "lucide-react";

interface OfferRow {
  id: string;
  status: string;
  fundingGoal: number;
  raisedAmount: number;
  closingDate: string;
  publishedAt: string;
  project: {
    id: string;
    title: string;
    sector: string;
    country: string;
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

interface DisbursementRow {
  id: string;
  grossAmount: number;
  upfrontCommission: number;
  netAmount: number;
  status: string;
  createdAt: string;
  project: {
    title: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface DisbursementsResponse {
  disbursements: DisbursementRow[];
  executionEnabled: boolean;
  executionMessage: string;
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
    funded: "bg-nexora-lime text-nexora-black",
    closing: "bg-amber-100 text-amber-900",
    failed: "bg-[#FFF5F5] text-nexora-danger",
    closed: "bg-secondary text-muted-foreground",
  };
  return (
    <Badge className={`border-0 text-xs ${map[status] || "bg-secondary"}`}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  icon: typeof Coins;
}

function KpiCard({ label, value, hint, icon: Icon }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <p className="tnum mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </Card>
  );
}

function EmptyState({
  title,
  desc,
  icon: Icon,
}: {
  title: string;
  desc: string;
  icon: typeof Inbox;
}) {
  return (
    <div className="p-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

export function AdminFinance() {
  const { data, loading } = useFetch<AdminStatsResponse>("/api/admin/stats");
  const { data: disbursementData, loading: disbursementsLoading } =
    useFetch<DisbursementsResponse>("/api/admin/disbursements");

  // Calculs live depuis les offres remontées par /api/admin/stats
  const { totalCollected, collections } = useMemo(() => {
    if (!data?.offers) return { totalCollected: 0, collections: [] as OfferRow[] };
    const list = data.offers.filter(
      (o) => o.status === "open" || o.status === "closing" || o.status === "funded"
    );
    const sum = list.reduce((a, o) => a + Number(o.raisedAmount || 0), 0);
    return { totalCollected: sum, collections: list };
  }, [data]);

  if (loading || disbursementsLoading || !data) {
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

  const disbursements = disbursementData?.disbursements ?? [];
  const totalDisbursed = disbursements
    .filter((item) => item.status === "executed")
    .reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
  const totalRepaid = Number(data.stats.totalRepaid || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Finances
        </h1>
        <p className="text-sm text-muted-foreground">
          Collectes, décaissements et remboursements — vue consolidée des flux financiers (données live).
        </p>
      </div>

      {/* Notice séparation des devoirs */}
      <div className="mb-6 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          Celui qui prépare un paiement ne peut pas l&rsquo;approuver seul.
          Toute instruction de virement est validée par un second signataire.
        </p>
      </div>

      {/* 3 KPIs — tous issus de données live */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total collecté"
          value={fmtCompact(totalCollected)}
          hint={`${collections.length} campagne(s) active(s) · ${fmtFCFA(totalCollected)}`}
          icon={Coins}
        />
        <KpiCard
          label="Total décaissé"
          value={fmtCompact(totalDisbursed)}
          hint={`${disbursements.filter((item) => item.status === "executed").length} versement(s) exécuté(s)`}
          icon={HandCoins}
        />
        <KpiCard
          label="Total remboursé"
          value={fmtCompact(totalRepaid)}
          hint="Capital et intérêts distribués aux investisseurs"
          icon={CalendarClock}
        />
      </div>

      {/* 1. Collectes (live) */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Coins className="h-4 w-4" />
            Collectes en cours
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({collections.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {collections.length === 0 ? (
            <EmptyState
              title="Aucune collecte active"
              desc="Aucune offre n&rsquo;a encore reçu de souscriptions. Les données sont affichées en temps réel depuis la base."
              icon={Inbox}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                  <TableHead>Offre</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">Levé</TableHead>
                  <TableHead className="text-right">Objectif</TableHead>
                  <TableHead>Clôture</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium text-foreground">
                      {c.project?.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {c.project?.company?.tradeName || c.project?.company?.legalName}
                      </span>
                    </TableCell>
                    <TableCell className="tnum text-right text-sm font-semibold">
                      {fmtFCFA(c.raisedAmount)}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm text-muted-foreground">
                      {fmtFCFA(c.fundingGoal)}
                    </TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {new Date(c.closingDate).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 2. Décaissements */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <HandCoins className="h-4 w-4" />
            Décaissements (vers entreprises)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {disbursements.length === 0 ? (
            <EmptyState
              title="Aucun décaissement en cours"
              desc="Les versements apparaîtront après financement complet et validation du compte entreprise."
              icon={HandCoins}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                  <TableHead>Projet</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium">{item.project.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.project.company.tradeName || item.project.company.legalName}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">{fmtFCFA(item.grossAmount)}</TableCell>
                    <TableCell className="tnum text-right text-sm font-semibold">{fmtFCFA(item.netAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.status === "pending" ? "À approuver" : item.status === "approved" ? "Approuvé" : item.status === "executed" ? "Versé" : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. Remboursements (empty state) */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarClock className="h-4 w-4" />
            Remboursements entreprise (échéances)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            title="Aucune échéance à venir"
            desc="Aucun projet n&rsquo;est en phase de remboursement. Les échéances seront visibles ici une fois un projet financé et son échéancier confirmé."
            icon={CalendarClock}
          />
        </CardContent>
      </Card>

    </div>
  );
}
