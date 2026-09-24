"use client";
import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BriefcaseBusiness,
  Coins,
  HandCoins,
  CalendarClock,
  Inbox,
  FileCheck2,
  Scale,
  BadgeDollarSign,
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

interface EquityIssuanceRow {
  id: string;
  offerId: string;
  shareClass: string;
  totalOwnershipPct: number;
  status: string;
  resolutionRef: string | null;
  resolutionDate: string | null;
  declarationRef: string | null;
  shareRegisterRef: string | null;
  preparedBy: string | null;
  approvedBy: string | null;
  allocationCount: number;
  allocatedOwnershipPct: number;
  issuedCount: number;
  issuedAt: string | null;
  project: {
    title: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface EquityIssuancesResponse {
  issuances: EquityIssuanceRow[];
}

interface EquityFormState {
  shareClass?: string;
  resolutionRef?: string;
  resolutionDate?: string;
  declarationRef?: string;
  shareRegisterRef?: string;
}

interface EquityDividendRow {
  id: string;
  status: string;
  totalDeclaredAmount: number;
  platformGrossAmount: number;
  withholdingAmount: number;
  netPayableAmount: number;
  ownershipPct: number;
  allocationCount: number;
  resolutionRef: string;
  resolutionDate: string;
  recordDate: string;
  taxReference: string | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  paidAt: string | null;
  grossAllocated: number;
  withholdingAllocated: number;
  netAllocated: number;
  project: {
    title: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface EquityDividendsResponse {
  dividends: EquityDividendRow[];
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
  const { toast } = useToast();
  const [equityReload, setEquityReload] = useState(0);
  const [equityForms, setEquityForms] = useState<Record<string, EquityFormState>>({});
  const [equityAction, setEquityAction] = useState<string | null>(null);
  const [dividendAction, setDividendAction] = useState<string | null>(null);
  const [dividendReasons, setDividendReasons] = useState<Record<string, string>>({});
  const { data, loading } = useFetch<AdminStatsResponse>("/api/admin/stats");
  const { data: disbursementData, loading: disbursementsLoading } =
    useFetch<DisbursementsResponse>("/api/admin/disbursements");
  const { data: equityData, loading: equityLoading, error: equityError } =
    useFetch<EquityIssuancesResponse>(`/api/admin/equity-issuances?refresh=${equityReload}`);
  const { data: dividendData, loading: dividendsLoading, error: dividendsError } =
    useFetch<EquityDividendsResponse>(`/api/admin/equity-dividends?refresh=${equityReload}`);

  // Calculs live depuis les offres remontées par /api/admin/stats
  const { totalCollected, collections } = useMemo(() => {
    if (!data?.offers) return { totalCollected: 0, collections: [] as OfferRow[] };
    const list = data.offers.filter(
      (o) => o.status === "open" || o.status === "closing" || o.status === "funded"
    );
    const sum = list.reduce((a, o) => a + Number(o.raisedAmount || 0), 0);
    return { totalCollected: sum, collections: list };
  }, [data]);

  if (loading || disbursementsLoading || equityLoading || dividendsLoading || !data) {
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
  const equityIssuances = equityData?.issuances ?? [];
  const equityDividends = dividendData?.dividends ?? [];

  const updateEquityForm = (id: string, key: keyof EquityFormState, value: string) => {
    setEquityForms((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  };

  const runEquityAction = async (
    issuance: EquityIssuanceRow,
    action: "prepare" | "approve" | "issue"
  ) => {
    const form = equityForms[issuance.id] ?? {};
    setEquityAction(`${issuance.id}:${action}`);
    try {
      const response = await fetch("/api/admin/equity-issuances", {
        method: action === "prepare" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "prepare"
            ? {
                offerId: issuance.offerId,
                shareClass: form.shareClass ?? issuance.shareClass,
                resolutionRef: form.resolutionRef ?? "",
                resolutionDate: form.resolutionDate ?? "",
              }
            : action === "approve"
              ? { issuanceId: issuance.id, action }
              : {
                  issuanceId: issuance.id,
                  action,
                  declarationRef: form.declarationRef ?? "",
                  shareRegisterRef: form.shareRegisterRef ?? "",
                }
        ),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Action indisponible");
      toast({
        title:
          action === "prepare"
            ? "Émission préparée"
            : action === "approve"
              ? "Émission approuvée"
              : "Participations enregistrées",
      });
      setEquityReload((value) => value + 1);
    } catch (error) {
      toast({
        title: "Action non enregistrée",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setEquityAction(null);
    }
  };

  const runDividendAction = async (
    dividend: EquityDividendRow,
    action: "review" | "approve" | "reject"
  ) => {
    setDividendAction(`${dividend.id}:${action}`);
    try {
      const response = await fetch("/api/admin/equity-dividends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dividendId: dividend.id,
          action,
          ...(action === "reject" ? { reason: dividendReasons[dividend.id] ?? "" } : {}),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Action indisponible");
      toast({
        title:
          action === "review"
            ? "Contrôle juridique enregistré"
            : action === "approve"
              ? "Distribution validée"
              : "Déclaration retournée à l’entreprise",
      });
      setEquityReload((value) => value + 1);
    } catch (error) {
      toast({
        title: "Action non enregistrée",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setDividendAction(null);
    }
  };

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
                        <BriefcaseBusiness className="h-3 w-3" />
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

      {/* 3. Registre des participations */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Scale className="h-4 w-4" />
            Émissions et registre des participations
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({equityIssuances.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {equityError ? (
            <EmptyState
              title="Accès au registre non disponible"
              desc="Votre rôle ne permet pas de consulter ou traiter les émissions en capital."
              icon={Scale}
            />
          ) : equityIssuances.length === 0 ? (
            <EmptyState
              title="Aucune émission à traiter"
              desc="Les allocations apparaîtront ici lorsqu’une collecte en capital atteindra son objectif."
              icon={FileCheck2}
            />
          ) : (
            <div className="divide-y divide-border">
              {equityIssuances.map((issuance) => {
                const form = equityForms[issuance.id] ?? {};
                const busy = equityAction?.startsWith(`${issuance.id}:`) ?? false;
                const label =
                  issuance.status === "pending_documents"
                    ? "Documents à préparer"
                    : issuance.status === "prepared"
                      ? "À approuver"
                      : issuance.status === "approved"
                        ? "Prête à enregistrer"
                        : issuance.status === "issued"
                          ? "Enregistrée"
                          : issuance.status;
                return (
                  <div key={issuance.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {issuance.project.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {issuance.project.company.tradeName || issuance.project.company.legalName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          issuance.status === "issued"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-[#D9BFD4] bg-[#FCF8FB] text-[#541249]"
                        }
                      >
                        {label}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Capital alloué</p>
                        <p className="tnum font-semibold">{issuance.allocatedOwnershipPct.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} %</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Capital prévu</p>
                        <p className="tnum font-semibold">{issuance.totalOwnershipPct.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} %</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investisseurs</p>
                        <p className="tnum font-semibold">{issuance.allocationCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Titres enregistrés</p>
                        <p className="tnum font-semibold">{issuance.issuedCount} / {issuance.allocationCount}</p>
                      </div>
                    </div>

                    {issuance.status === "pending_documents" && (
                      <div className="mt-4 grid gap-3 rounded-xl border border-border bg-secondary/20 p-3 sm:grid-cols-3">
                        <div>
                          <Label htmlFor={`share-class-${issuance.id}`} className="text-[11px]">Catégorie de titres</Label>
                          <Input
                            id={`share-class-${issuance.id}`}
                            value={form.shareClass ?? issuance.shareClass}
                            onChange={(event) => updateEquityForm(issuance.id, "shareClass", event.target.value)}
                            className="mt-1 h-9"
                            placeholder="Actions ordinaires"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`resolution-ref-${issuance.id}`} className="text-[11px]">Référence de la décision sociale</Label>
                          <Input
                            id={`resolution-ref-${issuance.id}`}
                            value={form.resolutionRef ?? ""}
                            onChange={(event) => updateEquityForm(issuance.id, "resolutionRef", event.target.value)}
                            className="mt-1 h-9"
                            placeholder="PV-AGE-2026-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`resolution-date-${issuance.id}`} className="text-[11px]">Date de la décision</Label>
                          <Input
                            id={`resolution-date-${issuance.id}`}
                            type="date"
                            value={form.resolutionDate ?? ""}
                            onChange={(event) => updateEquityForm(issuance.id, "resolutionDate", event.target.value)}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void runEquityAction(issuance, "prepare")}
                          >
                            Préparer l’émission
                          </Button>
                        </div>
                      </div>
                    )}

                    {issuance.status === "prepared" && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-amber-950">Double validation requise</p>
                          <p className="mt-0.5 text-[11px] text-amber-900">Un second responsable doit contrôler la décision sociale avant la suite.</p>
                        </div>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void runEquityAction(issuance, "approve")}
                        >
                          Approuver
                        </Button>
                      </div>
                    )}

                    {issuance.status === "approved" && (
                      <div className="mt-4 grid gap-3 rounded-xl border border-[#D9BFD4] bg-[#FCF8FB] p-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`declaration-ref-${issuance.id}`} className="text-[11px]">Déclaration de souscription et de versement</Label>
                          <Input
                            id={`declaration-ref-${issuance.id}`}
                            value={form.declarationRef ?? ""}
                            onChange={(event) => updateEquityForm(issuance.id, "declarationRef", event.target.value)}
                            className="mt-1 h-9"
                            placeholder="DSV-2026-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`register-ref-${issuance.id}`} className="text-[11px]">Référence du registre des titres</Label>
                          <Input
                            id={`register-ref-${issuance.id}`}
                            value={form.shareRegisterRef ?? ""}
                            onChange={(event) => updateEquityForm(issuance.id, "shareRegisterRef", event.target.value)}
                            className="mt-1 h-9"
                            placeholder="REG-TITRES-2026-001"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void runEquityAction(issuance, "issue")}
                          >
                            Confirmer l’enregistrement des titres
                          </Button>
                        </div>
                      </div>
                    )}

                    {issuance.status === "issued" && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                        <p className="font-semibold">Registre finalisé</p>
                        <p className="mt-1">Décision : {issuance.resolutionRef} · Déclaration : {issuance.declarationRef} · Registre : {issuance.shareRegisterRef}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Dividendes */}
      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="bg-secondary/40 pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BadgeDollarSign className="h-4 w-4" />
            Dividendes des participations
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({equityDividends.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dividendsError ? (
            <EmptyState
              title="Accès aux distributions non disponible"
              desc="Votre rôle ne permet pas de contrôler les déclarations de dividendes."
              icon={BadgeDollarSign}
            />
          ) : equityDividends.length === 0 ? (
            <EmptyState
              title="Aucune distribution déclarée"
              desc="Les décisions de distribution transmises par les entreprises apparaîtront ici."
              icon={BadgeDollarSign}
            />
          ) : (
            <div className="divide-y divide-border">
              {equityDividends.map((dividend) => {
                const busy = dividendAction?.startsWith(`${dividend.id}:`) ?? false;
                const statusLabel: Record<string, string> = {
                  submitted: "Contrôle juridique",
                  reviewed: "Validation financière",
                  approved: "Prête au règlement",
                  verifying: "Paiement en vérification",
                  paid: "Distribuée",
                  rejected: "À corriger",
                  cancelled: "Annulée",
                };
                return (
                  <div key={dividend.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {dividend.project.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {dividend.project.company.tradeName || dividend.project.company.legalName}
                          {" · "}{dividend.resolutionRef}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          dividend.status === "paid"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : dividend.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-[#D9BFD4] bg-[#FCF8FB] text-[#541249]"
                        }
                      >
                        {statusLabel[dividend.status] || dividend.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Dividende total décidé</p>
                        <p className="tnum font-semibold">{fmtFCFA(dividend.totalDeclaredAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Part brute des investisseurs</p>
                        <p className="tnum font-semibold">{fmtFCFA(dividend.platformGrossAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Retenue déclarée</p>
                        <p className="tnum font-semibold">{fmtFCFA(dividend.withholdingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net à régler</p>
                        <p className="tnum font-semibold text-[#541249]">{fmtFCFA(dividend.netPayableAmount)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-[11px] text-muted-foreground">
                      Date de référence : {new Date(`${dividend.recordDate}T00:00:00Z`).toLocaleDateString("fr-FR")}
                      {" · "}{dividend.allocationCount} associé(s) inscrit(s)
                      {" · "}{dividend.ownershipPct.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} % du capital traité
                      {dividend.taxReference ? ` · Référence fiscale : ${dividend.taxReference}` : ""}
                    </div>

                    {dividend.status === "submitted" && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-950">
                          Vérifier la décision sociale, la date de référence et la retenue déclarée.
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void runDividendAction(dividend, "review")}
                          >
                            Valider le contrôle juridique
                          </Button>
                          <Input
                            value={dividendReasons[dividend.id] ?? ""}
                            onChange={(event) =>
                              setDividendReasons((current) => ({
                                ...current,
                                [dividend.id]: event.target.value,
                              }))
                            }
                            className="h-9 sm:max-w-sm"
                            placeholder="Motif précis si correction requise"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || !(dividendReasons[dividend.id] ?? "").trim()}
                            onClick={() => void runDividendAction(dividend, "reject")}
                          >
                            Demander une correction
                          </Button>
                        </div>
                      </div>
                    )}

                    {dividend.status === "reviewed" && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#D9BFD4] bg-[#FCF8FB] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[#541249]">Second contrôle obligatoire</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Un responsable différent confirme les montants avant d’autoriser le règlement.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void runDividendAction(dividend, "approve")}
                        >
                          Valider financièrement
                        </Button>
                      </div>
                    )}

                    {dividend.status === "approved" && (
                      <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                        Les contrôles sont terminés. L’entreprise peut maintenant régler le montant net via le prestataire autorisé.
                      </p>
                    )}

                    {dividend.status === "paid" && (
                      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                        Répartition terminée : {fmtFCFA(dividend.netAllocated)} crédités dans les portefeuilles des associés.
                      </p>
                    )}

                    {dividend.status === "rejected" && dividend.rejectionReason && (
                      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                        Correction demandée : {dividend.rejectionReason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Remboursements (empty state) */}
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
