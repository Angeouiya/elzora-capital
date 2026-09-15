"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Clock,
  FilePen,
  Info,
  Landmark,
  LoaderCircle,
  MessageSquare,
  Send,
  SquarePen,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFCFA, formatRate } from "@/lib/calculations";

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
  publishedAt?: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string;
  sector: string;
  city?: string | null;
  country: string;
  totalAmount: number;
  ownContribution: number;
  requestedAmount: number;
  budget?: string | null;
  usageDescription?: string | null;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  company?: { name: string } | null;
  offer?: Offer | null;
}

/** Étapes du parcours : Soumis → En analyse → Décision → Offre publiée */
const TIMELINE = [
  { key: "submitted", label: "Soumis", desc: "Dossier reçu par Nexora" },
  { key: "review", label: "En analyse", desc: "Étude du comité des risques" },
  { key: "decision", label: "Décision", desc: "Approuvé ou refusé" },
  { key: "published", label: "Offre publiée", desc: "Ouverte aux investisseurs" },
] as const;

/** Position dans le parcours par statut (0 = brouillon non soumis) */
const STATUS_TO_STEP: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  UNDER_REVIEW: 2,
  COMPLEMENT_REQUESTED: 2,
  APPROVED: 3,
  REJECTED: 3,
  PUBLISHED: 4,
};

const STATUS_INFO: Record<
  string,
  { where: string; todo: string; next: string }
