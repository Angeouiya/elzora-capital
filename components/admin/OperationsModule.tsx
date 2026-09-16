"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Headphones,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatFCFA } from "@/lib/calculations";

type Module =
  | "accounting"
  | "risk"
  | "contracts"
  | "support"
  | "acquisition"
  | "configuration"
  | "security"
  | "reporting";

type UserRow = { id: string; email: string; role: string; kycStatus: string; twoFactor: boolean; country: string };
type CompanyRow = { id: string; name: string; sector: string; country: string; status: string };
type ProjectRow = {
  id: string;
  title: string;
  status: string;
  company?: { name?: string } | null;
  offer?: { id: string } | null;
};
type OfferRow = {
  id: string;
  status: string;
  targetAmount: number;
  collectedAmount: number;
  project?: { company?: { name?: string } | null } | null;
};
type InvestmentRow = { id: string; status: string; amount: number };
type PaymentRow = { id: string; reference: string; amount: number; method: string; status: string };
type RepaymentRow = {
  id: string;
  status: string;
  scheduleDate: string;
  capitalAmount: number;
  interestAmount: number;
  feeAmount: number;
  paidAmount: number;
  offer?: { project?: { company?: { name?: string } | null } | null } | null;
};
type AuditRow = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: { email?: string } | null;
};
type Ops = {
  users: UserRow[];
  companies: CompanyRow[];
  projects: ProjectRow[];
  offers: OfferRow[];
  investments: InvestmentRow[];
  payments: PaymentRow[];
  disbursements: Array<{ id: string; amount: number; status: string }>;
  repayments: RepaymentRow[];
  distributions: Array<{ id: string; capitalAmount: number; interestAmount: number; status: string }>;
  audit: AuditRow[];
  generatedAt: string;
};

type ViewRow = { title: string; detail: string; status: string };
type ViewModel = { metrics: Array<[string, string]>; rows: ViewRow[]; note: string };

const META: Record<Module, { title: string; subtitle: string; icon: typeof BookOpen }> = {
  accounting: { title: "Comptabilité", subtitle: "Lecture des flux, rapprochements et cohérence des écritures opérationnelles.", icon: BookOpen },
  risk: { title: "Risques", subtitle: "Exposition, retards, concentrations et signaux nécessitant une revue humaine.", icon: AlertTriangle },
  contracts: { title: "Contrats", subtitle: "Cycle des conditions : dossier, offre, confirmation, publication et exécution.", icon: FileCheck2 },
  support: { title: "Assistance", subtitle: "Incidents et actions clients traçables à partir des événements disponibles.", icon: Headphones },
  acquisition: { title: "Acquisition", subtitle: "Pipeline entreprises, dossiers préparés, déposés et approuvés.", icon: Users },
  configuration: { title: "Configuration", subtitle: "Paramètres de démonstration et garde-fous par pays et instrument.", icon: Settings },
  security: { title: "Sécurité", subtitle: "Comptes, authentification renforcée et traces sensibles.", icon: ShieldCheck },
  reporting: { title: "Reporting", subtitle: "Vue consolidée de l'activité, du financement et des remboursements.", icon: BarChart3 },
};

