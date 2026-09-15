"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, Calendar, UsersRound, PauseCircle, CheckCircle2,
  Edit, Eye, Building2, Clock
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

interface Offer {
  id: string;
  projet: string;
  entreprise: string;
  montant: string;
  montantNum: number;
  collecte: string;
  collecteNum: number;
  investisseurs: number;
  statut: string;
  date: string;
  taux: string;
  duree: string;
}

const mockOffers: Offer[] = [
  { id: "OFF-001", projet: "Campagne anacarde 2025", entreprise: "Agro-Alliance SARL", montant: "50 000 000 FCFA", montantNum: 50000000, collecte: "42 500 000 FCFA", collecteNum: 42500000, investisseurs: 12, statut: "ACTIVE", date: "2025-09-01", taux: "9,5%", duree: "12 mois" },
  { id: "OFF-002", projet: "Centrale solaire 500kW", entreprise: "Sol-Invest Dakar", montant: "120 000 000 FCFA", montantNum: 120000000, collecte: "0 FCFA", collecteNum: 0, investisseurs: 0, statut: "DRAFT", date: "2025-09-10", taux: "8,0%", duree: "36 mois" },
  { id: "OFF-003", projet: "Modernisation logistique", entreprise: "Cacao-Export CI", montant: "18 000 000 FCFA", montantNum: 18000000, collecte: "18 000 000 FCFA", collecteNum: 18000000, investisseurs: 6, statut: "COMPLETED", date: "2025-08-15", taux: "10,0%", duree: "6 mois" },
  { id: "OFF-004", projet: "Extension unité textile", entreprise: "Textile Pro CI", montant: "35 000 000 FCFA", montantNum: 35000000, collecte: "12 000 000 FCFA", collecteNum: 12000000, investisseurs: 5, statut: "ACTIVE", date: "2025-09-05", taux: "9,0%", duree: "18 mois" },
];

const statusFilters = [
  { label: "Toutes", value: "ALL" },
  { label: "Brouillon", value: "DRAFT" },
  { label: "Publiée", value: "ACTIVE" },
  { label: "Clôturée", value: "COMPLETED" },
];

export default function AdminOffresPage() {
  const [filter, setFilter] = useState("ALL");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [actionModal, setActionModal] = useState<string | null>(null);

  const filtered = filter === "ALL" ? mockOffers : mockOffers.filter((o) => o.statut === filter);

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
          <h1 className="text-xl font-bold text-[#101010]">Gestion des offres</h1>
          <p className="text-sm text-[#101010]/60">
            Où en suis-je ? {mockOffers.filter((o) => o.statut === "ACTIVE").length} offres actives, {mockOffers.filter((o) => o.statut === "DRAFT").length} en brouillon
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Filters */}
          <div className="flex gap-2">
            {statusFilters.map((f) => (
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

          {/* Offers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((offer) => {
              const progress = offer.montantNum > 0 ? Math.round((offer.collecteNum / offer.montantNum) * 100) : 0;
              return (
                <Card key={offer.id} hover onClick={() => setSelectedOffer(offer)}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[#101010]/50">#{offer.id}</span>
                          <StatusBadge status={offer.statut} />
                        </div>
                        <h3 className="text-base font-semibold text-[#101010]">{offer.projet}</h3>
                        <p className="text-sm text-[#101010]/60">{offer.entreprise}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F5F5F3]">
                        <Building2 className="h-5 w-5 text-[#101010]/40" />
                      </div>
                    </div>

                    <ProgressBar value={progress} label="Progression collecte" />

                    <div className="flex justify-between text-xs text-[#101010]/60">
                      <span>{offer.montant}</span>
                      <span>{offer.taux} · {offer.duree}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#101010]/5">
                      <div className="flex items-center gap-1 text-xs text-[#101010]/50">
                        <UsersRound className="h-3.5 w-3.5" />
                        {offer.investisseurs} investisseur{offer.investisseurs > 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#101010]/50">
                        <Calendar className="h-3.5 w-3.5" />
                        {offer.date}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Que dois-je faire ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que dois-je faire ?</CardTitle>
            </CardHeader>
            <div className="flex gap-3 flex-wrap">
              <Badge variant="warning">1 offre à publier</Badge>
              <Badge variant="info">2 offres en collecte active</Badge>
              <Badge variant="success">1 offre clôturée ce mois</Badge>
            </div>
          </Card>

          {/* Que se passera-t-il ensuite ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que se passera-t-il ensuite ?</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#101010]/60">
              Les offres clôturées déclenchent le décaissement vers le compte séquestre de l&apos;entreprise.
              Le calendrier de remboursement démarre automatiquement.
            </p>
          </Card>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#101010]/30 backdrop-blur-sm" onClick={() => setSelectedOffer(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101010]">Offre #{selectedOffer.id}</h2>
                <button onClick={() => setSelectedOffer(null)} className="p-2 rounded-lg hover:bg-[#F5F5F3]">
                  <Eye className="h-5 w-5 text-[#101010]/40" />
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#101010]">{selectedOffer.projet}</h3>
                <p className="text-sm text-[#101010]/60">{selectedOffer.entreprise}</p>
              </div>

              <StatusBadge status={selectedOffer.statut} />

              <div className="grid grid-cols-2 gap-3">
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Montant</p><p className="text-sm font-bold">{selectedOffer.montant}</p></Card>
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Collecté</p><p className="text-sm font-bold">{selectedOffer.collecte}</p></Card>
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Taux</p><p className="text-sm font-bold">{selectedOffer.taux}</p></Card>
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Durée</p><p className="text-sm font-bold">{selectedOffer.duree}</p></Card>
              </div>

              <ProgressBar
                value={selectedOffer.montantNum > 0 ? Math.round((selectedOffer.collecteNum / selectedOffer.montantNum) * 100) : 0}
                label="Progression"
              />

              <Card padding="sm">
                <div className="flex items-center gap-2 mb-2">
                  <UsersRound className="h-4 w-4 text-[#101010]/40" />
                  <p className="text-sm font-semibold text-[#101010]">{selectedOffer.investisseurs} investisseur{selectedOffer.investisseurs > 1 ? "s" : ""}</p>
                </div>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide">Actions</p>
                {selectedOffer.statut === "DRAFT" && (
                  <Button variant="primary" size="sm" className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setActionModal("publish")}>
                    Publier l&apos;offre
                  </Button>
                )}
                {selectedOffer.statut === "ACTIVE" && (
                  <>
                    <Button variant="secondary" size="sm" className="w-full" icon={<PauseCircle className="h-4 w-4" />} onClick={() => setActionModal("suspend")}>
                      Suspendre la collecte
                    </Button>
                    <Button variant="primary" size="sm" className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setActionModal("close")}>
                      Clôturer l&apos;offre
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" className="w-full" icon={<Edit className="h-4 w-4" />}>
                  Modifier les conditions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal === "publish" ? "Publier l'offre" : actionModal === "suspend" ? "Suspendre la collecte" : "Clôturer l'offre"}
      >
        <p className="text-sm text-[#101010]/60 mb-4">
          {actionModal === "publish" && "L'offre sera visible par tous les investisseurs. La collecte démarre immédiatement."}
          {actionModal === "suspend" && "La collecte sera temporairement suspendue. Les investisseurs existants seront notifiés."}
          {actionModal === "close" && "La collecte sera définitivement clôturée. Le décaissement sera initié selon le protocole 4-yeux."}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setActionModal(null)}>Annuler</Button>
          <Button variant="primary" className="flex-1" onClick={() => setActionModal(null)}>Confirmer</Button>
        </div>
      </Modal>
    </div>
  );
}
