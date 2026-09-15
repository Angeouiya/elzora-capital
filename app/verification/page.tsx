"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  ChevronDown,
  CircleCheck,
  CircleHelp,
  FileUp,
  Home,
  IdCard,
  Info,
  Landmark,
  ReceiptText,
  Send,
  ShieldCheck,
} from "lucide-react";

const kycSteps = [
  { id: "identite", label: "Identité", icon: IdCard, status: "completed", date: "15 Jan. 2024" },
  { id: "adresse", label: "Justificatif de domicile", icon: Home, status: "completed", date: "15 Jan. 2024" },
  { id: "revenus", label: "Justificatif de revenus", icon: ReceiptText, status: "completed", date: "16 Jan. 2024" },
  { id: "experience", label: "Expérience en investissement", icon: CircleHelp, status: "in_progress", date: null },
  { id: "origine", label: "Origine des fonds", icon: Landmark, status: "pending", date: null },
];

export default function VerificationPage() {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  return (
    <>
      <AppHeader title="Vérification KYC" subtitle="NEXORA CAPITAL" showBack />

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full px-space-md py-space-md space-y-space-md">

          {/* Status Banner */}
          <div className="bg-tertiary-container/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
            <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
              <ShieldCheck className="text-on-tertiary-container w-[24px] h-[24px]" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold block">Niveau 2 sur 3</span>
              <span className="font-body-sm text-body-sm text-on-tertiary-container">Investisseur vérifié — Plafond : 5 000 000 FCFA</span>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm animate-fade-in-up animate-fade-in-up-delay-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-label-caps uppercase text-secondary">Progression globale</span>
              <span className="font-data-mono text-data-mono text-on-surface font-semibold">60%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-tertiary rounded-full animate-progress-fill" style={{ width: "60%" }}></div>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-2">3 documents sur 5 validés. Complétez votre dossier pour augmenter votre plafond.</p>
          </div>

          {/* KYC Steps */}
          <div className="space-y-2 animate-fade-in-up animate-fade-in-up-delay-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Documents requis</h2>
            {kycSteps.map((step) => (
              <div key={step.id} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden hover-lift">
                <button
                  onClick={() => setExpandedDoc(expandedDoc === step.id ? null : step.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      step.status === "completed" ? "bg-tertiary-container" : step.status === "in_progress" ? "bg-primary-container" : "bg-surface-container"
                    }`}>
                      <step.icon className={`w-[20px] h-[20px] ${
                        step.status === "completed" ? "text-on-tertiary-container" : step.status === "in_progress" ? "text-on-surface" : "text-secondary"
                      }`} strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <span className="font-body-md text-body-md text-on-surface font-medium block">{step.label}</span>
                      {step.date && <span className="font-data-mono text-body-sm text-secondary">Validé le {step.date}</span>}
                      {step.status === "in_progress" && <span className="font-body-sm text-body-sm text-primary">En attente de soumission</span>}
                      {step.status === "pending" && <span className="font-body-sm text-body-sm text-secondary">Non commencé</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.status === "completed" && (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-container/60 text-on-tertiary-container font-label-caps text-label-caps font-semibold">Validé</span>
                    )}
                    {step.status === "in_progress" && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-surface font-label-caps text-label-caps font-semibold">En cours</span>
                    )}
                    <ChevronDown className={`w-[20px] h-[20px] text-secondary transition-transform ${expandedDoc === step.id ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </div>
                </button>

                {expandedDoc === step.id && (
                  <div className="px-4 pb-4 border-t border-surface-container animate-scale-in">
                    {step.status === "completed" && (
                      <div className="pt-3 flex items-center gap-3">
                        <CircleCheck className="text-tertiary w-[18px] h-[18px]" strokeWidth={1.5} />
                        <div>
                          <span className="font-body-sm text-body-sm text-on-surface block">Document vérifié par notre équipe conformité</span>
                          <span className="font-data-mono text-label-sm text-secondary">Réf: KYC-{step.id.toUpperCase()}-2024-0842</span>
                        </div>
                      </div>
                    )}
                    {step.status === "in_progress" && (
                      <div className="pt-3 space-y-3">
                        <p className="font-body-sm text-body-sm text-secondary">
                          Veuillez téléverser un document attestant de votre expérience en investissement (relevé de compte-titres, attestation de courtier, etc.)
                        </p>
                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-surface-container-high rounded-lg cursor-pointer hover:border-primary transition-colors">
                          <FileUp className="w-[20px] h-[20px] text-secondary" strokeWidth={1.5} />
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">Choisir un fichier</span>
                          <input type="file" accept=".pdf,.jpg,.png" className="hidden" />
                        </label>
                        <button className="w-full h-10 bg-primary-container text-on-surface font-label-sm text-label-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all hover:opacity-90">
                          <span>Soumettre</span>
                          <Send className="w-[16px] h-[16px]" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                    {step.status === "pending" && (
                      <div className="pt-3">
                        <p className="font-body-sm text-body-sm text-secondary">
                          Cette étape sera débloquée une fois l&apos;étape précédente validée.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl animate-fade-in-up animate-fade-in-up-delay-3">
            <Info className="w-[20px] h-[20px] text-secondary shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <span className="font-body-sm text-body-sm text-on-surface font-medium block">Conformité réglementaire</span>
              <p className="font-body-sm text-body-sm text-secondary leading-relaxed">
                La vérification KYC est obligatoire sur la plateforme Nexora Capital. Vos données sont chiffrées et stockées de manière sécurisée. (Mode démonstration)
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav active="portefeuille" />
    </>
  );
}
