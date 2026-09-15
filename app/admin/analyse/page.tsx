"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { NexoraLogo } from "@/components/NexoraLogo";
import {
  LayoutDashboard, Users, Search, FileText, CreditCard, BookOpen,
  Percent, AlertTriangle, FileCheck, HeadphonesIcon, Settings,
  Shield, BarChart3, CheckCircle2, XCircle, UserPlus, FilePlus,
  ArrowRight, ChevronRight, Eye, Building2, Clock
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

interface Dossier {
  id: string;
  entreprise: string;
  projet: string;
  montant: string;
  secteur: string;
  status: string;
  date: string;
  analyste?: string;
  validations: { analyst: string; status: string; time?: string }[];
}

const mockDossiers: Dossier[] = [
  {
    id: "NX-AGRO-2025",
    entreprise: "Agro-Alliance SARL",
    projet: "Financement campagne anacarde",
    montant: "50 000 000 FCFA",
    secteur: "Agriculture",
    status: "IN_REVIEW",
    date: "2025-09-12",
    analyste: "J. Fall",
    validations: [
      { analyst: "J. Fall", status: "validé", time: "11:20" },
      { analyst: "M. Diop", status: "en attente" },
    ],
  },
  {
    id: "NX-SOL-2025",
    entreprise: "Sol-Invest Dakar",
    projet: "Centrale solaire 500kW",
    montant: "120 000 000 FCFA",
    secteur: "Énergie",
    status: "PENDING",
    date: "2025-09-10",
    validations: [
      { analyst: "Non assigné", status: "en attente" },
      { analyst: "Non assigné", status: "en attente" },
    ],
  },
  {
    id: "NX-TEXT-2025",
    entreprise: "Textile Pro CI",
    projet: "Extension unité de production",
    montant: "35 000 000 FCFA",
    secteur: "Industrie",
    status: "PENDING",
    date: "2025-09-08",
    validations: [
      { analyst: "Non assigné", status: "en attente" },
      { analyst: "Non assigné", status: "en attente" },
    ],
  },
  {
    id: "NX-CACAO-2025",
    entreprise: "Cacao-Export CI",
    projet: "Modernisation chaîne logistique",
    montant: "18 000 000 FCFA",
    secteur: "Agroalimentaire",
    status: "APPROVED",
    date: "2025-09-05",
    analyste: "J. Fall / M. Diop",
    validations: [
      { analyst: "J. Fall", status: "validé", time: "09:42" },
      { analyst: "M. Diop", status: "validé", time: "14:15" },
    ],
  },
];

const circuit = ["Vérification", "Analyse", "Décision", "Publication"];

export default function AdminAnalysePage() {
  const [dossiers] = useState(mockDossiers);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [actionModal, setActionModal] = useState<string | null>(null);

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
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#101010]">Analyse des dossiers</h1>
            <p className="text-sm text-[#101010]/60">
              Où en suis-je ? {dossiers.filter((d) => d.status === "PENDING").length} dossiers en attente d&apos;analyse
            </p>
          </div>
          <Badge variant="accent">
            <Shield className="h-3 w-3 mr-1" />
            Protocole 4-yeux
          </Badge>
        </div>

        <div className="p-8 space-y-6">
          {/* Circuit */}
          <Card>
            <CardHeader>
              <CardTitle>Circuit de traitement</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              {circuit.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium ${i <= 1 ? "bg-[#EFFBDD] text-[#101010]" : "bg-[#F5F5F3] text-[#101010]/50"}`}>
                    {step}
                  </div>
                  {i < circuit.length - 1 && <ChevronRight className="h-4 w-4 text-[#101010]/30" />}
                </div>
              ))}
            </div>
          </Card>

          {/* Que dois-je faire ? */}
          <div className="flex gap-3 flex-wrap">
            <Badge variant="danger">{dossiers.filter((d) => d.status === "PENDING").length} à analyser</Badge>
            <Badge variant="warning">{dossiers.filter((d) => d.status === "IN_REVIEW").length} en cours</Badge>
            <Badge variant="success">{dossiers.filter((d) => d.status === "APPROVED").length} approuvés</Badge>
          </div>

          {/* Dossiers list */}
          <div className="space-y-4">
            {dossiers.map((dossier) => (
              <Card key={dossier.id} hover onClick={() => setSelectedDossier(dossier)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[#F5F5F3]">
                      <Building2 className="h-6 w-6 text-[#101010]/60" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#101010]/50">#{dossier.id}</span>
                        <StatusBadge status={dossier.status} />
                      </div>
                      <h3 className="text-base font-semibold text-[#101010]">{dossier.entreprise}</h3>
                      <p className="text-sm text-[#101010]/60">{dossier.projet}</p>
                      <div className="flex gap-4 mt-2 text-xs text-[#101010]/50">
                        <span>{dossier.montant}</span>
                        <span>{dossier.secteur}</span>
                        <span>{dossier.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dossier.analyste && (
                      <Badge variant="default">{dossier.analyste}</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-[#101010]/30" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Que se passera-t-il ensuite ? */}
          <Card>
            <CardHeader>
              <CardTitle>Que se passera-t-il ensuite ?</CardTitle>
            </CardHeader>
            <p className="text-sm text-[#101010]/60">
              Les dossiers approuvés passent à l&apos;étape Publication. Les offres seront créées et les investisseurs pourront souscrire.
              Les dossiers refusés sont notifiés à l&apos;entreprise avec les motifs.
            </p>
          </Card>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#101010]/30 backdrop-blur-sm" onClick={() => setSelectedDossier(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101010]">Dossier #{selectedDossier.id}</h2>
                <button onClick={() => setSelectedDossier(null)} className="p-2 rounded-lg hover:bg-[#F5F5F3]">
                  <XCircle className="h-5 w-5 text-[#101010]/40" />
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#101010]">{selectedDossier.entreprise}</h3>
                <p className="text-sm text-[#101010]/60">{selectedDossier.projet}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Montant</p><p className="text-sm font-bold">{selectedDossier.montant}</p></Card>
                <Card padding="sm"><p className="text-xs text-[#101010]/60">Secteur</p><p className="text-sm font-bold">{selectedDossier.secteur}</p></Card>
              </div>

              {/* 4-yeux validations */}
              <div>
                <p className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide mb-3">Validations croisées (4-yeux)</p>
                <div className="space-y-2">
                  {selectedDossier.validations.map((v, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${v.status === "validé" ? "bg-[#166534]/5" : "bg-amber-50"}`}>
                      <div className="flex items-center gap-2">
                        {v.status === "validé" ? (
                          <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                        ) : (
                          <Eye className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="text-sm font-medium">{v.analyst}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#101010]/60">{v.status}</p>
                        {v.time && <p className="text-xs font-mono text-[#101010]/40">{v.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#101010]/60 uppercase tracking-wide">Actions</p>
                <Button variant="secondary" size="sm" className="w-full" icon={<UserPlus className="h-4 w-4" />}>
                  Affecter un analyste
                </Button>
                <Button variant="secondary" size="sm" className="w-full" icon={<FilePlus className="h-4 w-4" />}>
                  Demander un complément
                </Button>
                <Button variant="primary" size="sm" className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setActionModal("approve")}>
                  Approuver le dossier
                </Button>
                <Button variant="destructive" size="sm" className="w-full" icon={<XCircle className="h-4 w-4" />} onClick={() => setActionModal("reject")}>
                  Refuser le dossier
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
        title={actionModal === "approve" ? "Confirmer l'approbation" : "Confirmer le refus"}
      >
        <p className="text-sm text-[#101010]/60 mb-4">
          {actionModal === "approve"
            ? "Ce dossier sera approuvé et passera à l'étape de publication. Cette action sera journalisée dans l'audit."
            : "Ce dossier sera refusé. L'entreprise sera notifiée avec les motifs du refus."}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setActionModal(null)}>
            Annuler
          </Button>
          <Button
            variant={actionModal === "approve" ? "primary" : "destructive"}
            className="flex-1"
            onClick={() => setActionModal(null)}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
