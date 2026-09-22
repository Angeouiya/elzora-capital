"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtFCFA, fmtCompact, simulateDebtFinancing } from "@/lib/finance";
import { toast } from "@/hooks/use-toast";
import {
  Building2,
  Wallet,
  CalendarClock,
  Briefcase,
  ArrowRight,
  Plus,
  HandCoins,
  Info,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Landmark,
  Lock,
} from "lucide-react";

// 15 statuts du modèle Project (prisma/schema.prisma)
const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Brouillon", className: "bg-secondary text-muted-foreground" },
  submitted: {
    label: "Soumis",
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  under_review: {
    label: "En analyse",
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  complement_requested: {
    label: "Complément demandé",
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  rejected: { label: "Rejeté", className: "bg-[#FFF5F5] text-nexora-danger" },
  approved: { label: "Approuvé", className: "bg-nexora-pale text-positive" },
  offer_prepared: { label: "Offre préparée", className: "bg-nexora-pale text-positive" },
  offer_confirmed: { label: "Offre confirmée", className: "bg-nexora-pale text-positive" },
  published: { label: "Publié", className: "bg-nexora-pale text-positive" },
  funding: { label: "En collecte", className: "bg-nexora-pale text-positive" },
  funded: { label: "Financé", className: "bg-nexora-lime text-nexora-black" },
  repaying: { label: "Remboursement", className: "bg-nexora-lime text-nexora-black" },
  completed: { label: "Terminé", className: "bg-nexora-pale text-positive" },
  defaulted: { label: "Défaut", className: "bg-[#FFF5F5] text-nexora-danger" },
  closed: { label: "Clôturé", className: "bg-secondary text-muted-foreground" },
};

function NotLoggedIn() {
  const setView = useAppStore((s) => s.setView);
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nexora-pale">
          <Building2 className="h-7 w-7 text-positive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Espace entreprise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour accéder à l&apos;espace entreprise : vos dossiers,
          vos financements et le règlement de vos échéances.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => setView("login")} className="btn-nexora w-full">
            Se connecter
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView("register")}
            className="w-full"
          >
            Créer un compte entreprise
          </Button>
        </div>
      </div>
    </section>
  );
}

interface MembershipCompany {
  id: string;
  legalName: string;
  tradeName?: string | null;
  legalForm: string;
  country: string;
  activity: string;
  verificationStatus: string;
}
interface Membership {
  id: string;
  role: string;
  mandate: string;
  company: MembershipCompany;
}

interface CompanyProject {
  id: string;
  title: string;
  description: string;
  sector: string;
  country: string;
  city: string;
  instrumentType: string;
  fundingGoal: number;
  companyContribution: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  status: string;
  submittedAt: string | null;
  publishedAt: string | null;
  fundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: MembershipCompany;
  offer?: {
    id: string;
    fundingGoal: number;
    raisedAmount: number;
    committedAmount: number;
    backersCount: number;
    annualRate: number | null;
    ratePeriod: string | null;
    durationMonths: number | null;
    repaymentType: string | null;
    upfrontCommissionPct: number;
    annualFollowUpPct: number;
    status: string;
    closingDate: string;
    publishedAt: string;
  } | null;
}

interface CompanyPayment {
  id: string;
  projectId: string;
  installmentNo: number;
  dueDate: string;
  capitalDue: number;
  interestDue: number;
  followUpFeeDue: number;
  totalDue: number;
  status: string;
  paidAt: string | null;
  paidAmount: number;
  paymentRef: string | null;
}

interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    kycStatus: string;
  } | null;
  memberships: Membership[];
}

interface ProjectsResponse {
  projects: CompanyProject[];
}

interface PaymentsResponse {
  payments: CompanyPayment[];
  projects: { id: string; title: string; companyId: string }[];
}

