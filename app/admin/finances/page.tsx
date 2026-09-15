"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, ArrowDownRight, ArrowUpRight, Clock,
  CheckCircle2, AlertOctagon
} from "lucide-react";

const adminMenu = [
  { label: "Pilotage", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: <Users className="h-4 w-4" /> },
  { label: "Analyse", href: "/admin/analyse", icon: <Search className="h-4 w-4" /> },
  { label: "Offres", href: "/admin/offres", icon: <FileText className="h-4 w-4" /> },
  { label: "Finances", href: "/admin/finances", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Comptabilité", href: "/admin/comptabilite", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Commissions", href: "/admin/commissions", icon: <Percent className="h-4 w-4" /> },
  { label: "Risques", href: "/admin/risques", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Contrats", href: "/admin/contrats", icon: <FileCheck className="h-4 w-4" /> },
  { label: "Assistance", href: "/admin/assistance", icon: <HeadphonesIcon className="h-4 w-4" /> },
  { label: "Configuration", href: "/admin/configuration", icon: <Settings className="h-4 w-4" /> },
  { label: "Sécurité", href: "/admin/securite", icon: <Shield className="h-4 w-4" /> },
  { label: "Audit", href: "/admin/audit", icon: <Clock className="h-4 w-4" /> },
  { label: "Reporting", href: "/admin/reporting", icon: <BarChart3 className="h-4 w-4" /> },
];

const collectes = [
  { id: "COL-001", offre: "Campagne anacarde 2025", montant: "42 500 000 FCFA", statut: "ACTIVE", date: "2025-09-01" },
  { id: "COL-002", offre: "Extension textile", montant: "12 000 000 FCFA", statut: "ACTIVE", date: "2025-09-05" },
  { id: "COL-003", offre: "Modernisation logistique", montant: "18 000 000 FCFA", statut: "COMPLETED", date: "2025-08-15" },
];

const decaissements = [
  { id: "DEC-001", entreprise: "Agro-Alliance SARL", montant: "47 000 000 FCFA", statut: "PENDING", date: "2025-09-14" },
  { id: "DEC-002", entreprise: "Cacao-Export CI", montant: "18 000 000 FCFA", statut: "PAID", date: "2025-09-08" },
];

const echeances = [
  { id: "ECH-001", entreprise: "Cacao-Export CI", montant: "3 000 000 FCFA", date: "2025-10-01", statut: "PENDING" },
  { id: "ECH-002", entreprise: "Agro-Alliance SARL", montant: "4 166 667 FCFA", date: "2025-10-01", statut: "PENDING" },
];

const repartitions = [
  { id: "REP-001", offre: "Modernisation logistique", type: "Remboursement", montant: "3 000 000 FCFA", statut: "PAID", date: "2025-09-10" },
  { id: "REP-002", offre: "Campagne anacarde", type: "Mensuel", montant: "708 333 FCFA", statut: "PENDING", date: "2025-10-01" },
];

const versements = [
  { id: "VER-001", destinataire: "Amadou Diallo", montant: "500 000 FCFA", statut: "PAID", date: "2025-09-12" },
  { id: "VER-002", destinataire: "Ibrahima Ndiaye", montant: "250 000 FCFA", statut: "PENDING", date: "2025-09-14" },
];

const recentOperations = [
  { id: "OP-001", type: "Collecte", label: "Collecte Agro-Alliance", montant: "+5 000 000 FCFA", statut: "CONFIRMED", date: "2025-09-14" },
  { id: "OP-002", type: "Décaissement", label: "Décaissement Cacao-Export", montant: "-18 000 000 FCFA", statut: "PAID", date: "2025-09-08" },
  { id: "OP-003", type: "Remboursement", label: "Échéance Cacao-Export", montant: "+3 000 000 FCFA", statut: "PENDING", date: "2025-09-16" },
  { id: "OP-004", type: "Versement", label: "Dividendes investisseurs", montant: "-1 000 000 FCFA", statut: "PAID", date: "2025-09-10" },
];

const typeConfig: Record<string, string> = {
  Collecte: "bg-[#EFFBDD] text-[#166534]",
  "Décaissement": "bg-amber-50 text-amber-700",
  "Remboursement": "bg-blue-50 text-blue-700",
  Versement: "bg-[#F5F5F3] text-[#101010]/70",
};

export default function AdminFinancesPage() {
  return (
    <div className="flex h-screen bg-[#F5F5F3]">
      <Sidebar
        items={adminMenu}
        header={
          <div className="flex items-center gap-3">
            <NexoraLogo size={36} />
            <div>
              <p className="text-sm font-bold text-[#101010]">Nexora Capital</p>
              <p className="text-xs text-[#101010]/50">Portail Admin</p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EFFBDD] flex items-center justify-center text-xs font-bold text-[#101010]">AD</div>
            <div>
              <p className="text-sm font-medium text-[#101010]">Admin</p>
              <p className="text-xs text-[#101010]/50">Super administrateur</p>
            </div>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5 px-8 py-4">
          <h1 className="text-xl font-bold text-[#101010]">Finances</h1>
          <p className="text-sm text-[#101010]/60">
            Où en suis-je ? Vue d&apos;ensemble des flux financiers
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* KPI */}
          <section>
            <h2 className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide mb-4">
              Indicateurs financiers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI
                value="72,5M"
                label="Total collecté (FCFA)"
                icon={<ArrowDownRight className="h-5 w-5 text-[#166534]" />}
                trend="up"
                trendValue="+18% ce mois"
              />
              <KPI
                value="18M"
                label="Total décaissé (FCFA)"
                icon={<ArrowUpRight className="h-5 w-5 text-[#101010]/60" />}
                trend="neutral"
                trendValue="1 décaissement ce mois"
              />
              <KPI
                value="4,35M"
                label="Commissions encaissées"
                icon={<Percent className="h-5 w-5 text-[#101010]/60" />}
                trend="up"
                trendValue="+12% vs mois dernier"
              />
              <KPI
                value="3,2M"
                label="Impayés (FCFA)"
                icon={<AlertOctagon className="h-5 w-5 text-[#C62828]" />}
                trend="down"
                trendValue="0,8% du portefeuille"
              />
            </div>
          </section>

          {/* Tabs sections */}
          <Tabs
            tabs={[
              {
                id: "collectes",
                label: "Collectes",
                content: (
                  <div className="space-y-3">
                    {collectes.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                        <div>
                          <p className="text-sm font-medium text-[#101010]">{c.offre}</p>
                          <p className="text-xs text-[#101010]/50">{c.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#101010]">{c.montant}</span>
                          <StatusBadge status={c.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "decaissements",
                label: "Décaissements",
                content: (
                  <div className="space-y-3">
                    {decaissements.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                        <div>
                          <p className="text-sm font-medium text-[#101010]">{d.entreprise}</p>
                          <p className="text-xs text-[#101010]/50">{d.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#101010]">{d.montant}</span>
                          <StatusBadge status={d.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "echeanciers",
                label: "Échéanciers",
                content: (
                  <div className="space-y-3">
                    {echeances.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                        <div>
                          <p className="text-sm font-medium text-[#101010]">{e.entreprise}</p>
                          <p className="text-xs text-[#101010]/50">Échéance : {e.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#101010]">{e.montant}</span>
                          <StatusBadge status={e.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "repartitions",
                label: "Répartitions",
                content: (
                  <div className="space-y-3">
                    {repartitions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                        <div>
                          <p className="text-sm font-medium text-[#101010]">{r.offre}</p>
                          <p className="text-xs text-[#101010]/50">{r.type} · {r.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#101010]">{r.montant}</span>
                          <StatusBadge status={r.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "versements",
                label: "Versements",
                content: (
                  <div className="space-y-3">
                    {versements.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                        <div>
                          <p className="text-sm font-medium text-[#101010]">{v.destinataire}</p>
                          <p className="text-xs text-[#101010]/50">{v.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#101010]">{v.montant}</span>
                          <StatusBadge status={v.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />

          {/* Opérations récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Opérations récentes</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {recentOperations.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${typeConfig[op.type]}`}>
                      {op.type}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#101010]">{op.label}</p>
                      <p className="text-xs text-[#101010]/50">{op.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${op.montant.startsWith("+") ? "text-[#166534]" : "text-[#101010]"}`}>
                      {op.montant}
                    </span>
                    <StatusBadge status={op.statut} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Rapprochements */}
          <Card>
            <CardHeader>
              <CardTitle>Rapprochements bancaires</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#166534]/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                  <span className="text-sm text-[#101010]">Compte séquestre SGCI</span>
                </div>
                <Badge variant="success">Équilibré</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#166534]/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                  <span className="text-sm text-[#101010]">Compte collecte Ecobank</span>
                </div>
                <Badge variant="success">Équilibré</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-[#101010]">Compte commissions BCEAO</span>
                </div>
                <Badge variant="warning">Écart 125 000 FCFA</Badge>
              </div>
            </div>
          </Card>

          {/* Que se passera-t-il ensuite ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que se passera-t-il ensuite ?</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#101010]/60">
              Les échéances du 1er octobre seront automatiquement prélevées. Les répartitions seront calculées et versées aux investisseurs dans les 48h suivant chaque encaissement.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
