"use client";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { fmtCompact, fmtFCFA } from "@/lib/finance";
import { TRANSITIONS, canActorTransition } from "@/lib/workflow";
import {
  RegulatoryReviewDialog,
  type AdminRegulatoryReview,
} from "@/components/admin/regulatory-review-dialog";
import {
  FileSearch,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileQuestion,
  Send,
  BriefcaseBusiness,
  Calendar,
  AlertCircle,
  Eye,
  Coins,
  PauseCircle,
  CheckCheck,
  Banknote,
  Scale,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProjectEventRow {
  id: string;
  eventType: string;
  description: string;
  actor: string;
  createdAt: string;
}

interface OfferInline {
  id: string;
  status: string;
  publishedAt: string;
  closingDate: string;
  raisedAmount: number;
  fundingGoal: number;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  longDescription: string;
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
  fundingPurpose: string | null;
  businessModel: string | null;
  marketOverview: string | null;
  competitiveAdvantage: string | null;
  traction: string | null;
  managementTeam: Array<{ fullName: string; role: string; experience: string }>;
  employeeCount: number | null;
  financialYear: number | null;
  annualRevenue: number | null;
  previousRevenue: number | null;
  netIncome: number | null;
  cashBalance: number | null;
  existingDebt: number | null;
  annualOperatingExpenses: number | null;
  useOfFunds: Array<{ label: string; amount: number }>;
  milestones: Array<{ title: string; targetDate: string; outcome: string }>;
  repaymentSource: string | null;
  guaranteeDescription: string | null;
  shareholderStructure: string | null;
  risksIdentified: string | null;
  impactObjectives: string | null;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  fundedAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  analysisNote: string | null;
  createdAt: string;
  company: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    legalForm: string;
    verificationStatus: string;
    country: string;
  };
  timeline?: ProjectEventRow[];
  offer?: OfferInline | null;
  regulatoryReview: AdminRegulatoryReview | null;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    contentType: string | null;
    size: number | null;
    uploadedAt: string;
  }>;
}

