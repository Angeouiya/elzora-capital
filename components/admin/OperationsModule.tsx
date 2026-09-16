"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, CircleDollarSign, FileCheck2, Headphones, Landmark, Settings, ShieldCheck, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatFCFA } from "@/lib/calculations";

type Module = "accounting" | "risk" | "contracts" | "support" | "acquisition" | "configuration" | "security" | "reporting";

type Ops = { users: any[]; companies: any[]; projects: any[]; offers: any[]; investments: any[]; payments: any[]; disbursements: any[]; repayments: any[]; distributions: any[]; audit: any[]; generatedAt: string };

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
  useEffect(() => { let cancelled = false; fetch("/api/admin/operations").then(async r => { if (!r.ok) throw new Error(); const d = await r.json(); if (!cancelled) setData(d); }).catch(() => !cancelled && setError(true)); return () => { cancelled = true; }; }, []);
  const meta = META[module];
  const Icon = meta.icon;

  const view = useMemo(() => {
    if (!data) return null;
    const confirmedPayments = data.payments.filter(p => p.status === "CONFIRMED");
    const confirmedCash = confirmedPayments.reduce((s, p) => s + p.amount, 0);
    const late = data.repayments.filter(r => r.status === "LATE");
    const outstanding = data.repayments.filter(r => !["PAID"].includes(r.status)).reduce((s, r) => s + Math.max(0, r.capitalAmount + r.interestAmount + r.feeAmount - r.paidAmount), 0);
    const activeOffers = data.offers.filter(o => ["PUBLISHED", "SUSPENDED"].includes(o.status));
    const invested = data.investments.filter(i => i.status === "CONFIRMED").reduce((s, i) => s + i.amount, 0);
    const verifiedUsers = data.users.filter(u => u.kycStatus === "VERIFIED").length;
    const twoFactor = data.users.filter(u => u.twoFactor).length;
    const approvedProjects = data.projects.filter(p => ["APPROVED", "OFFER_PREPARED", "OFFER_CONFIRMED", "PUBLISHED"].includes(p.status));

    if (module === "accounting") return {
      metrics: [["Encaissements confirmés", formatFCFA(confirmedCash)], ["Capital confirmé", formatFCFA(invested)], ["Créances échéancées", formatFCFA(outstanding)]],
      rows: data.payments.slice(0, 10).map(p => ({ title: p.reference, detail: `${formatFCFA(p.amount)} · ${p.method}`, status: p.status })),
      note: "Cette vue rapproche les objets opérationnels existants. Un grand livre persistant en partie double reste une couche distincte à brancher avant exploitation réelle.",
    };
    if (module === "risk") return {
      metrics: [["Exposition active", formatFCFA(activeOffers.reduce((s, o) => s + o.collectedAmount, 0))], ["Échéances en retard", String(late.length)], ["Capital restant suivi", formatFCFA(outstanding)]],
      rows: [...late, ...data.repayments.filter(r => r.status === "PARTIAL")].slice(0, 10).map(r => ({ title: r.offer?.project?.company?.name ?? "Financement", detail: `${formatFCFA(r.capitalAmount + r.interestAmount + r.feeAmount)} · ${new Date(r.scheduleDate).toLocaleDateString("fr-FR")}`, status: r.status })),
      note: "Un retard commercial n'est pas automatiquement une fraude. Les alertes servent à déclencher une revue et non à produire seules une décision.",
    };
    if (module === "contracts") return {
      metrics: [["Offres structurées", String(data.offers.length)], ["À confirmer", String(data.projects.filter(p => p.status === "OFFER_PREPARED").length)], ["Publiées", String(data.offers.filter(o => o.status === "PUBLISHED").length)]],
      rows: data.projects.filter(p => p.offer).slice(0, 10).map(p => ({ title: p.company?.name ?? "Entreprise", detail: p.title, status: p.status })),
      note: "Les versions contractuelles et signatures doivent être archivées dans un stockage documentaire privé avant passage en argent réel.",
    };
    if (module === "support") return {
      metrics: [["Événements audités", String(data.audit.length)], ["Utilisateurs", String(data.users.length)], ["Actions récentes", String(data.audit.filter(a => Date.now() - new Date(a.createdAt).getTime() < 86400000 * 7).length)]],
      rows: data.audit.slice(0, 12).map(a => ({ title: a.action, detail: a.user?.email ?? "Système", status: a.entity })),
      note: "La messagerie client et le ticketing doivent rester distincts des journaux d'audit. Cette vue ne présente pas un journal technique comme une conversation client.",
    };
    if (module === "acquisition") return {
      metrics: [["Entreprises", String(data.companies.length)], ["Dossiers", String(data.projects.length)], ["Dossiers approuvés", String(approvedProjects.length)]],
      rows: data.companies.slice(0, 12).map(c => ({ title: c.name, detail: `${c.sector} · ${c.country}`, status: c.status })),
      note: "Les relances commerciales ne doivent être envoyées qu'avec la base de contact et les consentements applicables.",
    };
    if (module === "security") return {
      metrics: [["Comptes", String(data.users.length)], ["2FA activée", `${twoFactor}/${data.users.length}`], ["KYC vérifiés", `${verifiedUsers}/${data.users.length}`]],
      rows: data.audit.filter(a => /LOGIN|AUTH|ADMIN|KYC|SECUR/i.test(a.action)).slice(0, 12).map(a => ({ title: a.action, detail: a.user?.email ?? "Système", status: a.entity })),
      note: "Les opérations sensibles doivent exiger une authentification renforcée et un principe de séparation des tâches en production.",
    };
    if (module === "reporting") return {
      metrics: [["Capital confirmé", formatFCFA(invested)], ["Collecte affichée", formatFCFA(data.offers.reduce((s, o) => s + o.collectedAmount, 0))], ["Investissements", String(data.investments.length)]],
      rows: data.offers.slice(0, 12).map(o => ({ title: o.project?.company?.name ?? "Offre", detail: `${formatFCFA(o.collectedAmount)} / ${formatFCFA(o.targetAmount)}`, status: o.status })),
      note: "Les rapports réglementaires définitifs dépendent des obligations validées pour chaque pays, instrument et statut de la plateforme.",
    };
    return {
      metrics: [["Pays configuré en démonstration", "Côte d'Ivoire"], ["Devise", "XOF"], ["Mode", "Démonstration"]],
      rows: [
        { title: "Côte d'Ivoire", detail: "XOF · dette et capital en environnement de démonstration", status: "ACTIF" },
        { title: "Autres pays", detail: "Activation conditionnée aux validations juridiques, paiements et documents locaux", status: "À VALIDER" },
      ],
      note: "Aucun moyen de paiement, instrument ou régime juridique n'est considéré disponible dans toute l'Afrique de l'Ouest par défaut.",
    };
  }, [data, module]);

  return <AdminShell title={meta.title} subtitle={meta.subtitle}>
    {error ? <Card className="p-8 text-center"><p className="font-semibold">Impossible de charger les données opérationnelles.</p></Card> : !view ? <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="nx-skeleton h-28"/>)}</div> : <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{view.metrics.map(([label,value]) => <Card key={label} className="relative overflow-hidden"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#101010]/42">{label}</p><p className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#101010]">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#EFFBDD]"><Icon className="h-5 w-5"/></span></div></Card>)}</div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.5fr)]"><Card><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Vue opérationnelle</h2><Badge variant="accent">Données réelles</Badge></div><div className="divide-y divide-[#101010]/7">{view.rows.length ? view.rows.map((row, i) => <div key={`${row.title}-${i}`} className="flex items-start justify-between gap-4 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.title}</p><p className="mt-0.5 text-xs text-[#101010]/50">{row.detail}</p></div><Badge>{row.status}</Badge></div>) : <p className="py-10 text-center text-sm text-[#101010]/45">Aucune donnée dans cet état.</p>}</div></Card><Card><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#166534]"/><h2 className="font-bold">Cadre de contrôle</h2></div><p className="mt-3 text-sm leading-relaxed text-[#101010]/60">{view.note}</p><div className="mt-5 rounded-[14px] bg-[#F5F5F3] p-4"><p className="text-xs font-semibold uppercase tracking-[.08em] text-[#101010]/45">Dernière consolidation</p><p className="mt-1 text-sm font-semibold">{new Date(data!.generatedAt).toLocaleString("fr-FR")}</p></div></Card></div>
    </div>}
  </AdminShell>;
}
