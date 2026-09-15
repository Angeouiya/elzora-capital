"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  Landmark,
  LoaderCircle,
  Plus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFCFA, formatRate } from "@/lib/calculations";

interface Company {
  id: string;
  name: string;
  sector: string;
  legalForm: string;
  status: string;
}

interface Offer {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  targetAmount: number;
  collectedAmount: number;
  investorCount: number;
  status: string;
}

interface Project {
  id: string;
  title: string;
  sector: string;
  city?: string | null;
  status: string;
  requestedAmount: number;
  createdAt: string;
}

interface ProjectDetail extends Project {
  offer: Offer | null;
}

interface Repayment {
  id: string;
  offerId: string;
  scheduleDate: string;
  capitalAmount: number;
  interestAmount: number;
  feeAmount: number;
  status: string;
  paidAmount: number;
}

/** Texte explicatif par statut de dossier : où en suis-je / que se passera-t-il ensuite */
const PROJECT_STATUS_INFO: Record<string, string> = {
  DRAFT: "Brouillon — finalisez et soumettez-le pour lancer l'analyse.",
  SUBMITTED: "Dossier reçu par l'équipe d'analyse. Réponse généralement sous 5 jours ouvrés.",
  UNDER_REVIEW: "Votre dossier est en cours d'analyse par le comité des risques.",
  COMPLEMENT_REQUESTED: "L'équipe d'analyse attend des pièces complémentaires de votre part.",
  APPROVED: "Dossier approuvé ! Confirmez les conditions pour publier l'offre.",
  REJECTED: "Dossier non retenu. Vous pouvez déposer un nouveau projet.",
  PUBLISHED: "Offre publiée : les investisseurs peuvent souscrire.",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EntrepriseDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Société + dossiers
        const [companiesRes, projectsRes] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/projects"),
        ]);
        if (!companiesRes.ok || !projectsRes.ok) {
          throw new Error("Impossible de charger vos données. Vérifiez votre connexion.");
        }
        const companies: Company[] = await companiesRes.json();
        const baseProjects: Project[] = await projectsRes.json();
        if (cancelled) return;

        setCompany(companies[0] ?? null);

        // 2. Détails de chaque dossier (avec l'offre éventuelle)
        const details = await Promise.all(
          baseProjects.map(async (p) => {
            const res = await fetch(`/api/projects/${p.id}`);
            if (!res.ok) return { ...p, offer: null } as ProjectDetail;
            return (await res.json()) as ProjectDetail;
          })
        );
        if (cancelled) return;
        setProjects(details);

        const titles: Record<string, string> = {};
        details.forEach((d) => {
          if (d.offer) titles[d.offer.id] = d.title;
        });
        setProjectTitles(titles);

        // 3. Échéances de remboursement pour chaque offre
        const offers = details.map((d) => d.offer).filter((o): o is Offer => o !== null);
        const repaymentLists = await Promise.all(
          offers.map(async (offer) => {
            const res = await fetch(`/api/repayments?offerId=${offer.id}`);
            if (!res.ok) return [] as Repayment[];
            return (await res.json()) as Repayment[];
          })
        );
        if (cancelled) return;
        setRepayments(repaymentLists.flat());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Indicateurs ---------- */

  const offers = projects.map((p) => p.offer).filter((o): o is Offer => o !== null);
  const totalFinanced = offers.reduce((sum, o) => sum + o.collectedAmount, 0);
  const remainingDue = repayments
    .filter((r) => r.status !== "PAID")
    .reduce((sum, r) => sum + (r.capitalAmount + r.interestAmount + r.feeAmount - r.paidAmount), 0);
  const lateCount = repayments.filter((r) => r.status === "LATE").length;
  const defaultRate =
    repayments.length > 0 ? Math.round((lateCount / repayments.length) * 1000) / 10 : 0;

  const openRepayments = repayments
    .filter((r) => r.status !== "PAID")
    .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime());
  const nextRepayment = openRepayments[0] ?? null;
  const nextRepaymentTotal = nextRepayment
    ? nextRepayment.capitalAmount + nextRepayment.interestAmount + nextRepayment.feeAmount
    : 0;
  const lateRepayment = openRepayments.find((r) => r.status === "LATE") ?? null;
  const dueRepayment = openRepayments.find((r) => r.status === "DUE") ?? null;

  const activeProjects = projects.filter((p) => p.status !== "REJECTED");
  const complementProject = activeProjects.find((p) => p.status === "COMPLEMENT_REQUESTED") ?? null;
  const draftProject = activeProjects.find((p) => p.status === "DRAFT") ?? null;

  /* ---------- Prochaine action à effectuer ---------- */

  const nextAction = (() => {
    if (lateRepayment) {
      return {
        tone: "danger" as const,
        title: "Échéance en retard — action immédiate requise",
        description: `Une échéance de ${formatFCFA(
          lateRepayment.capitalAmount + lateRepayment.interestAmount + lateRepayment.feeAmount
        )} est en retard. Réglez-la pour préserver la confiance des investisseurs.`,
        ctaLabel: "Régler maintenant",
        ctaHref: `/entreprise/financements/${lateRepayment.offerId}/rembourser`,
      };
    }
    if (dueRepayment) {
      return {
        tone: "warning" as const,
        title: `Échéance à régler le ${formatDate(dueRepayment.scheduleDate)}`,
        description: `Montant dû : ${formatFCFA(
          dueRepayment.capitalAmount + dueRepayment.interestAmount + dueRepayment.feeAmount
        )}. Effectuez un virement global, Nexora répartit aux investisseurs.`,
        ctaLabel: "Régler l'échéance",
        ctaHref: `/entreprise/financements/${dueRepayment.offerId}/rembourser`,
      };
    }
    if (complementProject) {
      return {
        tone: "warning" as const,
        title: `Complément demandé sur « ${complementProject.title} »`,
        description:
          "L'équipe d'analyse attend des pièces complémentaires. Transmettez-les pour relancer l'instruction.",
        ctaLabel: "Compléter le dossier",
        ctaHref: `/entreprise/projet/${complementProject.id}`,
      };
    }
    if (draftProject) {
      return {
        tone: "info" as const,
        title: `Brouillon « ${draftProject.title} » en attente`,
        description:
          "Votre dossier n'a pas encore été soumis. Finalisez-le pour lancer l'analyse par le comité Nexora.",
        ctaLabel: "Finaliser le dossier",
        ctaHref: `/entreprise/projet/${draftProject.id}`,
      };
    }
    return {
      tone: "success" as const,
      title: "Tout est à jour",
      description:
        "Aucune action requise. Vous recevrez une notification à la prochaine étape (échéance, décision, collecte).",
      ctaLabel: null,
      ctaHref: null,
    };
  })();

  const bannerStyles = {
    danger: "bg-[#C62828]/5 border-[#C62828]/30 text-[#C62828]",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    success: "bg-[#EFFBDD] border-[#166534]/20 text-[#166534]",
  } as const;
  const BannerIcon =
    nextAction.tone === "success"
      ? CircleCheck
      : nextAction.tone === "info"
        ? Info
        : TriangleAlert;

  return (
    <EntrepriseShell
      title="Tableau de bord"
      subtitle={company ? `${company.name} · ${company.sector}` : "Vue d'ensemble de votre activité de financement"}
      companyName={company?.name}
      actions={
        <Link href="/entreprise/projet/nouveau">
          <Button icon={<Plus className="h-4 w-4" />}>Déposer un projet</Button>
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#101010]/40">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <Card className="border-[#C62828]/20 bg-[#C62828]/5">
          <div className="flex items-start gap-3">
            <CircleAlert className="h-5 w-5 text-[#C62828] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#101010]">Impossible de charger le tableau de bord</p>
              <p className="text-sm text-[#101010]/60 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ===== Prochaine action à effectuer ===== */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-4 sm:p-5 ${bannerStyles[nextAction.tone]}`}
          >
            <div className="flex items-start gap-3 flex-1">
              <BannerIcon className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">{nextAction.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{nextAction.description}</p>
              </div>
            </div>
            {nextAction.ctaHref && nextAction.ctaLabel && (
              <Link href={nextAction.ctaHref} className="shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  {nextAction.ctaLabel}
                </Button>
              </Link>
            )}
          </div>

          {/* ===== Indicateurs ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI
              label="Montant total financé"
              value={formatFCFA(totalFinanced)}
              icon={<Landmark className="h-5 w-5 text-[#101010]" />}
              trend="up"
              trendValue={`${offers.length} financement${offers.length > 1 ? "s" : ""} sur la plateforme`}
            />
            <KPI
              label="Montant restant dû"
              value={formatFCFA(remainingDue)}
              icon={<Receipt className="h-5 w-5 text-[#101010]" />}
              trend="neutral"
              trendValue={`${openRepayments.length} échéance${openRepayments.length > 1 ? "s" : ""} à honorer`}
            />
            <KPI
              label="Taux d'impayés"
              value={`${defaultRate.toLocaleString("fr-FR")} %`}
              icon={<TriangleAlert className="h-5 w-5 text-[#101010]" />}
              trend={defaultRate === 0 ? "up" : "down"}
              trendValue={defaultRate === 0 ? "Aucun impayé à ce jour" : `${lateCount} échéance(s) en retard`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ===== Dossiers actifs ===== */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between mb-0">
                <CardTitle>Dossiers</CardTitle>
                <Badge variant="accent">
                  {activeProjects.length} actif{activeProjects.length > 1 ? "s" : ""}
                </Badge>
              </CardHeader>

              {activeProjects.length === 0 ? (
                <div className="py-10 text-center">
                  <FolderEmptyState />
                  <p className="text-sm text-[#101010]/60 mt-4 max-w-sm mx-auto">
                    Vous n&apos;avez pas encore de dossier. Déposez votre premier projet pour lancer
                    un financement.
                  </p>
                  <Link href="/entreprise/projet/nouveau" className="inline-block mt-4">
                    <Button icon={<Plus className="h-4 w-4" />}>Déposer un projet</Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#101010]/5 -mx-6">
                  {activeProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/entreprise/projet/${project.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F5F3]/60 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#101010] truncate">{project.title}</p>
                            <StatusBadge status={project.status} />
                          </div>
                          <p className="text-xs text-[#101010]/50 mt-1">
                            {project.sector}
                            {project.city ? ` · ${project.city}` : ""} · {formatFCFA(project.requestedAmount)}{" "}
                            recherchés · soumis le {formatDate(project.createdAt)}
                          </p>
                          <p className="text-xs text-[#101010]/40 mt-1 line-clamp-1">
                            {PROJECT_STATUS_INFO[project.status]}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#101010]/30 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* ===== Prochaine échéance ===== */}
            <Card>
              <CardHeader className="mb-0">
                <CardTitle>Prochaine échéance</CardTitle>
              </CardHeader>

              {nextRepayment ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-[#EFFBDD] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#101010]/60">
                        À payer le {formatDate(nextRepayment.scheduleDate)}
                      </span>
                      <StatusBadge status={nextRepayment.status} />
                    </div>
                    <p className="text-2xl font-bold text-[#101010] mt-2">
                      {formatFCFA(nextRepaymentTotal)}
                    </p>
                    <p className="text-xs text-[#101010]/60 mt-1">
                      {projectTitles[nextRepayment.offerId]
                        ? `Projet : ${projectTitles[nextRepayment.offerId]}`
                        : "Financement Nexora"}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-[#101010]/60">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p>
                      Un seul virement suffit : vous payez globalement et Nexora répartit
                      automatiquement la part de chaque investisseur.
                    </p>
                  </div>

                  <Link
                    href={`/entreprise/financements/${nextRepayment.offerId}/rembourser`}
                    className="block"
                  >
                    <Button className="w-full" icon={<CalendarClock className="h-4 w-4" />}>
                      Voir l&apos;échéancier
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CircleCheck className="h-8 w-8 text-[#166534] mx-auto" />
                  <p className="text-sm text-[#101010]/60 mt-3">
                    Aucune échéance à venir. Vous serez notifié dès la prochaine échéance de
                    remboursement.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* ===== Financements en cours ===== */}
          {offers.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between mb-0">
                <CardTitle>Financements en cours</CardTitle>
                <Link
                  href="/entreprise/financements"
                  className="text-sm font-medium text-[#101010]/60 hover:text-[#101010] inline-flex items-center gap-1"
                >
                  Tout voir <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>

              <div className="space-y-5">
                {offers.map((offer) => {
                  const project = projects.find((p) => p.offer?.id === offer.id);
                  return (
                    <div key={offer.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[#101010] text-sm">
                            {project?.title ?? "Financement"}
                          </p>
                          <StatusBadge status={offer.status} />
                        </div>
                        <p className="text-xs text-[#101010]/50">
                          {formatRate(offer.rate)} {offer.ratePeriod === "TOTAL" ? "au total" : "par an"}{" "}
                          · {offer.duration} mois · {offer.investorCount} investisseurs
                        </p>
                      </div>
                      <ProgressBar
                        value={offer.collectedAmount}
                        max={offer.targetAmount}
                        label={`${formatFCFA(offer.collectedAmount)} collectés sur ${formatFCFA(offer.targetAmount)}`}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </EntrepriseShell>
  );
}

function FolderEmptyState() {
  return (
    <div className="mx-auto h-12 w-12 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
      <Wallet className="h-6 w-6 text-[#101010]/30" />
    </div>
  );
}
