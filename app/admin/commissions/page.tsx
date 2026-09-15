"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, Calculator, Receipt, TrendingUp, Wallet, Clock
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

interface Facture {
  id: string;
  offre: string;
  entreprise: string;
  montantOffre: string;
  commissionInitiale: string;
  commissionAnnuelle: string;
  totalCommission: string;
  statut: string;
  date: string;
}

const mockFactures: Facture[] = [
  { id: "FAC-001", offre: "Campagne anacarde 2025", entreprise: "Agro-Alliance SARL", montantOffre: "50 000 000 FCFA", commissionInitiale: "3 000 000 FCFA", commissionAnnuelle: "1 000 000 FCFA", totalCommission: "4 000 000 FCFA", statut: "PAID", date: "2025-09-01" },
  { id: "FAC-002", offre: "Modernisation logistique", entreprise: "Cacao-Export CI", montantOffre: "18 000 000 FCFA", commissionInitiale: "1 080 000 FCFA", commissionAnnuelle: "360 000 FCFA", totalCommission: "1 440 000 FCFA", statut: "PAID", date: "2025-08-15" },
  { id: "FAC-003", offre: "Extension textile", entreprise: "Textile Pro CI", montantOffre: "35 000 000 FCFA", commissionInitiale: "2 100 000 FCFA", commissionAnnuelle: "700 000 FCFA", totalCommission: "2 800 000 FCFA", statut: "PENDING", date: "2025-09-05" },
  { id: "FAC-004", offre: "Centrale solaire 500kW", entreprise: "Sol-Invest Dakar", montantOffre: "120 000 000 FCFA", commissionInitiale: "7 200 000 FCFA", commissionAnnuelle: "2 400 000 FCFA", totalCommission: "9 600 000 FCFA", statut: "DRAFT", date: "2025-09-10" },
];

export default function AdminCommissionsPage() {
  const [simulationMontant, setSimulationMontant] = useState("50000000");

  const montantNum = parseInt(simulationMontant) || 0;
  const commissionInitiale = montantNum * 0.06;
  const commissionAnnuelle = montantNum * 0.02;
  const totalCommission = commissionInitiale + commissionAnnuelle;

  const formatFCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F5F5F3]">
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

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5 px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-[#101010]">Commissions</h1>
          <p className="text-sm text-[#101010]/60">
            Où en suis-je ? Suivi des commissions et du chiffre d&apos;affaires
          </p>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* KPI */}
          <section>
            <h2 className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide mb-4">
              Indicateurs commissions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI
                value="17,84M"
                label="CA facturé (FCFA)"
                icon={<Receipt className="h-5 w-5 text-[#101010]/60" />}
                trend="up"
                trendValue="+4 offres ce mois"
              />
              <KPI
                value="8,24M"
                label="CA encaissé (FCFA)"
                icon={<Wallet className="h-5 w-5 text-[#166534]" />}
                trend="up"
                trendValue="46% du CA facturé"
              />
              <KPI
                value="9,6M"
                label="Créances (FCFA)"
                icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
                trend="neutral"
                trendValue="2 factures en attente"
              />
              <KPI
                value="6,2M"
                label="Marge nette (FCFA)"
                icon={<BarChart3 className="h-5 w-5 text-[#101010]/60" />}
                trend="up"
                trendValue="Marge 75%"
              />
            </div>
          </section>

          {/* Distinction CA / Encaissé / Bénéfice */}
          <Card>
            <CardHeader>
              <CardTitle>Distinction financière</CardTitle>
              <CardDescription>
                Chiffre d&apos;affaires vs sommes encaissées vs bénéfice net
              </CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[#EFFBDD]">
                <p className="text-xs text-[#101010]/60 uppercase tracking-wide font-semibold">Chiffre d&apos;affaires</p>
                <p className="text-2xl font-bold text-[#101010] mt-1">17 840 000</p>
                <p className="text-xs text-[#101010]/50 mt-1">Total factures émises</p>
              </div>
              <div className="p-4 rounded-lg bg-[#166534]/5">
                <p className="text-xs text-[#101010]/60 uppercase tracking-wide font-semibold">Sommes encaissées</p>
                <p className="text-2xl font-bold text-[#166534] mt-1">8 240 000</p>
                <p className="text-xs text-[#101010]/50 mt-1">Effectivement reçu</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50">
                <p className="text-xs text-[#101010]/60 uppercase tracking-wide font-semibold">Bénéfice net</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">6 180 000</p>
                <p className="text-xs text-[#101010]/50 mt-1">Après charges et provisions</p>
              </div>
            </div>
          </Card>

          {/* Simulation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#EFFBDD]">
                  <Calculator className="h-5 w-5 text-[#101010]" />
                </div>
                <div>
                  <CardTitle>Simulation de commission</CardTitle>
                  <CardDescription>6% initial + 2% annuel sur le montant collecté</CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#101010] mb-2 block">
                  Montant de l&apos;offre (FCFA)
                </label>
                <input
                  type="number"
                  value={simulationMontant}
                  onChange={(e) => setSimulationMontant(e.target.value)}
                  className="h-11 px-4 rounded-lg border border-[#101010]/10 bg-white text-sm text-[#101010] outline-none focus:ring-2 focus:ring-[#B6FF00]/40 focus:border-[#B6FF00] w-full max-w-xs"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#F5F5F3]">
                  <p className="text-xs text-[#101010]/60">Commission initiale (6%)</p>
                  <p className="text-lg font-bold text-[#101010] mt-1">{formatFCFA(commissionInitiale)}</p>
                </div>
                <div className="p-4 rounded-lg bg-[#F5F5F3]">
                  <p className="text-xs text-[#101010]/60">Commission annuelle (2%)</p>
                  <p className="text-lg font-bold text-[#101010] mt-1">{formatFCFA(commissionAnnuelle)}</p>
                </div>
                <div className="p-4 rounded-lg bg-[#EFFBDD]">
                  <p className="text-xs text-[#101010]/60 font-semibold">Total commission</p>
                  <p className="text-lg font-bold text-[#101010] mt-1">{formatFCFA(totalCommission)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Factures */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-[#101010]/5">
              <h3 className="text-base font-semibold text-[#101010]">Tableau des factures</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F3] border-b border-[#101010]/5">
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Offre</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Montant offre</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Commission 6%</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Commission 2%/an</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101010]/5">
                  {mockFactures.map((f) => (
                    <tr key={f.id} className="bg-white hover:bg-[#F5F5F3]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#101010]">{f.offre}</p>
                          <p className="text-xs text-[#101010]/50">{f.entreprise}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#101010]">{f.montantOffre}</td>
                      <td className="px-4 py-3 text-[#101010]">{f.commissionInitiale}</td>
                      <td className="px-4 py-3 text-[#101010]">{f.commissionAnnuelle}</td>
                      <td className="px-4 py-3 font-bold text-[#101010]">{f.totalCommission}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Que dois-je faire ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que dois-je faire ?</CardTitle>
            </CardHeader>
            <div className="flex gap-3 flex-wrap">
              <Badge variant="warning">1 facture en brouillon à émettre</Badge>
              <Badge variant="info">1 facture en attente de paiement</Badge>
              <Badge variant="success">2 factures payées ce mois</Badge>
            </div>
          </Card>

          {/* Que se passera-t-il ensuite ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que se passera-t-il ensuite ?</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#101010]/60">
              Les commissions annuelles seront facturées à chaque date anniversaire de l&apos;offre.
              Les relances automatiques sont envoyées à J+7 et J+15 pour les factures impayées.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
