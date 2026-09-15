"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, Download, LoaderCircle, Filter, Clock,
  UserCircle, Building2, FilePlus, CheckCircle2, XCircle, Send
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

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
}

const actionIcons: Record<string, typeof CheckCircle2> = {
  PROJECT_SUBMITTED: Send,
  PROJECT_APPROVED: CheckCircle2,
  PROJECT_REJECTED: XCircle,
  OFFER_PUBLISHED: FilePlus,
  INVESTMENT_CREATED: UserCircle,
  DISBURSEMENT_CREATED: CreditCard,
  DISBURSEMENT_APPROVED: CheckCircle2,
  REPAYMENT_PAID: CheckCircle2,
  USER_REGISTERED: UserCircle,
  KYC_SUBMITTED: FileCheck,
};

const actionColors: Record<string, string> = {
  PROJECT_SUBMITTED: "bg-blue-50 text-blue-700",
  PROJECT_APPROVED: "bg-[#EFFBDD] text-[#166534]",
  PROJECT_REJECTED: "bg-[#C62828]/10 text-[#C62828]",
  OFFER_PUBLISHED: "bg-[#EFFBDD] text-[#166534]",
  INVESTMENT_CREATED: "bg-purple-50 text-purple-700",
  DISBURSEMENT_CREATED: "bg-amber-50 text-amber-700",
  DISBURSEMENT_APPROVED: "bg-[#EFFBDD] text-[#166534]",
  REPAYMENT_PAID: "bg-[#EFFBDD] text-[#166534]",
  USER_REGISTERED: "bg-blue-50 text-blue-700",
  KYC_SUBMITTED: "bg-amber-50 text-amber-700",
};

const entityLabels: Record<string, string> = {
  Project: "Projet",
  Offer: "Offre",
  Investment: "Investissement",
  Disbursement: "Décaissement",
  Repayment: "Remboursement",
  User: "Utilisateur",
  KYCDocument: "Document KYC",
};

const entityIcons: Record<string, typeof FileText> = {
  Project: FileText,
  Offer: FilePlus,
  Investment: UserCircle,
  Disbursement: CreditCard,
  Repayment: CreditCard,
  User: UserCircle,
  KYCDocument: FileCheck,
};

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [limit, setLimit] = useState("100");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/audit?limit=${limit}`);
      if (!res.ok) throw new Error("Impossible de charger le journal.");
      const data: AuditEntry[] = await res.json();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const entities = Array.from(new Set(logs.map((l) => l.entity)));

  const filtered = logs.filter((log) => {
    const matchEntity = entityFilter === "ALL" || log.entity === entityFilter;
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      (log.details ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.firstName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.lastName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.email ?? "").toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchSearch;
  });

  const exportCSV = () => {
    const header = "Date,Action,Entité,Entité ID,Utilisateur,Détails\n";
    const rows = filtered
      .map((l) =>
        [
          formatDate(l.createdAt),
          formatAction(l.action),
          l.entity,
          l.entityId ?? "",
          l.user ? `${l.user.firstName} ${l.user.lastName}` : "Système",
          (l.details ?? "").replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-nexora-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5 px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#101010]">Journal d&apos;audit</h1>
            <p className="text-sm text-[#101010]/60">
              Où en suis-je ? {filtered.length} entrée{filtered.length > 1 ? "s" : ""} sur {logs.length} au total
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={exportCSV}
          >
            Export CSV
          </Button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-[#101010]/60">
                <Filter className="h-4 w-4" />
                Filtres :
              </div>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "Toutes les entités" },
                  ...entities.map((e) => ({
                    value: e,
                    label: entityLabels[e] ?? e,
                  })),
                ]}
              />
              <Select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                options={[
                  { value: "50", label: "50 dernières" },
                  { value: "100", label: "100 dernières" },
                  { value: "250", label: "250 dernières" },
                  { value: "500", label: "500 dernières" },
                ]}
              />
            </div>
            <div className="w-full md:w-80">
              <Input
                placeholder="Rechercher dans le journal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Que dois-je faire ? */}
          <div className="flex gap-3 flex-wrap">
            <Badge variant="accent">{logs.length} événement{logs.length > 1 ? "s" : ""} enregistréés</Badge>
            <Badge variant="info">{entities.length} type{entities.length > 1 ? "s" : ""} d&apos;entité</Badge>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[#101010]/40">
              <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Card className="border-[#C62828]/20 bg-[#C62828]/5">
              <p className="text-sm text-[#C62828]">{error}</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-sm text-[#101010]/60">Aucune entrée trouvée pour ces filtres.</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-[#101010]/5">
                {filtered.map((log) => {
                  const ActionIcon = actionIcons[log.action] ?? Clock;
                  const EntityIcon = entityIcons[log.entity] ?? FileText;
                  const colorClass = actionColors[log.action] ?? "bg-[#F5F5F3] text-[#101010]/60";

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-[#F5F5F3]/50 transition-colors"
                    >
                      {/* Action icon */}
                      <div
                        className={`p-2 rounded-lg shrink-0 ${colorClass}`}
                      >
                        <ActionIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#101010]">
                            {formatAction(log.action)}
                          </span>
                          <Badge variant="default">
                            <EntityIcon className="h-3 w-3 mr-1" />
                            {entityLabels[log.entity] ?? log.entity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#101010]/50">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </span>
                          {log.user && (
                            <span className="flex items-center gap-1">
                              <UserCircle className="h-3 w-3" />
                              {log.user.firstName} {log.user.lastName}
                            </span>
                          )}
                          {!log.user && <span>Système</span>}
                          {log.entityId && (
                            <span className="font-mono text-[10px] text-[#101010]/30">
                              {log.entityId.slice(0, 12)}…
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-xs text-[#101010]/60 mt-1">{log.details}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Que se passera-t-il ensuite ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que se passera-t-il ensuite ?</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#101010]/60">
              Chaque action sur la plateforme est journalisée et horodatée. Le journal est
              immuable et sert de preuve d&apos;audit. Les exportations CSV peuvent être
              transmises aux commissaires aux comptes et aux régulateurs BCEAO.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
