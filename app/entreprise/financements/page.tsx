"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Info,
  Landmark,
  LoaderCircle,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateNetReceived,
  formatFCFA,
  formatRate,
} from "@/lib/calculations";

interface Company {
  id: string;
  name: string;
  sector: string;
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
  requestedAmount: number;
}

interface ProjectDetail extends Project {
  offer: Offer | null;
}

/** Type alias (et non interface) pour satisfaire la contrainte générique de DataTable */
type Disbursement = {
  id: string;
  offerId: string;
  amount: number;
  tranche: number;
  status: string;
  createdAt: string;
  offer?: { project?: { title?: string } };
};

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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const FLOW_STEPS = [
  { icon: Plus, label: "Projet déposé", desc: "Dossier soumis et analysé" },
  { icon: BadgeCheck, label: "Offre publiée", desc: "Conditions validées par le comité" },
  { icon: TrendingUp, label: "Collecte", desc: "Les investisseurs souscrivent" },
  { icon: Banknote, label: "Décaissement", desc: "Fonds versés, net de commission" },
  { icon: Receipt, label: "Remboursement", desc: "Échéancier honoré, global" },
];

export default function FinancementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [financings, setFinancings] = useState<Array<{ project: ProjectDetail; offer: Offer }>>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [repaymentsByOffer, setRepaymentsByOffer] = useState<Map<string, Repayment[]>>(
    new Map()
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [companiesRes, projectsRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/projects"),
      ]);
      if (!companiesRes.ok || !projectsRes.ok) {
        throw new Error("Impossible de charger vos financements.");
      }
      const companies: Company[] = await companiesRes.json();
      const projects: Project[] = await projectsRes.json();
      setCompany(companies[0] ?? null);

      const details = await Promise.all(
        projects.map(async (p) => {
          const res = await fetch(`/api/projects/${p.id}`);
          if (!res.ok) return { ...p, offer: null } as ProjectDetail;
          return (await res.json()) as ProjectDetail;
        })
      );

      const ownFinancings = details
        .filter((d): d is ProjectDetail & { offer: Offer } => d.offer !== null)
        .map((d) => ({ project: d, offer: d.offer }));
      setFinancings(ownFinancings);

      /* Échéanciers réels : une dette dont l'échéancier existe est
         remboursable, même si la collecte est encore ouverte
         (données de démonstration) — cohérent avec le tableau de bord. */
      const repayMap = new Map<string, Repayment[]>();
      await Promise.all(
        ownFinancings
          .filter((f) => f.offer.type !== "EQUITY")
          .map(async (f) => {
            const res = await fetch(`/api/repayments?offerId=${f.offer.id}`);
            if (!res.ok) return;
            const rows: Repayment[] = await res.json();
            if (rows.length > 0) repayMap.set(f.offer.id, rows);
          })
      );
      setRepaymentsByOffer(repayMap);

      const disbursementsRes = await fetch("/api/disbursements");
      if (disbursementsRes.ok) {
        const all: Disbursement[] = await disbursementsRes.json();
        const ownOfferIds = new Set(
          details.filter((d) => d.offer).map((d) => d.offer!.id)
        );
        setDisbursements(all.filter((d) => ownOfferIds.has(d.offerId)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const disbursementsByOffer = useMemo(() => {
    const map = new Map<string, Disbursement[]>();
    disbursements.forEach((d) => {
      const list = map.get(d.offerId) ?? [];
      list.push(d);
      map.set(d.offerId, list);
    });
    return map;
  }, [disbursements]);

  /* ===== Demande de décaissement ===== */
  const [disbModalOpen, setDisbModalOpen] = useState(false);
  const [disbTarget, setDisbTarget] = useState<{ project: ProjectDetail; offer: Offer } | null>(null);
  const [disbAmount, setDisbAmount] = useState("");
  const [disbSubmitting, setDisbSubmitting] = useState(false);
  const [disbError, setDisbError] = useState<string | null>(null);
  const [disbSuccess, setDisbSuccess] = useState(false);

  const openDisbModal = (financing: { project: ProjectDetail; offer: Offer }) => {
    const list = disbursementsByOffer.get(financing.offer.id) ?? [];
    const { netReceived } = calculateNetReceived(financing.offer.collectedAmount);
    const alreadyCommitted = list.reduce((s, d) => s + d.amount, 0);
    const remaining = Math.max(netReceived - alreadyCommitted, 0);
    setDisbTarget(financing);
    setDisbAmount(remaining > 0 ? remaining.toLocaleString("fr-FR") : "");
    setDisbError(null);
    setDisbSuccess(false);
    setDisbModalOpen(true);
  };

  const submitDisbursement = async () => {
    if (!disbTarget) return;
    const amount = parseInt(disbAmount.replace(/[^\d]/g, ""), 10) || 0;
    if (amount <= 0) {
      setDisbError("Indiquez le montant à décaisser.");
      return;
    }
    setDisbSubmitting(true);
    setDisbError(null);
    try {
      const list = disbursementsByOffer.get(disbTarget.offer.id) ?? [];
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: disbTarget.offer.id,
          amount,
          tranche: list.length + 1,
        }),
      });
      if (!res.ok) throw new Error();
      setDisbSuccess(true);
      await load();
    } catch {
      setDisbError("La demande a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setDisbSubmitting(false);
    }
  };

  const hasSchedule = (offerId: string) =>
    (repaymentsByOffer.get(offerId)?.length ?? 0) > 0;

  /* Remboursable = dette dont la collecte a réussi OU dont l'échéancier
     existe déjà (vérité des données). */
  const reimbursableFinancings = financings.filter(
    (f) =>
      f.offer.type !== "EQUITY" &&
      (f.offer.status === "CLOSED_SUCCESS" || hasSchedule(f.offer.id))
  );

  return (
    <EntrepriseShell
      title="Financements"
      subtitle={
        company
          ? `${company.name} · ${financings.length} financement${financings.length > 1 ? "s" : ""}`
          : "Suivez vos collectes, décaissements et remboursements"
      }
      companyName={company?.name}
      actions={
        <Link href="/entreprise/projet/nouveau">
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />}>
            Nouveau projet
          </Button>
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
              <p className="font-semibold text-[#101010]">Chargement impossible</p>
              <p className="text-sm text-[#101010]/60 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      ) : financings.length === 0 ? (
        /* ===== État vide : expliquer le parcours ===== */
        <Card padding="lg" className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EFFBDD] flex items-center justify-center">
            <Landmark className="h-7 w-7 text-[#101010]" />
          </div>
          <h2 className="text-lg font-bold text-[#101010] mt-4">
            Aucun financement pour le moment
          </h2>
          <p className="text-sm text-[#101010]/60 mt-2 max-w-md mx-auto">
            Déposez un projet : après analyse et validation par le comité, votre offre sera publiée
            aux investisseurs. Voici le parcours complet :
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 text-left">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="rounded-xl bg-[#F5F5F3] p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#101010]/50">
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 text-[#101010]/60" />
                  </div>
                  <p className="text-xs font-bold text-[#101010] mt-2">{step.label}</p>
                  <p className="text-[11px] text-[#101010]/50 mt-0.5 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <Link href="/entreprise/projet/nouveau" className="inline-block mt-8">
            <Button icon={<Plus className="h-4 w-4" />}>Déposer un projet</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* ===== Cartes de financement ===== */}
          <div className="space-y-6">
            {financings.map(({ project, offer }) => {
              const { commission, netReceived } = calculateNetReceived(offer.collectedAmount);
              const list = disbursementsByOffer.get(offer.id) ?? [];
              const byStatus = (status: string) => list.filter((d) => d.status === status);
              const pending = byStatus("PENDING");
              const approved = byStatus("APPROVED");
              const executed = byStatus("EXECUTED");
              const sum = (arr: Disbursement[]) => arr.reduce((s, d) => s + d.amount, 0);

              return (
                <Card key={offer.id} padding="lg">
                  {/* En-tête */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-[#101010]">{project.title}</h2>
                        <Badge variant="accent">
                          {offer.type === "EQUITY" ? "Équité" : "Dette"}
                        </Badge>
                        <StatusBadge status={offer.status} />
                      </div>
                      <p className="text-xs text-[#101010]/50 mt-1">
                        {formatRate(offer.rate)} {offer.ratePeriod === "TOTAL" ? "au total" : "par an"} ·{" "}
                        {offer.duration} mois · {offer.investorCount} investisseur
                        {offer.investorCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#101010]/50 uppercase tracking-wide">Objectif</p>
                      <p className="font-bold text-[#101010]">{formatFCFA(offer.targetAmount)}</p>
                    </div>
                  </div>

                  {/* Progression collecte */}
                  <div className="mt-5">
                    <ProgressBar
                      value={offer.collectedAmount}
                      max={offer.targetAmount}
                      label={`Collecte — ${formatFCFA(offer.collectedAmount)} sur ${formatFCFA(
                        offer.targetAmount
                      )}`}
                    />
                  </div>

                  {/* Capital brut / commission / net */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                    <div className="rounded-lg bg-[#F5F5F3] p-4">
                      <p className="text-xs text-[#101010]/50 flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" /> Capital brut collecté
                      </p>
                      <p className="font-bold text-[#101010] mt-1">{formatFCFA(offer.collectedAmount)}</p>
                    </div>
                    <div className="rounded-lg bg-[#F5F5F3] p-4">
                      <p className="text-xs text-[#101010]/50 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5" /> Frais de plateforme (6 %)
                      </p>
                      <p className="font-bold text-[#101010] mt-1">- {formatFCFA(commission)}</p>
                    </div>
                    <div className="rounded-lg bg-[#EFFBDD] p-4">
                      <p className="text-xs text-[#101010]/60 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" /> Net reçu (ou à recevoir)
                      </p>
                      <p className="font-bold text-[#101010] mt-1">{formatFCFA(netReceived)}</p>
                    </div>
                  </div>

                  {/* Décaissements */}
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <DisbStat
                      icon={<Clock className="h-4 w-4" />}
                      label="Demandés"
                      count={pending.length}
                      amount={sum(pending)}
                    />
                    <DisbStat
                      icon={<BadgeCheck className="h-4 w-4" />}
                      label="Approuvés"
                      count={approved.length}
                      amount={sum(approved)}
                    />
                    <DisbStat
                      icon={<CircleCheck className="h-4 w-4" />}
                      label="Exécutés"
                      count={executed.length}
                      amount={sum(executed)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-[#101010]/10">
                    {offer.status === "CLOSED_SUCCESS" ? (
                      <>
                        <p className="text-xs text-[#101010]/50 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          Collecte réussie : les fonds peuvent être décaissés par tranches.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {offer.type !== "EQUITY" && (
                            <Link href={`/entreprise/financements/${offer.id}/rembourser`}>
                              <Button variant="secondary" icon={<CalendarClock className="h-4 w-4" />}>
                                Rembourser
                              </Button>
                            </Link>
                          )}
                          <Button
                            icon={<Banknote className="h-4 w-4" />}
                            onClick={() => openDisbModal({ project, offer })}
                          >
                            Demander un décaissement
                          </Button>
                        </div>
                      </>
                    ) : offer.status === "PUBLISHED" ? (
                      <>
                        <p className="text-xs text-[#101010]/50 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Collecte en cours — vous serez notifié à sa clôture (réussite ou échec).
                        </p>
                        {offer.type !== "EQUITY" && hasSchedule(offer.id) && (
                          <Link href={`/entreprise/financements/${offer.id}/rembourser`}>
                            <Button variant="secondary" icon={<CalendarClock className="h-4 w-4" />}>
                              Rembourser
                            </Button>
                          </Link>
                        )}
                      </>
                    ) : offer.status === "CLOSED_FAIL" ? (
                      <p className="text-xs text-[#C62828] flex items-center gap-1.5">
                        <CircleAlert className="h-3.5 w-3.5" />
                        Collecte non aboutie : les fonds souscrits seront remboursés aux investisseurs.
                      </p>
                    ) : (
                      <p className="text-xs text-[#101010]/50">
                        Cette offre n&apos;est pas encore publiée aux investisseurs.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ===== Section Décaissements ===== */}
          <Card id="decaissements" className="scroll-mt-20">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 mb-0">
              <CardTitle>Décaissements</CardTitle>
              <Badge variant="default">{disbursements.length} demande{disbursements.length > 1 ? "s" : ""}</Badge>
            </CardHeader>

            <DataTable
              emptyMessage="Aucune demande de décaissement. Utilisez le bouton « Demander un décaissement » sur un financement collecté."
              data={disbursements}
              columns={[
                {
                  key: "project",
                  header: "Projet",
                  render: (row) => {
                    const financing = financings.find((f) => f.offer.id === row.offerId);
                    return financing?.project.title ?? "—";
                  },
                },
                { key: "tranche", header: "Tranche", render: (row) => `T${row.tranche}` },
                {
                  key: "amount",
                  header: "Montant",
                  render: (row) => <span className="font-semibold">{formatFCFA(row.amount)}</span>,
                },
                {
                  key: "status",
                  header: "Statut",
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: "createdAt",
                  header: "Demande",
                  render: (row) => formatDate(row.createdAt),
                },
              ]}
            />

            <div className="flex items-start gap-2 mt-4 text-xs text-[#101010]/50">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#166534]" />
              <p>
                Chaque décaissement suit le protocole de contrôle croisé « 4 yeux » : validation par
                deux analystes Nexora avant exécution du virement depuis le compte séquestre.
              </p>
            </div>
          </Card>

          {/* ===== Section Remboursements ===== */}
          <Card id="remboursements" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Remboursements</CardTitle>
            </CardHeader>

            {reimbursableFinancings.length === 0 ? (
              <p className="text-sm text-[#101010]/50">
                Aucun financement de type dette en cours de remboursement. Les échéanciers
                apparaîtront ici dès qu&apos;une collecte sera réussie.
              </p>
            ) : (
              <ul className="divide-y divide-[#101010]/5 -mx-6">
                {reimbursableFinancings.map(({ project, offer }) => {
                  const rows = repaymentsByOffer.get(offer.id) ?? [];
                  const paidCount = rows.filter((r) => r.status === "PAID").length;
                  const openCount = rows.filter(
                    (r) => r.status === "DUE" || r.status === "LATE" || r.status === "PARTIAL"
                  ).length;
                  return (
                    <li key={offer.id}>
                      <Link
                        href={`/entreprise/financements/${offer.id}/rembourser`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F5F3]/60 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#101010]">{project.title}</p>
                          <p className="text-xs text-[#101010]/50 mt-0.5">
                            {formatFCFA(offer.collectedAmount)} · {formatRate(offer.rate)}{" "}
                            {offer.ratePeriod === "TOTAL" ? "au total" : "par an"} · {offer.duration}
                            {" "}
                            mois
                            {rows.length > 0 &&
                              ` · ${rows.length} échéance${rows.length > 1 ? "s" : ""} (${paidCount} payée${paidCount > 1 ? "s" : ""})`}
                          </p>
                          {openCount > 0 && (
                            <p className="text-xs font-semibold text-[#C62828] mt-1 flex items-center gap-1.5">
                              <CircleAlert className="h-3.5 w-3.5" />
                              {openCount} échéance{openCount > 1 ? "s" : ""} à régler
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#101010]/50 hidden sm:inline">
                          Voir l&apos;échéancier
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#101010]/30 shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-start gap-2 mt-4 text-xs text-[#101010]/50">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Vous payez globalement, pas investisseur par investisseur : un seul virement par
                échéance, Nexora répartit ensuite automatiquement les parts.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ===== Modal demande de décaissement ===== */}
      <Modal
        open={disbModalOpen}
        onClose={() => setDisbModalOpen(false)}
        title="Demander un décaissement"
      >
        {disbSuccess ? (
          <div className="text-center py-4">
            <CircleCheck className="h-12 w-12 text-[#166534] mx-auto" />
            <p className="font-bold text-[#101010] mt-4">Demande envoyée</p>
            <p className="text-sm text-[#101010]/60 mt-2">
              Votre demande est <strong>en attente d&apos;approbation</strong>. Deux analystes Nexora
              la contrôlent (protocole 4 yeux), puis le virement est exécuté depuis le compte
              séquestre. Vous serez notifié à chaque étape.
            </p>
            <Button className="mt-6 w-full" onClick={() => setDisbModalOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <>
            {disbTarget && (
              <>
                <p className="text-sm text-[#101010]/60">
                  Financement : <strong className="text-[#101010]">{disbTarget.project.title}</strong>
                  <br />
                  Net disponible après commission :{" "}
                  <strong className="text-[#101010]">
                    {formatFCFA(calculateNetReceived(disbTarget.offer.collectedAmount).netReceived)}
                  </strong>
                </p>

                <div className="mt-5">
                  <Input
                    label="Montant à décaisser (FCFA)"
                    inputMode="numeric"
                    placeholder="Ex. 15 000 000"
                    value={disbAmount}
                    onChange={(e) => setDisbAmount(e.target.value)}
                    error={disbError ?? undefined}
                    hint="Vous pouvez demander le décaissement par tranches."
                  />
                </div>

                <div className="flex items-start gap-2 mt-4 rounded-lg bg-[#F5F5F3] p-3 text-xs text-[#101010]/60">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#166534]" />
                  <p>
                    La commission Nexora de 6 % est déjà déduite : le montant demandé vous est
                    versé intégralement après validation.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setDisbModalOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    icon={<Send className="h-4 w-4" />}
                    loading={disbSubmitting}
                    onClick={submitDisbursement}
                  >
                    Envoyer la demande
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </EntrepriseShell>
  );
}

function DisbStat({
  icon,
  label,
  count,
  amount,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  amount: number;
}) {
  return (
    <div className="rounded-lg border border-[#101010]/10 p-3">
      <p className="text-[11px] text-[#101010]/50 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="text-sm font-bold text-[#101010] mt-1">
        {count > 0 ? formatFCFA(amount) : "—"}
      </p>
      <p className="text-[10px] text-[#101010]/40">
        {count} tranche{count > 1 ? "s" : ""}
      </p>
    </div>
  );
}