interface AnalysisResponse {
  projects?: ProjectRow[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Métadonnée par statut (15 statuts)
// ---------------------------------------------------------------------------
const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Brouillon", color: "#6b6b6b", bg: "#F5F5F3" },
  submitted: { label: "Soumis", color: "#FFFFFF", bg: "#6b6b6b" },
  under_review: { label: "En analyse", color: "#92400e", bg: "#FEF3C7" },
  complement_requested: { label: "Complément demandé", color: "#9a3412", bg: "#FFEDD5" },
  rejected: { label: "Rejeté", color: "#C62828", bg: "#FFF5F5" },
  approved: { label: "Approuvé", color: "#6C195E", bg: "#F7EAF5" },
  offer_prepared: { label: "Offre préparée", color: "#6C195E", bg: "#F7EAF5" },
  offer_confirmed: { label: "Offre confirmée", color: "#6C195E", bg: "#F7EAF5" },
  published: { label: "Publié", color: "#6C195E", bg: "#F2E1EF" },
  funding: { label: "En collecte", color: "#FFFFFF", bg: "#541249" },
  funded: { label: "Financé", color: "#6C195E", bg: "#F7EAF5" },
  repaying: { label: "En remboursement", color: "#6C195E", bg: "#F7EAF5" },
  completed: { label: "Terminé", color: "#6C195E", bg: "#F2E1EF" },
  defaulted: { label: "En défaut", color: "#C62828", bg: "#FFF5F5" },
  closed: { label: "Clôturé", color: "#6b6b6b", bg: "#F5F5F3" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    color: "#6b6b6b",
    bg: "#F5F5F3",
  };
  return (
    <Badge
      style={{ backgroundColor: meta.bg, color: meta.color }}
      className="border-0 text-xs font-medium"
    >
      {meta.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Métadonnée par transition cible (icône + libellé + style bouton + note requise ?)
// ---------------------------------------------------------------------------
interface TargetMeta {
  label: string;
  icon: LucideIcon;
  btnClass: string;
  noteRequired: boolean;
  promptLabel: string;
  promptPlaceholder: string;
}

const TARGET_META: Record<string, TargetMeta> = {
  submitted: {
    label: "Soumettre",
    icon: Send,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Note interne…",
  },
  under_review: {
    label: "Démarrer l&rsquo;analyse",
    icon: FileSearch,
    btnClass: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Éléments à vérifier en priorité…",
  },
  complement_requested: {
    label: "Demander complément",
    icon: FileQuestion,
    btnClass: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    noteRequired: true,
    promptLabel: "Précisez les éléments manquants",
    promptPlaceholder:
      "Ex : bilan 2023, Kbis récent, projection de trésorerie mensuelle…",
  },
  approved: {
    label: "Approuver",
    icon: CheckCircle2,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note interne (optionnelle)",
    promptPlaceholder: "Recommandation d&rsquo;analyse, conditions éventuelles…",
  },
  rejected: {
    label: "Refuser",
    icon: XCircle,
    btnClass: "bg-[#FFF5F5] text-nexora-danger hover:bg-[#FFE5E5]",
    noteRequired: true,
    promptLabel: "Motif du refus",
    promptPlaceholder: "Motif principal de rejet du dossier…",
  },
  offer_prepared: {
    label: "Préparer l&rsquo;offre",
    icon: FileQuestion,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Conditions finales figées…",
  },
  offer_confirmed: {
    label: "Confirmer l&rsquo;offre",
    icon: CheckCircle2,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Conditions confirmées par l&rsquo;entreprise…",
  },
  published: {
    label: "Publier l&rsquo;offre",
    icon: Send,
    btnClass: "btn-nexora",
    noteRequired: false,
    promptLabel: "Note de publication (optionnelle)",
    promptPlaceholder: "Décision du comité, date d&rsquo;ouverture effective…",
  },
  funding: {
    label: "Ouvrir la collecte",
    icon: Banknote,
    btnClass: "btn-nexora",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Ouverture de la collecte…",
  },
  funded: {
    label: "Marquer financé",
    icon: Coins,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Capital atteint…",
  },
  repaying: {
    label: "Démarrer remboursement",
    icon: Banknote,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Échéancier transmis à l&rsquo;entreprise…",
  },
  completed: {
    label: "Marquer terminé",
    icon: CheckCheck,
    btnClass: "bg-nexora-pale text-positive hover:bg-nexora-pale/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Fin du cycle de remboursement…",
  },
  defaulted: {
    label: "Déclarer le défaut",
    icon: AlertCircle,
    btnClass: "bg-[#FFF5F5] text-nexora-danger hover:bg-[#FFE5E5]",
    noteRequired: true,
    promptLabel: "Motif du défaut",
    promptPlaceholder: "Échéances impayées, procédure de recouvrement…",
  },
  closed: {
    label: "Clôturer",
    icon: PauseCircle,
    btnClass: "bg-secondary text-foreground hover:bg-secondary/80",
    noteRequired: false,
    promptLabel: "Note (optionnelle)",
    promptPlaceholder: "Motif de clôture…",
  },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminAnalysis() {
  const adminRole = useAppStore((s) => s.adminRole) || "analyst";
  const openOffer = useAppStore((s) => s.openOffer);
  const [refetchKey, setRefetchKey] = useState(0);
  const { data, loading, error } = useFetch<AnalysisResponse>(
    `/api/admin/analysis${refetchKey ? `?r=${refetchKey}` : ""}`
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [action, setAction] = useState<{
    target: string;
    project: ProjectRow;
  } | null>(null);
  const [reviewProject, setReviewProject] = useState<ProjectRow | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const projects = useMemo(() => {
    if (!data?.projects) return [];
    const list = [...data.projects];
    if (filter !== "all") {
      return list.filter((p) => p.status === filter);
    }
    return list;
  }, [data, filter]);

  // Pour chaque projet, on calcule la liste des transitions valides + autorisées
  // pour le rôle courant. Permet d&rsquo;afficher UNIQUEMENT les boutons pertinents.
  const computeAllowedTargets = (currentStatus: string): string[] => {
    const targets = TRANSITIONS[currentStatus] || [];
    return targets.filter((t) => canActorTransition(currentStatus, t, adminRole));
  };

  const handleConfirmAction = async () => {
    if (!action) return;
    const cfg = TARGET_META[action.target];
    if (!cfg) return;
    if (cfg.noteRequired && !note.trim()) {
      toast({
        title: "Note requise",
        description: "Une note est obligatoire pour cette transition.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/analysis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: action.project.id,
          targetStatus: action.target,
          note: note.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => null)) as
        | { error?: string; missing?: string[] }
        | null;
      if (!res.ok) {
        // Messages d&rsquo;erreur précis selon 400/403
        if (res.status === 403) {
          toast({
            title: "Transition non autorisée",
            description:
              j?.error || "Votre rôle ne permet pas cette transition.",
            variant: "destructive",
          });
        } else if (res.status === 409) {
          toast({
            title: "Cadre de publication incomplet",
            description: j?.missing?.length
              ? `À compléter : ${j.missing.join(", ")}.`
              : j?.error || "Terminez la revue avant de poursuivre.",
            variant: "destructive",
          });
        } else if (res.status === 400) {
          toast({
            title: "Décision indisponible",
            description:
              j?.error || "Cette décision n’est pas disponible à cette étape.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Échec de l&rsquo;action",
            description: j?.error || `Erreur ${res.status}`,
            variant: "destructive",
          });
        }
        setSubmitting(false);
        return;
      }
      toast({
        title: "Action enregistrée",
        description: `« ${action.project.title} » → ${cfg.label.toLowerCase()}. Journal d&rsquo;audit mis à jour.`,
      });
      setAction(null);
      setNote("");
      setRefetchKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Erreur réseau",
        description: e instanceof Error ? e.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="mb-6 h-9 w-72" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm text-nexora-danger">
        Erreur : {error}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Analyse des dossiers
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivez l’étude, la décision, la publication et le financement de chaque dossier.
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger size="sm" className="w-full sm:w-56">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="submitted">Soumis</SelectItem>
            <SelectItem value="under_review">En analyse</SelectItem>
            <SelectItem value="complement_requested">Complément demandé</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="offer_prepared">Offre préparée</SelectItem>
            <SelectItem value="offer_confirmed">Offre confirmée</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="funding">En collecte</SelectItem>
            <SelectItem value="funded">Financé</SelectItem>
            <SelectItem value="repaying">En remboursement</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="defaulted">En défaut</SelectItem>
            <SelectItem value="closed">Clôturé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notice séparation des devoirs */}
      <div className="mb-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          L&rsquo;analyste recommande, le comité décide. Chaque transition est
          filtrée par votre rôle ({adminRole}) et tracée dans le journal d&rsquo;audit.
        </p>
      </div>

      {/* Liste des projets */}
      <div className="space-y-2">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <FileSearch className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            Aucun dossier pour ce filtre.
          </Card>
        ) : (
          projects.map((p) => {
            const isOpen = expanded === p.id;
            const company = p.company?.tradeName || p.company?.legalName || "—";
            const allowedTargets = computeAllowedTargets(p.status);
            const isFinal = p.status === "closed" || p.status === "rejected";
            const hasOffer = !!p.offer;

            return (
              <Card key={p.id} className="overflow-hidden p-0">
                {/* Row */}
                <button
                  data-control="accordion"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="shrink-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <StatusBadge status={p.status} />
                      {hasOffer && (
                        <Badge className="border-0 bg-nexora-lime text-[10px] text-nexora-black">
                          Offre créée
                        </Badge>
                      )}
                      {p.regulatoryReview?.complete ? (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800">
                          Cadre confirmé
                        </Badge>
                      ) : p.regulatoryReview?.decision === "blocked" ? (
                        <Badge className="border border-red-200 bg-red-50 text-[10px] text-red-800">
                          Publication suspendue
                        </Badge>
                      ) : (
                        <Badge className="border border-amber-200 bg-amber-50 text-[10px] text-amber-900">
                          Cadre à compléter
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <BriefcaseBusiness className="h-3 w-3" />
                      {company}
                      <span className="text-border">·</span>
                      <span>{p.sector}</span>
                      <span className="text-border">·</span>
                      <span>{p.country}</span>
                      <span className="text-border">·</span>
                      <span className="tnum">{fmtCompact(p.fundingGoal)}</span>
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                    Soumis le
                    <p className="tnum font-medium text-foreground">
                      {fmtDate(p.submittedAt)}
                    </p>
                  </div>
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="border-t border-border/60 bg-secondary/20 p-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {/* Identité projet */}
                      <div className="lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Présentation
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                          {p.longDescription || p.description || "—"}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Instrument
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-foreground">
                              {p.instrumentType === "equity" ? "Action" : "Dette"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Objectif
                            </p>
                            <p className="tnum mt-0.5 text-sm font-medium text-foreground">
                              {fmtFCFA(p.fundingGoal)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Apport entreprise
                            </p>
                            <p className="tnum mt-0.5 text-sm font-medium text-foreground">
                              {fmtFCFA(p.companyContribution || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {p.instrumentType === "equity"
                                ? "Capital offert"
                                : "Durée"}
                            </p>
                            <p className="tnum mt-0.5 text-sm font-medium text-foreground">
                              {p.instrumentType === "equity"
                                ? "—"
                                : p.durationMonths
                                ? `${p.durationMonths} mois`
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <details open className="mt-4 overflow-hidden rounded-xl border border-[#541249]/10 bg-background">
                          <summary className="cursor-pointer bg-[#faf6f9] px-4 py-3 text-sm font-semibold text-[#541249]">
                            Dossier complet de l’entreprise
                          </summary>
                          <div className="space-y-5 p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <AdminTextBlock title="Modèle économique" text={p.businessModel} />
                              <AdminTextBlock title="Marché et clients" text={p.marketOverview} />
                              <AdminTextBlock title="Avantage concurrentiel" text={p.competitiveAdvantage} />
                              <AdminTextBlock title="Résultats obtenus" text={p.traction} />
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Équipe dirigeante · {p.employeeCount ?? 0} collaborateurs
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {(p.managementTeam || []).map((member, index) => (
                                  <div key={member.fullName + index} className="rounded-lg border border-border/60 p-3">
                                    <p className="text-sm font-semibold text-foreground">{member.fullName}</p>
                                    <p className="mt-0.5 text-xs font-medium text-[#541249]">{member.role}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{member.experience}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Chiffres de l’exercice {p.financialYear || "—"}
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <AdminMetric label="Chiffre d’affaires" value={p.annualRevenue} />
                                <AdminMetric label="Exercice précédent" value={p.previousRevenue} />
                                <AdminMetric label="Résultat net" value={p.netIncome} />
                                <AdminMetric label="Dépenses annuelles" value={p.annualOperatingExpenses} />
                                <AdminMetric label="Trésorerie" value={p.cashBalance} />
                                <AdminMetric label="Dettes en cours" value={p.existingDebt} />
                              </div>
                            </div>

                            <AdminTextBlock title="Objectif du financement" text={p.fundingPurpose} />

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilisation des fonds</p>
                                <div className="mt-2 space-y-1.5">
                                  {(p.useOfFunds || []).map((item, index) => (
                                    <div key={item.label + index} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                                      <span className="text-foreground">{item.label}</span>
                                      <strong className="tnum shrink-0">{fmtFCFA(item.amount)}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Étapes prévues</p>
                                <div className="mt-2 space-y-1.5">
                                  {(p.milestones || []).map((item, index) => (
                                    <div key={item.title + index} className="rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                                      <div className="flex items-center justify-between gap-3">
                                        <strong className="text-foreground">{item.title}</strong>
                                        <span className="tnum shrink-0 text-muted-foreground">{fmtDate(item.targetDate)}</span>
                                      </div>
                                      <p className="mt-1 leading-relaxed text-muted-foreground">{item.outcome}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              {p.instrumentType === "debt" ? (
                                <>
                                  <AdminTextBlock title="Source de remboursement" text={p.repaymentSource} />
                                  <AdminTextBlock title="Garanties proposées" text={p.guaranteeDescription} />
                                </>
                              ) : (
                                <AdminTextBlock title="Répartition du capital" text={p.shareholderStructure} />
                              )}
                              <AdminTextBlock title="Risques et mesures prévues" text={p.risksIdentified} />
                              {p.impactObjectives && <AdminTextBlock title="Retombées attendues" text={p.impactObjectives} />}
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Pièces déposées ({p.documents?.length || 0})
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(p.documents || []).map((document) => (
                                  <a
                                    key={document.id}
                                    href={document.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-full border border-[#541249]/15 bg-white px-3 py-2 text-xs font-medium text-[#541249] hover:bg-[#f8f0f6]"
                                  >
                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    {document.fileName}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        </details>

                        {/* Offre créée — lien */}
                        {hasOffer && p.offer && (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-nexora-lime/40 bg-nexora-pale p-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" />
                            <p className="flex-1 text-xs text-positive">
                              Offre publiée le{" "}
                              <span className="tnum font-medium">
                                {fmtDate(p.offer.publishedAt)}
                              </span>{" "}
                              — clôture le{" "}
                              <span className="tnum font-medium">
                                {fmtDate(p.offer.closingDate)}
                              </span>
                              . Levé :{" "}
                              <span className="tnum font-bold">
                                {fmtCompact(p.offer.raisedAmount)}
                              </span>{" "}
                              / {fmtCompact(p.offer.fundingGoal)}.
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-positive hover:bg-nexora-pale/80"
                              onClick={() => openOffer(p.offer!.id)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Voir l&rsquo;offre
                            </Button>
                          </div>
                        )}

                        {/* Chronologie complète (timeline) */}
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Chronologie du dossier (
                          <span className="tnum">
                            {p.timeline?.length || 0}
                          </span>{" "}
                          événements)
                        </p>
                        <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-2 text-xs scroll-area-fancy">
                          {p.timeline && p.timeline.length > 0 ? (
                            p.timeline.map((ev) => (
                              <li
                                key={ev.id}
                                className="flex items-start gap-2 rounded-md bg-background px-2.5 py-2"
                              >
                                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-foreground">
                                    <span className="font-medium">
                                      {STATUS_META[ev.eventType]?.label || ev.eventType}
                                    </span>
                                    {" — "}
                                    <span className="text-muted-foreground">
                                      {ev.description}
                                    </span>
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    <span className="tnum">
                                      {fmtDate(ev.createdAt)}
                                    </span>{" "}
                                    · acteur :{" "}
                                    <span className="font-mono">{ev.actor}</span>
                                  </p>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="rounded-md bg-background px-2.5 py-2 text-muted-foreground">
                              Aucun événement tracé.
                            </li>
                          )}
                        </ul>

                        {p.analysisNote && (
                          <div className="mt-3 rounded-md border border-border/60 bg-background p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Note d&rsquo;analyse
                            </p>
                            <p className="mt-1 text-xs leading-snug text-foreground">
                              {p.analysisNote}
                            </p>
                          </div>
                        )}
                        {p.rejectionReason && (
                          <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-nexora bg-[#FFF5F5] p-2.5">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nexora-danger" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-nexora-danger">
                                Motif de rejet
                              </p>
                              <p className="mt-0.5 text-xs leading-snug text-foreground">
                                {p.rejectionReason}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1">
                        <div
                          className={`mb-4 rounded-xl border p-3 ${
                            p.regulatoryReview?.complete
                              ? "border-emerald-200 bg-emerald-50/70"
                              : p.regulatoryReview?.decision === "blocked"
                                ? "border-red-200 bg-red-50/70"
                                : "border-amber-200 bg-amber-50/70"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {p.regulatoryReview?.complete ? (
                              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            ) : (
                              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground">
                                Cadre de publication
                              </p>
                              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                {p.regulatoryReview?.complete
                                  ? "Les éléments requis sont confirmés."
                                  : p.regulatoryReview?.decision === "blocked"
                                    ? "La publication est suspendue dans l’attente d’une décision."
                                    : p.regulatoryReview?.missing?.length
                                      ? `${p.regulatoryReview.missing.length} élément${
                                          p.regulatoryReview.missing.length > 1 ? "s" : ""
                                        } à compléter.`
                                      : "La revue doit être préparée avant l’approbation."}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 w-full bg-white/80"
                            onClick={() => setReviewProject(p)}
                          >
                            <Scale className="mr-2 h-4 w-4" />
                            Examiner le cadre
                          </Button>
                        </div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Actions valides
                        </p>
                        <div className="flex flex-col gap-2">
                          {allowedTargets.length > 0 ? (
                            allowedTargets.map((target) => {
                              const cfg = TARGET_META[target];
                              if (!cfg) return null;
                              const Icon = cfg.icon;
                              const needsClearance = ["approved", "published"].includes(target);
                              const clearanceMissing =
                                needsClearance && !p.regulatoryReview?.complete;
                              return (
                                <Button
                                  key={target}
                                  size="sm"
                                  className={cfg.btnClass}
                                  disabled={clearanceMissing}
                                  title={
                                    clearanceMissing
                                      ? "Terminez d’abord la revue du cadre de publication."
                                      : undefined
                                  }
                                  onClick={() => {
                                    setAction({ target, project: p });
                                    setNote("");
                                  }}
                                >
                                  <Icon className="mr-2 h-4 w-4" />
                                  {cfg.label}
                                  {cfg.noteRequired && (
                                    <span className="ml-1 text-[10px] opacity-70">
                                      (note requise)
                                    </span>
                                  )}
                                </Button>
                              );
                            })
                          ) : (
                            <div className="rounded-md border border-border/60 bg-background p-3 text-xs text-muted-foreground">
                              Ce dossier est dans un état final{" "}
                              <span className="font-medium text-foreground">
                                ({STATUS_META[p.status]?.label || p.status}).
                              </span>{" "}
                              Aucune action possible depuis votre rôle.
                            </div>
                          )}
                          {isFinal && (
                            <div className="rounded-md border border-border/60 bg-background p-3 text-[11px] text-muted-foreground">
                              État terminal — dossier clos.
                            </div>
                          )}
                        </div>

                        {/* Avertissement séparation de devoirs */}
                        <div className="mt-3 flex items-start gap-1.5 rounded-md bg-secondary/60 p-2.5">
                          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            Les transitions sont filtrées par votre rôle. Le
                            comité de validation doit contre-signer toute
                            décision de publication.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Action dialog */}
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action && (() => {
                const Icon = TARGET_META[action.target]?.icon;
                return Icon ? <Icon className="h-4 w-4" /> : null;
              })()}
              {action ? TARGET_META[action.target]?.label : ""}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {action?.project.title} — confirmez la décision pour ce dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-note" className="text-xs">
              {action ? TARGET_META[action.target]?.promptLabel : ""}
            </Label>
            <Textarea
              id="action-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action ? TARGET_META[action.target]?.promptPlaceholder : ""
              }
              rows={4}
              className="text-sm"
            />
            {action?.target &&
              TARGET_META[action.target]?.noteRequired &&
              !note.trim() && (
                <p className="text-[11px] text-nexora-danger">
                  Une note est obligatoire pour cette transition.
                </p>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAction(null);
                setNote("");
              }}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="btn-nexora"
              disabled={
                submitting ||
                (!!action?.target &&
                  TARGET_META[action.target]?.noteRequired &&
                  !note.trim())
              }
              onClick={handleConfirmAction}
            >
              {submitting
                ? "Enregistrement…"
                : action
                ? `Confirmer — ${TARGET_META[action.target]?.label}`
                : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewProject ? (
        <RegulatoryReviewDialog
          open
          onOpenChange={(open) => {
            if (!open) setReviewProject(null);
          }}
          projectId={reviewProject.id}
          projectTitle={reviewProject.title}
          review={reviewProject.regulatoryReview}
          onSaved={() => {
            setReviewProject(null);
            setRefetchKey((key) => key + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function AdminTextBlock({ title, text }: { title: string; text: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">{text || "—"}</p>
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tnum mt-1 text-sm font-semibold text-foreground">{fmtFCFA(value || 0)}</p>
    </div>
  );
}