export function OperationsModule({ module }: { module: Module }) {
  const [data, setData] = useState<Ops | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/operations")
      .then(async (response) => {
        if (!response.ok) throw new Error("operations");
        const payload = (await response.json()) as Ops;
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = META[module];
  const Icon = meta.icon;

  const view = useMemo<ViewModel | null>(() => {
    if (!data) return null;

    const confirmedPayments = data.payments.filter((payment) => payment.status === "CONFIRMED");
    const confirmedCash = confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const late = data.repayments.filter((repayment) => repayment.status === "LATE");
    const outstanding = data.repayments
      .filter((repayment) => repayment.status !== "PAID")
      .reduce(
        (sum, repayment) =>
          sum + Math.max(0, repayment.capitalAmount + repayment.interestAmount + repayment.feeAmount - repayment.paidAmount),
        0
      );
    const activeOffers = data.offers.filter((offer) => ["PUBLISHED", "SUSPENDED"].includes(offer.status));
    const invested = data.investments
      .filter((investment) => investment.status === "CONFIRMED")
      .reduce((sum, investment) => sum + investment.amount, 0);
    const verifiedUsers = data.users.filter((user) => user.kycStatus === "VERIFIED").length;
    const twoFactor = data.users.filter((user) => user.twoFactor).length;
    const approvedProjects = data.projects.filter((project) =>
      ["APPROVED", "OFFER_PREPARED", "OFFER_CONFIRMED", "PUBLISHED"].includes(project.status)
    );

    switch (module) {
      case "accounting":
        return {
          metrics: [
            ["Encaissements confirmés", formatFCFA(confirmedCash)],
            ["Capital confirmé", formatFCFA(invested)],
            ["Créances échéancées", formatFCFA(outstanding)],
          ],
          rows: data.payments.slice(0, 10).map((payment) => ({
            title: payment.reference,
            detail: `${formatFCFA(payment.amount)} · ${payment.method}`,
            status: payment.status,
          })),
          note: "Cette vue rapproche les objets opérationnels existants. Un grand livre persistant en partie double reste une couche distincte à brancher avant exploitation réelle.",
        };
      case "risk":
        return {
          metrics: [
            ["Exposition active", formatFCFA(activeOffers.reduce((sum, offer) => sum + offer.collectedAmount, 0))],
            ["Échéances en retard", String(late.length)],
            ["Capital restant suivi", formatFCFA(outstanding)],
          ],
          rows: [...late, ...data.repayments.filter((repayment) => repayment.status === "PARTIAL")]
            .slice(0, 10)
            .map((repayment) => ({
              title: repayment.offer?.project?.company?.name ?? "Financement",
              detail: `${formatFCFA(repayment.capitalAmount + repayment.interestAmount + repayment.feeAmount)} · ${new Date(repayment.scheduleDate).toLocaleDateString("fr-FR")}`,
              status: repayment.status,
            })),
          note: "Un retard commercial n'est pas automatiquement une fraude. Les alertes servent à déclencher une revue et non à produire seules une décision.",
        };
      case "contracts":
        return {
          metrics: [
            ["Offres structurées", String(data.offers.length)],
            ["À confirmer", String(data.projects.filter((project) => project.status === "OFFER_PREPARED").length)],
            ["Publiées", String(data.offers.filter((offer) => offer.status === "PUBLISHED").length)],
          ],
          rows: data.projects
            .filter((project) => project.offer)
            .slice(0, 10)
            .map((project) => ({ title: project.company?.name ?? "Entreprise", detail: project.title, status: project.status })),
          note: "Les versions contractuelles et signatures doivent être archivées dans un stockage documentaire privé avant passage en argent réel.",
        };
      case "support":
        return {
          metrics: [
            ["Événements audités", String(data.audit.length)],
            ["Utilisateurs", String(data.users.length)],
            ["Actions affichées", String(Math.min(12, data.audit.length))],
          ],
          rows: data.audit.slice(0, 12).map((entry) => ({
            title: entry.action,
            detail: entry.user?.email ?? "Système",
            status: entry.entity,
          })),
          note: "La messagerie client et le ticketing doivent rester distincts des journaux d'audit. Cette vue ne présente pas un journal technique comme une conversation client.",
        };
      case "acquisition":
        return {
          metrics: [
            ["Entreprises", String(data.companies.length)],
            ["Dossiers", String(data.projects.length)],
            ["Dossiers approuvés", String(approvedProjects.length)],
          ],
          rows: data.companies.slice(0, 12).map((company) => ({
            title: company.name,
            detail: `${company.sector} · ${company.country}`,
            status: company.status,
          })),
          note: "Les relances commerciales ne doivent être envoyées qu'avec la base de contact et les consentements applicables.",
        };
      case "security":
        return {
          metrics: [
            ["Comptes", String(data.users.length)],
            ["2FA déclarée", `${twoFactor}/${data.users.length}`],
            ["KYC vérifiés", `${verifiedUsers}/${data.users.length}`],
          ],
          rows: data.audit
            .filter((entry) => /LOGIN|AUTH|ADMIN|KYC|SECUR/i.test(entry.action))
            .slice(0, 12)
            .map((entry) => ({ title: entry.action, detail: entry.user?.email ?? "Système", status: entry.entity })),
          note: "La présence du champ 2FA ne vaut pas intégration TOTP. Une authentification renforcée réelle doit être branchée avant exploitation sensible.",
        };
      case "reporting":
        return {
          metrics: [
            ["Capital confirmé", formatFCFA(invested)],
            ["Collecte affichée", formatFCFA(data.offers.reduce((sum, offer) => sum + offer.collectedAmount, 0))],
            ["Investissements", String(data.investments.length)],
          ],
          rows: data.offers.slice(0, 12).map((offer) => ({
            title: offer.project?.company?.name ?? "Offre",
            detail: `${formatFCFA(offer.collectedAmount)} / ${formatFCFA(offer.targetAmount)}`,
            status: offer.status,
          })),
          note: "Les rapports réglementaires définitifs dépendent des obligations validées pour chaque pays, instrument et statut de la plateforme.",
        };
      case "configuration":
      default:
        return {
          metrics: [
            ["Pays configuré en démonstration", "Côte d'Ivoire"],
            ["Devise", "XOF"],
            ["Mode", "Démonstration"],
          ],
          rows: [
            { title: "Côte d'Ivoire", detail: "XOF · dette et capital en environnement de démonstration", status: "ACTIF" },
            { title: "Autres pays", detail: "Activation conditionnée aux validations juridiques, paiements et documents locaux", status: "À VALIDER" },
          ],
          note: "Aucun moyen de paiement, instrument ou régime juridique n'est considéré disponible dans toute l'Afrique de l'Ouest par défaut.",
        };
    }
  }, [data, module]);

  return (
    <AdminShell title={meta.title} subtitle={meta.subtitle}>
      {error ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Impossible de charger les données opérationnelles.</p>
        </Card>
      ) : !view ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="nx-skeleton h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {view.metrics.map(([label, value]) => (
              <Card key={label} className="relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#101010]/42">{label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#101010]">{value}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#EFFBDD]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.5fr)]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Vue opérationnelle</h2>
                <Badge variant="accent">Données réelles</Badge>
              </div>
              <div className="divide-y divide-[#101010]/7">
                {view.rows.length ? (
                  view.rows.map((row, index) => (
                    <div key={`${row.title}-${index}`} className="flex items-start justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.title}</p>
                        <p className="mt-0.5 text-xs text-[#101010]/50">{row.detail}</p>
                      </div>
                      <Badge>{row.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="py-10 text-center text-sm text-[#101010]/45">Aucune donnée dans cet état.</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#166534]" />
                <h2 className="font-bold">Cadre de contrôle</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#101010]/60">{view.note}</p>
              <div className="mt-5 rounded-[14px] bg-[#F5F5F3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-[#101010]/45">Dernière consolidation</p>
                <p className="mt-1 text-sm font-semibold">{new Date(data.generatedAt).toLocaleString("fr-FR")}</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
