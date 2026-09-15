"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, X, ShieldCheck, UserX, Mail, Calendar, Eye, Clock
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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: string;
  createdAt: string;
  status: string;
  phone?: string;
  investments?: number;
  projects?: number;
}

const mockUsers: UserData[] = [
  { id: "1", name: "Amadou Diallo", email: "amadou.diallo@email.com", role: "INVESTISSEUR", kycStatus: "VERIFIED", createdAt: "2025-08-12", status: "ACTIVE", phone: "+225 07 08 09 10", investments: 4 },
  { id: "2", name: "Fatou Koné", email: "fatou.kone@entreprise.com", role: "ENTREPRISE", kycStatus: "PENDING", createdAt: "2025-09-01", status: "ACTIVE", phone: "+221 77 123 4567", projects: 2 },
  { id: "3", name: "Ibrahima Ndiaye", email: "ibrahima.n@email.com", role: "INVESTISSEUR", kycStatus: "VERIFIED", createdAt: "2025-07-22", status: "ACTIVE", phone: "+225 05 06 07 08", investments: 7 },
  { id: "4", name: "Marie Ouattara", email: "marie.o@nexora.capital", role: "ADMIN", kycStatus: "VERIFIED", createdAt: "2025-01-15", status: "ACTIVE" },
  { id: "5", name: "Seydou Bamba", email: "seydou.b@email.com", role: "INVESTISSEUR", kycStatus: "IN_REVIEW", createdAt: "2025-09-10", status: "PENDING", phone: "+225 01 02 03 04", investments: 0 },
  { id: "6", name: "Aïcha Touré", email: "aicha.t@entreprise.com", role: "ENTREPRISE", kycStatus: "VERIFIED", createdAt: "2025-06-18", status: "ACTIVE", phone: "+223 76 543 2109", projects: 1 },
];

const roleLabels: Record<string, string> = {
  INVESTISSEUR: "Investisseur",
  ENTREPRISE: "Entreprise",
  ADMIN: "Admin",
};

const filters = [
  { label: "Tous", value: "ALL" },
  { label: "Investisseurs", value: "INVESTISSEUR" },
  { label: "Entreprises", value: "ENTREPRISE" },
  { label: "Admins", value: "ADMIN" },
];

export default function AdminUtilisateursPage() {
  const [users, setUsers] = useState<UserData[]>(mockUsers);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setUsers(d); })
      .catch(() => {});
  }, []);

  const filtered = users.filter((u) => {
    const matchRole = filter === "ALL" || u.role === filter;
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

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
          <h1 className="text-xl font-bold text-[#101010]">Gestion des utilisateurs</h1>
          <p className="text-sm text-[#101010]/60">
            Où en suis-je ? {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {filters.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="w-full md:w-80">
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F3] border-b border-[#101010]/5">
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Rôle</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">KYC</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Inscription</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#101010]/70 text-xs uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101010]/5">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="bg-white hover:bg-[#EFFBDD]/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#101010]">{user.name}</td>
                      <td className="px-4 py-3 text-[#101010]/70">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === "ADMIN" ? "danger" : user.role === "ENTREPRISE" ? "info" : "accent"}>
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={user.kycStatus} /></td>
                      <td className="px-4 py-3 text-[#101010]/70">{user.createdAt}</td>
                      <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
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
              <Badge variant="warning">3 KYC en attente</Badge>
              <Badge variant="info">2 nouveaux inscrits aujourd&apos;hui</Badge>
              <Badge variant="danger">1 compte à vérifier</Badge>
            </div>
          </Card>
        </div>
      </main>

      {/* Side Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#101010]/30 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-xl animate-in slide-in-from-right">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101010]">Détails utilisateur</h2>
                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-[#F5F5F3]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#EFFBDD] flex items-center justify-center text-lg font-bold text-[#101010]">
                  {selectedUser.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#101010]">{selectedUser.name}</p>
                  <Badge variant={selectedUser.role === "ADMIN" ? "danger" : selectedUser.role === "ENTREPRISE" ? "info" : "accent"}>
                    {roleLabels[selectedUser.role] || selectedUser.role}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[#101010]/40" />
                  <span className="text-[#101010]">{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="h-4 w-4 text-[#101010]/40" />
                    <span className="text-[#101010]">{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-[#101010]/40" />
                  <span className="text-[#101010]">Inscrit le {selectedUser.createdAt}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Eye className="h-4 w-4 text-[#101010]/40" />
                  <StatusBadge status={selectedUser.kycStatus} />
                </div>
              </div>

              {/* Stats */}
              {selectedUser.investments !== undefined && (
                <Card padding="sm">
                  <p className="text-sm text-[#101010]/60">Investissements</p>
                  <p className="text-2xl font-bold text-[#101010]">{selectedUser.investments}</p>
                </Card>
              )}
              {selectedUser.projects !== undefined && (
                <Card padding="sm">
                  <p className="text-sm text-[#101010]/60">Projets soumis</p>
                  <p className="text-2xl font-bold text-[#101010]">{selectedUser.projects}</p>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide">Actions</p>
                <Button variant="primary" size="sm" className="w-full" icon={<ShieldCheck className="h-4 w-4" />}>
                  Vérifier KYC
                </Button>
                <Button variant="secondary" size="sm" className="w-full" icon={<Mail className="h-4 w-4" />}>
                  Envoyer un message
                </Button>
                <Button variant="destructive" size="sm" className="w-full" icon={<UserX className="h-4 w-4" />}>
                  Suspendre le compte
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
