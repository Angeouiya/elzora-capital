"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ExternalLink, FileText, Loader2, RotateCcw, SearchCheck, ShieldCheck, XCircle } from "lucide-react";

interface KycDocument {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

interface KycCase {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  kycStatus: string;
  identityType: string;
  identityNumber: string;
  documentCountry: string;
  expiresAt: string | null;
  residentialAddress: string;
  city: string;
  occupation: string;
  sourceOfFunds: string;
  politicallyExposed: boolean;
  actingForSelf: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decidedBy: string | null;
  decisionReason: string | null;
  investmentExperience: string | null;
  investmentObjective: string | null;
  investmentHorizon: string | null;
  investableCapitalRange: string | null;
  lossCapacity: string | null;
  riskComfort: string | null;
  investorAttentionLevel: string | null;
  investorProfileCompletedAt: string | null;
  investorProfileExpiresAt: string | null;
  documents: KycDocument[];
}

export function KycReviewDialog({ userId, open, onOpenChange, onChanged }: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<KycCase | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/kyc?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json() as { error?: string; cases?: KycCase[]; canDecide?: boolean };
        if (!response.ok) throw new Error(json.error || "Chargement impossible");
        setItem(json.cases?.[0] ?? null);
        setCanDecide(Boolean(json.canDecide));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && userId) load();
  }, [open, userId]);

  async function act(action: "review" | "approve" | "reject" | "refresh") {
    if (!item) return;
    setSaving(action);
    setError(null);
    try {
      const response = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.userId, action, reason }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || "Action impossible");
      setReason("");
      onChanged();
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EAF3] text-[#541249]"><ShieldCheck className="h-5 w-5" /></div>
          <DialogTitle>Contrôle d’identité</DialogTitle>
          <DialogDescription>Consultation confidentielle, accès tracé et décision à quatre yeux.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#541249]" /></div>
        ) : item ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FCF8FB] p-4">
              <div><p className="font-semibold">{item.firstName} {item.lastName}</p><p className="text-sm text-muted-foreground">{item.email}</p></div>
              <Badge variant="outline" className="capitalize">{item.kycStatus}</Badge>
            </div>

            <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Pièce" value={`${labelIdentity(item.identityType)} · ${item.identityNumber}`} />
              <Info label="Pays d’émission" value={item.documentCountry} />
              <Info label="Expiration" value={item.expiresAt || "Non renseignée"} />
              <Info label="Résidence" value={`${item.residentialAddress}, ${item.city}`} />
              <Info label="Profession" value={item.occupation} />
              <Info label="Origine des fonds" value={labelSource(item.sourceOfFunds)} />
              <Info label="Personne politiquement exposée" value={item.politicallyExposed ? "Oui — vigilance renforcée" : "Non"} />
              <Info label="Agit pour son compte" value={item.actingForSelf ? "Oui" : "Non"} />
            </div>

            <div className="rounded-2xl border border-[#E8D7E5] bg-[#FCF8FB] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Projet d’investissement</p>
                <Badge variant="outline" className={item.investorProfileCompletedAt ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}>
                  {item.investorProfileCompletedAt ? "Complété" : "Non complété"}
                </Badge>
              </div>
              {item.investorProfileCompletedAt ? (
                <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Info label="Expérience" value={labelInvestorAnswer("experience", item.investmentExperience)} />
                  <Info label="Objectif" value={labelInvestorAnswer("objective", item.investmentObjective)} />
                  <Info label="Horizon" value={labelInvestorAnswer("horizon", item.investmentHorizon)} />
                  <Info label="Capital déclaré disponible" value={labelInvestorAnswer("capital", item.investableCapitalRange)} />
                  <Info label="Perte supportable" value={labelInvestorAnswer("loss", item.lossCapacity)} />
                  <Info label="Approche choisie" value={labelInvestorAnswer("risk", item.riskComfort)} />
                  <Info label="Accompagnement" value={item.investorAttentionLevel === "heightened" ? "Explications renforcées" : "Standard"} />
                  <Info label="À actualiser avant le" value={item.investorProfileExpiresAt ? new Date(item.investorProfileExpiresAt).toLocaleDateString("fr-FR") : "Non renseigné"} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">La personne n’a pas encore répondu aux six questions préalables à une souscription.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Justificatifs</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {item.documents.map((document) => (
                  <a
                    key={document.id}
                    href={`/api/admin/kyc/documents/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-[#CDA8C6] hover:bg-[#FCF8FB]"
                  >
                    <FileText className="h-5 w-5 text-[#541249]" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{labelDocument(document.kind)}</span><span className="block truncate text-xs text-muted-foreground">{document.fileName} · {(document.size / 1024 / 1024).toFixed(1)} Mo</span></span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#541249]" />
                  </a>
                ))}
              </div>
            </div>

            {canDecide ? (
              <div className="space-y-2 rounded-2xl border border-[#E8D7E5] p-4">
                <Label htmlFor="kyc-reason">Note de décision</Label>
                <Textarea id="kyc-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motif obligatoire pour un refus ou une demande de mise à jour…" />
                <p className="text-xs text-muted-foreground">La personne qui prend le dossier en revue ne peut pas rendre la décision finale.</p>
              </div>
            ) : null}

            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun dossier disponible.</p>
        )}

        <DialogFooter className="flex-wrap sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          {item && canDecide ? (
            <div className="flex flex-wrap justify-end gap-2">
              {item.kycStatus === "pending" ? (
                <ActionButton label="Prendre en revue" icon={<SearchCheck className="h-4 w-4" />} busy={saving === "review"} onClick={() => act("review")} />
              ) : item.kycStatus === "review" ? (
                <>
                  <ActionButton variant="outline" label="Mise à jour" icon={<RotateCcw className="h-4 w-4" />} busy={saving === "refresh"} onClick={() => act("refresh")} />
                  <ActionButton variant="destructive" label="Refuser" icon={<XCircle className="h-4 w-4" />} busy={saving === "reject"} onClick={() => act("reject")} />
                  <ActionButton label="Valider" icon={<CheckCircle2 className="h-4 w-4" />} busy={saving === "approve"} onClick={() => act("approve")} />
                </>
              ) : null}
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-foreground">{value}</p></div>;
}

function ActionButton({ label, icon, busy, onClick, variant = "default" }: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
}) {
  return <Button variant={variant} onClick={onClick} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}{label}</Button>;
}

function labelIdentity(value: string) {
  return ({ national_id: "Carte nationale d’identité", passport: "Passeport", residence_permit: "Titre de séjour" } as Record<string, string>)[value] || value;
}
function labelSource(value: string) {
  return ({ salary: "Salaire", business: "Activité professionnelle", savings: "Épargne", inheritance: "Héritage", investment_income: "Revenus de placement", other: "Autre" } as Record<string, string>)[value] || value;
}
function labelDocument(value: string) {
  return ({ identity_front: "Pièce — recto", identity_back: "Pièce — verso", proof_address: "Justificatif de domicile" } as Record<string, string>)[value] || value;
}
function labelInvestorAnswer(group: "experience" | "objective" | "horizon" | "capital" | "loss" | "risk", value: string | null) {
  if (!value) return "Non renseigné";
  const labels: Record<string, Record<string, string>> = {
    experience: { first_time: "Première expérience", occasional: "Quelques investissements", experienced: "Investit régulièrement" },
    objective: { income: "Recevoir des revenus", growth: "Faire grandir le capital", diversify: "Diversifier l’épargne" },
    horizon: { under_1y: "Moins d’un an", one_to_three: "1 à 3 ans", three_to_five: "3 à 5 ans", over_five: "Plus de 5 ans" },
    capital: { under_100k: "Moins de 100 000 FCFA", "100k_500k": "100 000 à 500 000 FCFA", "500k_2m": "500 000 à 2 000 000 FCFA", "2m_10m": "2 000 000 à 10 000 000 FCFA", over_10m: "Plus de 10 000 000 FCFA" },
    loss: { limited: "Très limitée", partial: "Une partie", substantial: "Une grande partie" },
    risk: { cautious: "Prudente", balanced: "Équilibrée", dynamic: "Dynamique" },
  };
  return labels[group][value] || value;
}
