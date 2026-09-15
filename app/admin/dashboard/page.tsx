"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NexoraLogo } from "@/components/NexoraLogo";
import { formatFCFA } from "@/lib/calculations";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, Clock, CheckCircle2, XCircle, ArrowRight,
  FolderOpen, TrendingUp, Banknote, AlertOctagon, Eye
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

const priorityTasks = [
  { id: 1, label: "Dossier Agro-Alliance — Validation décaissement 47M FCFA", badge: "Urgent", badgeVariant: "danger" as const, action: "Analyse" },
  { id: 2, label: "KYC Investisseur #2847 — Document manquant à vérifier", badge: "KYC", badgeVariant: "warning" as const, action: "Vérifier" },
  { id: 3, label: "Offre Sol-Invest Dakar — Clôture collecte imminente", badge: "Offre", badgeVariant: "info" as const, action: "Voir" },
  { id: 4, label: "Échéance remboursement Cacao-Export J+3", badge: "Remboursement", badgeVariant: "accent" as const, action: "Suivre" },
];

const anomalies = [
  { id: 1, label: "Virement en double détecté — Dossier #NX-2025-041", time: "Il y a 12 min", severity: "danger" as const },
  { id: 2, label: "Tentative de connexion suspecte — admin@nexora.capital", time: "Il y a 45 min", severity: "warning" as const },
  { id: 3, label: "Écart rapprochement bancaire — Compte séquestre SGCI", time: "Il y a 2h", severity: "warning" as const },
];

interface DashboardData {
  users: { total: number; investors: number; enterprises: number };
  offers: { total: number; published: number; collected: number };
  projects: { total: number; pending: number };
  investments: { count: number; total: number };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);

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
            <div className="w-8 h-8 rounded-full bg-[#EFFBDD] flex items-center justify-center text-xs font-bold text-[#101010]">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-[#101010]">Admin</p>
              <p className="text-xs text-[#101010]/50">Super administrateur</p>
            </div>
          </div>
        }
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5 px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#101010]">Tableau de bord</h1>
            <p className="text-sm text-[#101010]/60">
              Où en suis-je ? Vue d&apos;ensemble de la plateforme
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">
              <Eye className="h-3 w-3 mr-1" />
              Protocole 4-yeux actif
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* KPI Row */}
          <section>
            <h2 className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide mb-4">
              Indicateurs clés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI
                value={data ? String(data.projects.pending) : "…"}
                label="Dossiers en attente"
                icon={<FolderOpen className="h-5 w-5 text-[#101010]/60" />}
                trend="neutral"
                trendValue={data ? `${data.projects.total} projets au total` : "Chargement…"}
              />
              <KPI
                value={data ? String(data.offers.published) : "…"}
                label="Offres publiées"
                icon={<TrendingUp className="h-5 w-5 text-[#101010]/60" />}
                trend="up"
                trendValue={data ? formatFCFA(data.offers.collected) + " collectés" : "Chargement…"}
              />
              <KPI
                value={data ? String(data.investments.count) : "…"}
                label="Investissements"
                icon={<Banknote className="h-5 w-5 text-[#101010]/60" />}
                trend="neutral"
                trendValue={data ? formatFCFA(data.investments.total) + " investis" : "Chargement…"}
              />
              <KPI
                value={data ? String(data.users.total) : "…"}
                label="Utilisateurs"
                icon={<Users className="h-5 w-5 text-[#101010]/60" />}
                trend="neutral"
                trendValue={data ? `${data.users.investors} inv. · ${data.users.enterprises} entr.` : "Chargement…"}
              />
            </div>
          </section>

          {/* Two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Tasks */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Que dois-je faire ? — Tâches prioritaires</CardTitle>
                  <Badge variant="danger">{priorityTasks.length} actions</Badge>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3] hover:bg-[#EFFBDD] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Clock className="h-4 w-4 text-[#101010]/40 shrink-0" />
                      <span className="text-sm text-[#101010]">{task.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge variant={task.badgeVariant}>{task.badge}</Badge>
                      <Button variant="ghost" size="sm">
                        {task.action}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle>Anomalies récentes</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {anomalies.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-[#F5F5F3]">
                    <div className="flex items-start gap-2">
                      {a.severity === "danger" ? (
                        <XCircle className="h-4 w-4 text-[#C62828] mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-[#101010]">{a.label}</p>
                        <p className="text-xs text-[#101010]/50 mt-1">{a.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4">
                Voir toutes les anomalies
              </Button>
            </Card>
          </div>

          {/* Indicators Row */}
          <section>
            <h2 className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide mb-4">
              Que se passera-t-il ensuite ? — Indicateurs de suivi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#101010]/60">Taux impayés 30j</span>
                  <Badge variant="success">Conforme</Badge>
                </div>
                <p className="text-2xl font-bold text-[#101010]">0,8%</p>
                <p className="text-xs text-[#101010]/50 mt-1">Seuil réglementaire : 3%</p>
              </Card>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#101010]/60">Comptes séquestres</span>
                  <Badge variant="success">Équilibré</Badge>
                </div>
                <p className="text-2xl font-bold text-[#101010]">100%</p>
                <p className="text-xs text-[#101010]/50 mt-1">Rapprochement comptes séquestres</p>
              </Card>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#101010]/60">CA plateforme</span>
                  <Badge variant="accent">Ce mois</Badge>
                </div>
                <p className="text-2xl font-bold text-[#101010]">18,4M FCFA</p>
                <p className="text-xs text-[#101010]/50 mt-1">+12% vs mois précédent</p>
              </Card>
            </div>
          </section>

          {/* 4-eyes protocol */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#EFFBDD]">
                  <Shield className="h-5 w-5 text-[#166534]" />
                </div>
                <div>
                  <CardTitle>Protocole 4-yeux — Décaissements</CardTitle>
                  <p className="text-sm text-[#101010]/60">
                    Chaque décaissement requiert la validation croisée de deux analystes
                  </p>
                </div>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#166534]/5">
                <CheckCircle2 className="h-5 w-5 text-[#166534]" />
                <div>
                  <p className="text-sm font-medium text-[#101010]">Cacao-Export CI</p>
                  <p className="text-xs text-[#101010]/50">Validé — Fall / Ndiaye</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-[#101010]">Agro-Alliance SARL</p>
                  <p className="text-xs text-[#101010]/50">En attente — Signature 2/2</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F5F3]">
                <FolderOpen className="h-5 w-5 text-[#101010]/40" />
                <div>
                  <p className="text-sm font-medium text-[#101010]">Sol-Invest Dakar</p>
                  <p className="text-xs text-[#101010]/50">En préparation</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