> = {
  DRAFT: {
    where: "Votre dossier est un brouillon : il n'a pas encore été transmis à l'équipe d'analyse.",
    todo: "Finalisez les informations puis soumettez-le.",
    next: "Après soumission, l'analyse démarre sous 5 jours ouvrés.",
  },
  SUBMITTED: {
    where: "Votre dossier a bien été reçu par l'équipe d'analyse Nexora.",
    todo: "Rien à faire : restez à l'écoute de vos notifications.",
    next: "Un analyste va le prendre en charge, puis le comité des risques délibérera.",
  },
  UNDER_REVIEW: {
    where: "Votre dossier est en cours d'instruction par le comité des risques.",
    todo: "Rien à faire pour l'instant. Un complément peut vous être demandé.",
    next: "Vous recevrez la décision (approbation, refus ou demande de complément) par notification.",
  },
  COMPLEMENT_REQUESTED: {
    where: "L'équipe d'analyse a identifié des informations ou pièces manquantes.",
    todo: "Transmettez les compléments demandés ci-dessous, puis renvoyez le dossier.",
    next: "Une fois complété, le dossier repart directement en analyse.",
  },
  APPROVED: {
    where: "Félicitations : le comité a approuvé votre demande de financement.",
    todo: "Confirmez les conditions proposées pour lancer la collecte.",
    next: "Après confirmation, votre offre est publiée et ouverte aux investisseurs.",
  },
  REJECTED: {
    where: "Le comité n'a pas retenu ce dossier pour financement.",
    todo: "Vous pouvez déposer un nouveau projet en tenant compte des retours.",
    next: "Un nouveau dépôt repart du début du parcours d'analyse.",
  },
  PUBLISHED: {
    where: "Votre offre est publiée : les investisseurs peuvent souscrire.",
    todo: "Suivez l'avancement de la collecte dans la rubrique Financements.",
    next: "Collecte réussie → décaissement des fonds, puis remboursements selon l'échéancier.",
  },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function SuiviDossierPage() {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Dossier introuvable." : "Chargement impossible.");
      }
      const data = (await res.json()) as Project;
      setProject(data);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const patchProject = async (data: Record<string, unknown>, successMessage: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setFeedback({ type: "success", message: successMessage });
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFeedback({ type: "error", message: "L'action a échoué. Vérifiez votre connexion et réessayez." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <EntrepriseShell title="Suivi du dossier">
        <div className="flex items-center justify-center py-24 text-[#101010]/40">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      </EntrepriseShell>
    );
  }

  if (loadError || !project) {
    return (
      <EntrepriseShell title="Suivi du dossier">
        <Card className="text-center py-12">
          <CircleX className="h-10 w-10 text-[#C62828] mx-auto" />
          <p className="font-semibold text-[#101010] mt-4">
            {loadError ?? "Dossier introuvable."}
          </p>
          <Link href="/entreprise/dashboard" className="inline-block mt-6">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour au tableau de bord
            </Button>
          </Link>
        </Card>
      </EntrepriseShell>
    );
  }

  const currentStep = STATUS_TO_STEP[project.status] ?? 0;
  const info = STATUS_INFO[project.status] ?? STATUS_INFO.DRAFT;
  const statusLabelMap: Record<string, string> = {
    DRAFT: "Brouillon",
    SUBMITTED: "Soumis",
    UNDER_REVIEW: "En analyse",
    COMPLEMENT_REQUESTED: "Complément demandé",
    APPROVED: "Approuvé",
    REJECTED: "Refusé",
    PUBLISHED: "Offre publiée",
  };

  /* Budget lisible */
  let budgetLines: Array<{ label: string; amount: number }> = [];
  try {
    const raw = project.budget ? JSON.parse(project.budget) : null;
    if (raw) {
      if (Array.isArray(raw.lines)) {
        budgetLines = raw.lines.filter(
          (l: { label?: string; amount?: number }) => (l.amount ?? 0) > 0
        );
      } else {
        budgetLines = Object.entries(raw).map(([label, amount]) => ({
          label,
          amount: Number(amount) || 0,
        }));
      }
    }
  } catch {
    /* budget illisible */
  }

  /* Historique des modifications */
  const history: Array<{ date: string; label: string; icon: typeof Check }> = [];
  history.push({ date: project.createdAt, label: "Dossier créé", icon: FilePen });
  if (project.submittedAt)
    history.push({ date: project.submittedAt, label: "Dossier soumis pour analyse", icon: Send });
  if (project.status === "COMPLEMENT_REQUESTED")
    history.push({
      date: project.updatedAt,
      label: "Demande de complément envoyée par l'analyse",
      icon: MessageSquare,
    });
  if (project.approvedAt)
    history.push({
      date: project.approvedAt,
      label:
        project.status === "REJECTED" ? "Décision : dossier non retenu" : "Dossier approuvé par le comité",
      icon: project.status === "REJECTED" ? CircleX : CircleCheck,
    });
  if (project.offer?.publishedAt)
    history.push({ date: project.offer.publishedAt, label: "Offre publiée aux investisseurs", icon: Landmark });
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <EntrepriseShell
      title={project.title}
      subtitle={`Dossier suivi depuis le ${formatDate(project.createdAt)}${project.city ? ` · ${project.city}` : ""}`}
      companyName={project.company?.name ?? null}
      actions={
        <Link href="/entreprise/dashboard">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Mes dossiers
          </Button>
        </Link>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-[#166534]/20 bg-[#EFFBDD] text-[#166534]"
                : "border-[#C62828]/30 bg-[#C62828]/5 text-[#C62828]"
            }`}
          >
            {feedback.type === "success" ? (
              <CircleCheck className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CircleX className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <p>{feedback.message}</p>
          </div>
        )}

        {/* ===== Statut en grand + que faire ===== */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={project.status}
              className="text-sm px-4 py-1.5 font-semibold"
            />
            <span className="text-sm text-[#101010]/50">
              Statut actuel : <strong className="text-[#101010]">{statusLabelMap[project.status] ?? project.status}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="rounded-lg bg-[#F5F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Où en suis-je ?
              </p>
              <p className="text-sm text-[#101010]/80 mt-2">{info.where}</p>
            </div>
            <div className="rounded-lg bg-[#EFFBDD] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 flex items-center gap-1.5">
                <SquarePen className="h-3.5 w-3.5" /> Que dois-je faire ?
              </p>
              <p className="text-sm text-[#101010]/80 mt-2">{info.todo}</p>
            </div>
            <div className="rounded-lg bg-[#F5F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" /> Et ensuite ?
              </p>
              <p className="text-sm text-[#101010]/80 mt-2">{info.next}</p>
            </div>
          </div>

          {/* Actions selon le statut */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {project.status === "DRAFT" && (
              <>
                <Link href={`/entreprise/projet/nouveau?draft=${project.id}`}>
                  <Button variant="secondary" icon={<SquarePen className="h-4 w-4" />}>
                    Compléter le dossier
                  </Button>
                </Link>
                <Button
                  icon={<Send className="h-4 w-4" />}
                  loading={actionLoading}
                  onClick={() =>
                    patchProject(
                      { status: "SUBMITTED", submittedAt: new Date().toISOString() },
                      "Dossier soumis ! L'équipe d'analyse Nexora prend le relais."
                    )
                  }
                >
                  Soumettre pour analyse
                </Button>
              </>
            )}

            {project.status === "COMPLEMENT_REQUESTED" && (
              <Link href={`/entreprise/projet/nouveau?draft=${project.id}`}>
                <Button icon={<SquarePen className="h-4 w-4" />}>Compléter le dossier</Button>
              </Link>
            )}

            {project.status === "APPROVED" && (
              <Button
                icon={<Check className="h-4 w-4" />}
                loading={actionLoading}
                onClick={() =>
                  patchProject(
                    { status: "PUBLISHED" },
                    "Conditions confirmées — votre offre va être publiée aux investisseurs."
                  )
                }
              >
                Confirmer les conditions
              </Button>
            )}

            {project.status === "REJECTED" && (
              <Link href="/entreprise/projet/nouveau">
                <Button icon={<FilePen className="h-4 w-4" />}>Déposer un nouveau projet</Button>
              </Link>
            )}

            {project.status === "PUBLISHED" && (
              <Link href="/entreprise/financements">
                <Button icon={<Landmark className="h-4 w-4" />}>Voir mes financements</Button>
              </Link>
            )}

            {(project.status === "SUBMITTED" || project.status === "UNDER_REVIEW") && (
              <p className="text-xs text-[#101010]/50 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Aucune action requise — l&apos;équipe d&apos;analyse vous notifie à la prochaine étape.
              </p>
            )}
          </div>
        </Card>

        {/* ===== Timeline visuelle ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Parcours du dossier</CardTitle>
          </CardHeader>

          {project.status === "DRAFT" ? (
            <div className="flex items-start gap-3 rounded-lg bg-[#F5F5F3] p-4 text-sm text-[#101010]/70">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Le parcours démarre dès la soumission du dossier : Soumis → En analyse → Décision →
                Offre publiée. Soumettez votre brouillon pour lancer le processus.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="flex items-start min-w-[560px] px-2 pt-1">
                {TIMELINE.map((tl, i) => {
                  const stepValue = i + 1;
                  const done = stepValue < currentStep;
                  const active = stepValue === currentStep;
                  const rejectedHere = project.status === "REJECTED" && stepValue === 3;
                  return (
                    <Fragment key={tl.key}>
                      <div className="flex flex-col items-center text-center shrink-0 w-28">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center ${
                            done
                              ? "bg-[#166534] text-white"
                              : active
                                ? "bg-[#B6FF00] text-[#101010] ring-4 ring-[#B6FF00]/30"
                                : rejectedHere
                                  ? "bg-[#C62828] text-white"
                                  : "bg-[#F5F5F3] text-[#101010]/30"
                          }`}
                        >
                          {done ? (
                            <Check className="h-4 w-4" />
                          ) : active ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#101010] animate-pulse" />
                          ) : rejectedHere ? (
                            <CircleX className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-2 font-semibold ${
                            active || rejectedHere ? "text-[#101010]" : done ? "text-[#166534]" : "text-[#101010]/40"
                          }`}
                        >
                          {tl.label}
                        </p>
                        <p className="text-[10px] text-[#101010]/40 mt-0.5 leading-tight">{tl.desc}</p>
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 min-w-6 mt-[18px] mx-1 rounded-full ${
                            done ? "bg-[#166534]" : "bg-[#101010]/10"
                          }`}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ===== Demandes de complément ===== */}
        {project.status === "COMPLEMENT_REQUESTED" && (
          <Card className="border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#101010]">Demande de complément</h3>
                  <Badge variant="warning">Action attendue</Badge>
                  <span className="text-xs text-[#101010]/50">{formatDate(project.updatedAt)}</span>
                </div>
                <p className="text-sm text-[#101010]/80 mt-2 leading-relaxed">
                  {project.rejectionReason ||
                    "Bonjour, pour finaliser l'instruction de votre dossier, merci de transmettre les pièces et précisions manquantes signalées par l'analyste en charge. — L'équipe d'analyse Nexora"}
                </p>
                <p className="text-xs text-amber-700 mt-3 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Le dossier reste en pause tant que les compléments ne sont pas transmis.
                </p>
              </div>
            </div>
          </Card>
        )}

        {project.status === "REJECTED" && project.rejectionReason && (
          <Card className="border-[#C62828]/20 bg-[#C62828]/5">
            <div className="flex items-start gap-3">
              <CircleX className="h-5 w-5 text-[#C62828] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#101010]">Motif de la décision</h3>
                <p className="text-sm text-[#101010]/70 mt-1">{project.rejectionReason}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== Résumé du dossier ===== */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé du dossier</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Entreprise" value={project.company?.name ?? "—"} />
              <SummaryRow label="Secteur" value={project.sector} />
              <SummaryRow label="Ville" value={project.city || "—"} />
              <SummaryRow label="Montant total du projet" value={formatFCFA(project.totalAmount)} />
              <SummaryRow label="Montant recherché" value={formatFCFA(project.requestedAmount)} />
              <SummaryRow
                label="Apport propre"
                value={project.ownContribution ? formatFCFA(project.ownContribution) : "Aucun"}
              />
              {project.offer && (
                <SummaryRow
                  label="Conditions de l'offre"
                  value={`${project.offer.type === "EQUITY" ? "Équité" : "Dette"} · ${formatRate(
                    project.offer.rate
                  )} ${project.offer.ratePeriod === "TOTAL" ? "au total" : "par an"} · ${
                    project.offer.duration
                  } mois`}
                />
              )}
              {project.usageDescription && (
                <SummaryRow label="Usage des fonds" value={project.usageDescription} />
              )}
            </dl>

            {budgetLines.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#101010]/10">
                <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 mb-3">
                  Budget prévisionnel
                </p>
                <ul className="space-y-2 text-sm">
                  {budgetLines.map((line) => (
                    <li key={line.label} className="flex items-center justify-between gap-4">
                      <span className="text-[#101010]/60 truncate">{line.label}</span>
                      <span className="font-medium text-[#101010] shrink-0">
                        {formatFCFA(line.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.description && (
              <div className="mt-5 pt-4 border-t border-[#101010]/10">
                <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/50 mb-2">
                  Description
                </p>
                <p className="text-sm text-[#101010]/70 leading-relaxed">{project.description}</p>
              </div>
            )}
          </Card>

          {/* ===== Historique des modifications ===== */}
          <Card>
            <CardHeader className="flex items-center justify-between mb-0">
              <CardTitle>Historique</CardTitle>
              <Badge variant="default">
                <CalendarDays className="h-3 w-3 mr-1" />
                {history.length} événement{history.length > 1 ? "s" : ""}
              </Badge>
            </CardHeader>

            <ol className="relative ml-4 border-l border-[#101010]/10 space-y-6">
              {history.map((event, i) => {
                const Icon = event.icon;
                const isLast = i === history.length - 1;
                return (
                  <li key={`${event.label}-${i}`} className="ml-5 relative">
                    <span
                      className={`absolute -left-[30px] top-0 h-5 w-5 rounded-full flex items-center justify-center ${
                        isLast ? "bg-[#B6FF00]" : "bg-[#F5F5F3]"
                      }`}
                    >
                      <Icon className="h-3 w-3 text-[#101010]" />
                    </span>
                    <p className="text-sm font-medium text-[#101010]">{event.label}</p>
                    <p className="text-xs text-[#101010]/50 mt-0.5">{formatDate(event.date)}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* ===== Offre publiée ===== */}
        {project.offer && (
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 mb-0">
              <CardTitle>Offre associée</CardTitle>
              <StatusBadge status={project.offer.status} />
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#101010]/50 uppercase tracking-wide">Objectif</p>
                <p className="font-bold text-[#101010] mt-1">{formatFCFA(project.offer.targetAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-[#101010]/50 uppercase tracking-wide">Collecté</p>
                <p className="font-bold text-[#101010] mt-1">
                  {formatFCFA(project.offer.collectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#101010]/50 uppercase tracking-wide">Taux</p>
                <p className="font-bold text-[#101010] mt-1">
                  {formatRate(project.offer.rate)}{" "}
                  <span className="font-normal text-[#101010]/50 text-xs">
                    {project.offer.ratePeriod === "TOTAL" ? "au total" : "par an"}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-[#101010]/50 uppercase tracking-wide">Investisseurs</p>
                <p className="font-bold text-[#101010] mt-1">{project.offer.investorCount}</p>
              </div>
            </div>
            <div className="mt-5">
              <Link href="/entreprise/financements">
                <Button variant="secondary" size="sm" icon={<Landmark className="h-4 w-4" />}>
                  Suivre la collecte
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </EntrepriseShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#101010]/50 shrink-0">{label}</dt>
      <dd className="font-medium text-[#101010] text-right">{value}</dd>
    </div>
  );
}