export function CompanyDashboard() {
  const userEmail = useAppStore((s) => s.userEmail);
  const setView = useAppStore((s) => s.setView);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [payments, setPayments] = useState<CompanyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payDialogPayment, setPayDialogPayment] = useState<CompanyPayment | null>(null);
  const [declaringPayment, setDeclaringPayment] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json() as Promise<MeResponse>),
      fetch("/api/projects?mine=true").then((r) =>
        r.ok ? (r.json() as Promise<ProjectsResponse>) : { projects: [] }
      ),
      fetch("/api/company/payments").then((r) =>
        r.ok ? (r.json() as Promise<PaymentsResponse>) : { payments: [], projects: [] }
      ),
    ])
      .then(([meData, projData, payData]: [MeResponse, ProjectsResponse, PaymentsResponse]) => {
        setMe(meData);
        setProjects(projData.projects || []);
        setPayments(payData.payments || []);
        if (!selectedCompanyId && meData.memberships?.length > 0) {
          setSelectedCompanyId(meData.memberships[0].company.id);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Erreur réseau");
        setLoading(false);
      });
  }, [reloadKey, selectedCompanyId]);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    void fetchData();
  }, [userEmail, reloadKey, fetchData]);

  if (!userEmail) return <NotLoggedIn />;

  if (loading) {
    return (
      <div className="page-shell">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64" />
        <Skeleton className="mt-4 h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-nexora-danger/30 bg-[#FFF5F5] p-6">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-nexora-danger" />
          <p className="text-sm font-semibold text-nexora-danger">
            Impossible de charger votre espace entreprise
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </section>
    );
  }

  const memberships = me?.memberships ?? [];

  if (memberships.length === 0) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-border/60 bg-card p-8">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">
            Vous n&apos;êtes rattaché à aucune entreprise
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pour soumettre un dossier de financement, votre compte doit être
            lié à une entreprise vérifiée. Contactez notre équipe pour
            formaliser un rattachement.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setView("home")}
          >
            Retour à l&apos;accueil
          </Button>
        </div>
      </section>
    );
  }

  // Filtre les projets de la société sélectionnée
  const selectedMembership = memberships.find(
    (m) => m.company.id === selectedCompanyId
  );
  const selectedCompany = selectedMembership?.company;
  const companyProjects = selectedCompanyId
    ? projects.filter((p) => p.company?.id === selectedCompanyId)
    : projects;

  // 3 metrics max
  const activeProjects = companyProjects.filter(
    (p) => !["closed", "rejected", "defaulted"].includes(p.status)
  );
  const capitalFunded = companyProjects.reduce((sum, p) => {
    if (!p.offer) return sum;
    return sum + (p.offer.raisedAmount || 0);
  }, 0);

  // Prochaine échéance: among CompanyPayments for companyProjects, find earliest upcoming/due
  const companyProjectIds = new Set(companyProjects.map((p) => p.id));
  const companyPayments = payments.filter((p) => companyProjectIds.has(p.projectId));
  const upcomingPayments = companyPayments
    .filter((p) => ["upcoming", "due", "verifying"].includes(p.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextPayment = upcomingPayments[0] ?? null;

  const handleDeclarePayment = async () => {
    if (!payDialogPayment) return;
    setDeclaringPayment(true);
    try {
      const res = await fetch("/api/company/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payDialogPayment.id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        notice?: string;
        instructions?: { paymentRef?: string };
      };
      if (!res.ok) {
        toast({
          title: "Déclaration échouée",
          description: body?.error || "Réessayez ultérieurement.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Paiement déclaré",
        description: body?.notice || "Votre déclaration est enregistrée.",
      });
      if (body?.instructions?.paymentRef) {
        setPayDialogPayment({
          ...payDialogPayment,
          status: "verifying",
          paymentRef: body.instructions.paymentRef,
        });
      } else {
        setPayDialogOpen(false);
        setPayDialogPayment(null);
      }
      setReloadKey((k) => k + 1);
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Réessayez ultérieurement.",
        variant: "destructive",
      });
    } finally {
      setDeclaringPayment(false);
    }
  };

  return (
    <section className="page-shell reveal-in">
      {/* Header + context selector */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-nexora-black text-nexora-lime">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Espace entreprise
            </h1>
            <p className="text-xs text-muted-foreground">
              {selectedCompany
                ? `${selectedCompany.tradeName || selectedCompany.legalName} · ${selectedCompany.legalForm} · ${selectedCompany.country}`
                : "Sélectionnez une société"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCompanyId ?? undefined}
            onValueChange={(v) => setSelectedCompanyId(v)}
          >
            <SelectTrigger size="sm" className="w-[220px]">
              <SelectValue placeholder="Compte personnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Compte personnel</SelectItem>
              {memberships.map((m) => (
                <SelectItem key={m.company.id} value={m.company.id}>
                  {m.company.tradeName || m.company.legalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3 metrics max */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Prochaine échéance */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Prochaine échéance
            </span>
            <CalendarClock className="h-4 w-4 text-foreground" />
          </div>
          {nextPayment ? (
            <>
              <p className="tnum mt-2 text-xl font-bold text-foreground">
                {fmtFCFA(nextPayment.totalDue)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Échéance n°{nextPayment.installmentNo} ·{" "}
                {new Date(nextPayment.dueDate).toLocaleDateString("fr-FR")}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Aucune échéance
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Sera créée après financement complet
              </p>
            </>
          )}
        </Card>

        {/* 2. Dossiers actifs */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Dossiers actifs
            </span>
            <Briefcase className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {activeProjects.length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {companyProjects.length} dossier(s) au total
          </p>
        </Card>

        {/* 3. Capital financé */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Capital financé
            </span>
            <Wallet className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {fmtCompact(capitalFunded)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Collecté auprès des investisseurs
          </p>
        </Card>
      </div>

      {/* Nouveau dossier */}
      <div className="mt-6 flex justify-end">
        <Button
          className="btn-nexora"
          onClick={() => setView("company_submit")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau dossier
        </Button>
      </div>

      {/* Mes dossiers */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Briefcase className="h-4 w-4" />
          Mes dossiers
        </h2>
        {companyProjects.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Aucun dossier pour cette société
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Soumettez un premier dossier de financement.
            </p>
            <Button
              className="btn-nexora mt-4"
              size="sm"
              onClick={() => setView("company_submit")}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Soumettre un dossier
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {companyProjects.map((p) => {
              const sm = STATUS_META[p.status] || {
                label: p.status,
                className: "bg-secondary text-muted-foreground",
              };
              const hasOffer = !!p.offer;
              const fundingPct =
                hasOffer && p.offer!.fundingGoal > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (p.offer!.raisedAmount / p.offer!.fundingGoal) * 100
                      )
                    )
                  : 0;
              const isDebt = p.instrumentType === "debt";
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.sector} · {p.city}, {p.country}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={sm.className}>{sm.label}</Badge>
                        <Badge variant="outline">
                          {isDebt ? "Dette" : "Capital"}
                        </Badge>
                        <span className="tnum text-[11px] text-muted-foreground">
                          Objectif {fmtCompact(p.fundingGoal)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">
                        Soumis le
                      </p>
                      <p className="tnum text-xs font-medium text-foreground">
                        {p.submittedAt
                          ? new Date(p.submittedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Funding progress if published */}
                  {hasOffer && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Collecte
                        </span>
                        <span className="tnum font-medium text-foreground">
                          {fundingPct}% · {fmtCompact(p.offer!.raisedAmount)}
                        </span>
                      </div>
                      <Progress value={fundingPct} className="h-2" />
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {p.offer!.backersCount}{" "}
                          {p.offer!.backersCount > 1 ? "souscripteurs" : "souscripteur"}
                        </span>
                        <span>
                          Clôture{" "}
                          {new Date(p.offer!.closingDate).toLocaleDateString(
                            "fr-FR"
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mes financements — repayment schedule for funded/repaying projects */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <HandCoins className="h-4 w-4" />
          Mes financements
        </h2>

        {/* Notice: pas d'accès aux données investisseurs */}
        <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-secondary/60 p-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Vous n&apos;avez pas accès aux données personnelles des
            investisseurs. Les remboursements sont à effectuer globalement
            (capital + intérêts + suivi) via le compte séquestre NEXORA.
          </p>
        </div>

        {companyProjects.filter(
          (p) => p.offer && p.instrumentType === "debt"
        ).length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Aucun financement actif. Vos échéances apparaîtront ici une fois
            votre offre financée.
          </Card>
        ) : (
          <div className="space-y-4">
            {companyProjects
              .filter((p) => p.offer && p.instrumentType === "debt")
              .map((p) => {
                const sim = simulateDebtFinancing({
                  principal: BigInt(p.offer!.fundingGoal),
                  annualRate: p.offer!.annualRate ?? 0,
                  ratePeriod:
                    (p.offer!.ratePeriod as "total" | "annual") || "total",
                  durationMonths: p.offer!.durationMonths ?? 0,
                  repaymentType:
                    (p.offer!.repaymentType as "bullet" | "amortized") ||
                    "bullet",
                  upfrontCommissionPct: p.offer!.upfrontCommissionPct,
                  annualFollowUpPct: p.offer!.annualFollowUpPct,
                });
                // For each project, find associated CompanyPayments
                const projPayments = companyPayments.filter(
                  (cp) => cp.projectId === p.id
                );
                const isFunded = ["funded", "repaying", "completed"].includes(
                  p.status
                );
                const statusMeta = STATUS_META[p.status] || {
                  label: p.status,
                  className: "bg-secondary text-muted-foreground",
                };
                return (
                  <Card key={p.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {p.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {(p.offer!.repaymentType || "bullet") === "bullet"
                            ? "Remboursement in fine"
                            : "Remboursement amortissable"}{" "}
                          · {p.offer!.durationMonths} mois
                        </p>
                      </div>
                      <Badge className={statusMeta.className}>
                        {statusMeta.label}
                      </Badge>
                    </div>

                    {/* Schedule CARD (mobile-friendly) */}
                    <div className="rounded-md border border-border/60 bg-secondary/40 p-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Capital
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {fmtFCFA(sim.principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Intérêts
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {fmtFCFA(sim.investorInterest)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Suivi plateforme
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {fmtFCFA(sim.followUpCommission)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Total à régler
                          </p>
                          <p className="tnum mt-0.5 text-sm font-bold text-foreground">
                            {fmtFCFA(sim.totalCompanyPayment)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 border-t border-border/60 pt-2">
                        <p className="text-[11px] text-muted-foreground">
                          Échéance unique (bullet) — paiement global à effectuer
                          à la fin de la période de{" "}
                          {p.offer!.durationMonths} mois.
                        </p>
                      </div>
                    </div>

                    {/* Régler l'échéance — button only when there's an existing CompanyPayment */}
                    <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {projPayments.length > 0 ? (
                        <>
                          <div className="text-xs text-muted-foreground">
                            {projPayments[0].status === "paid" ? (
                              <span className="flex items-center gap-1 text-positive">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Échéance réglée
                              </span>
                            ) : projPayments[0].status === "verifying" ? (
                              <span className="flex items-center gap-1 text-[#8a6d00]">
                                <Info className="h-3.5 w-3.5" />
                                Paiement déclaré — en cours de vérification
                              </span>
                            ) : (
                              <span>
                                Échéance n°{projPayments[0].installmentNo} ·{" "}
                                {new Date(
                                  projPayments[0].dueDate
                                ).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                          {projPayments[0].status !== "paid" &&
                            projPayments[0].status !== "verifying" && (
                              <Button
                                size="sm"
                                className="btn-nexora"
                                onClick={() => {
                                  setPayDialogPayment(projPayments[0]);
                                  setPayDialogOpen(true);
                                }}
                              >
                                <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                Régler l&apos;échéance
                              </Button>
                            )}
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground">
                            {!isFunded
                              ? "L'échéance sera créée après financement complet de l'offre."
                              : "Aucune échéance déclarée pour ce dossier."}
                          </div>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    className="btn-nexora opacity-50"
                                    disabled
                                  >
                                    <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                    Régler l&apos;échéance
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  {!isFunded
                                    ? "L'offre n'est pas encore financée. L'échéance sera créée automatiquement une fois le financement complet."
                                    : "L'échéance n'est pas encore disponible. Contactez notre équipe."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Régler l'échéance — dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Régler une échéance
            </DialogTitle>
            <DialogDescription>
              Effectuez un virement global (capital + intérêts + suivi
              plateforme) vers le compte séquestre NEXORA. Puis déclarez votre
              paiement pour vérification.
            </DialogDescription>
          </DialogHeader>

          {payDialogPayment && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-secondary/40 p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Capital
                    </p>
                    <p className="tnum text-sm font-semibold text-foreground">
                      {fmtFCFA(payDialogPayment.capitalDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Intérêts
                    </p>
                    <p className="tnum text-sm font-semibold text-foreground">
                      {fmtFCFA(payDialogPayment.interestDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Suivi
                    </p>
                    <p className="tnum text-sm font-semibold text-foreground">
                      {fmtFCFA(payDialogPayment.followUpFeeDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total
                    </p>
                    <p className="tnum text-sm font-bold text-foreground">
                      {fmtFCFA(payDialogPayment.totalDue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border p-3 text-xs">
                <p className="font-medium text-foreground">
                  Coordonnées de paiement
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    Bénéficiaire :{" "}
                    <span className="font-medium text-foreground">
                      NEXORA Capital — Compte séquestre
                    </span>
                  </li>
                  <li>
                    IBAN :{" "}
                    <span className="tnum font-medium text-foreground">
                      SN12 0060 0000 1234 5678 9012
                    </span>
                  </li>
                  <li>
                    Banque : Banque de l&apos;Afrique Occidentale (BAO)
                  </li>
                  <li className="text-nexora-danger">
                    DÉMONSTRATION — IBAN fictif, n&apos;effectuez aucun virement
                    réel.
                  </li>
                </ul>
              </div>

              {payDialogPayment.paymentRef && (
                <div className="rounded-md border border-border p-3 text-xs">
                  <p className="text-muted-foreground">
                    Référence unique à indiquer dans le libellé du virement :
                  </p>
                  <p className="tnum mt-1 font-mono text-sm font-semibold text-foreground">
                    {payDialogPayment.paymentRef}
                  </p>
                </div>
              )}

              <div className="rounded-md bg-nexora-pale p-3">
                <p className="text-[11px] leading-relaxed text-positive">
                  Paiement à effectuer globalement. L&apos;échéance n&apos;est
                  pas réglée tant que le paiement n&apos;est pas confirmé par
                  notre équipe. Vous recevrez une notification de confirmation.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPayDialogOpen(false);
                setPayDialogPayment(null);
              }}
              disabled={declaringPayment}
            >
              {payDialogPayment?.paymentRef ? "Fermer" : "Annuler"}
            </Button>
            {payDialogPayment && !payDialogPayment.paymentRef && (
              <Button
                className="btn-nexora"
                onClick={handleDeclarePayment}
                disabled={declaringPayment}
              >
                {declaringPayment ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "J'ai effectué le paiement"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demo notice */}
      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Mode démonstration — données fictives. Les échéances et paiements sont
        simulés.
      </p>
    </section>
  );
}
