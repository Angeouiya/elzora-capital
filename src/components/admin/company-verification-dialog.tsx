"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
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
import { getCountryLabel } from "@/lib/countries";

interface CompanyCase {
  id: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  country: string;
  address: string;
  registrationNo: string;
  taxId: string | null;
  activity: string;
  foundedYear: number | null;
  verificationStatus: string;
  verificationSubmittedAt: string | null;
  verificationReason: string | null;
  verifiedAt: string | null;
  registrationConfirmed: boolean;
  ownershipConfirmed: boolean;
  actingForCompany: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decidedBy: string | null;
  decisionReason: string | null;
  owners: Array<{
    id: string;
    fullName: string;
    birthDate: string;
    nationality: string;
    residenceCountry: string;
    ownershipPct: number;
    controlsByOtherMeans: boolean;
    politicallyExposed: boolean;
  }>;
  representatives: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    mandate: string;
  }>;
}

const STATUS: Record<string, { label: string; className: string }> = {
  incomplete: { label: "À compléter", className: "border-slate-200 bg-slate-50 text-slate-700" },
  pending: { label: "Transmise", className: "border-amber-200 bg-amber-50 text-amber-900" },
  review: { label: "En examen", className: "border-blue-200 bg-blue-50 text-blue-900" },
  verified: { label: "Vérifiée", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "Refusée", className: "border-red-200 bg-red-50 text-red-800" },
  refresh: { label: "Mise à jour demandée", className: "border-amber-200 bg-amber-50 text-amber-900" },
};

export function CompanyVerificationDialog({
  companyId,
  open,
  onOpenChange,
  onChanged,
}: {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<CompanyCase | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/companies/verification?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
      const payload = (await response.json()) as { company?: CompanyCase; canDecide?: boolean; error?: string };
      if (!response.ok || !payload.company) throw new Error(payload.error || "Chargement impossible");
      setItem(payload.company);
      setCanDecide(Boolean(payload.canDecide));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && companyId) void load();
  }, [companyId, load, open]);

  const act = async (action: "review" | "approve" | "reject" | "refresh") => {
    if (!item) return;
    setSaving(action);
    setError(null);
    try {
      const response = await fetch("/api/admin/companies/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: item.id, action, reason }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Action impossible");
      setReason("");
      onChanged();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible");
    } finally {
      setSaving(null);
    }
  };

  const status = item ? STATUS[item.verificationStatus] || { label: item.verificationStatus, className: "" } : null;
  const reasonRequired = reason.trim().length < 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-[#E9DCE6] bg-[#FCF8FB] px-5 py-5 text-left sm:px-6">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFE0EC] text-[#541249]"><ShieldCheck className="h-5 w-5" /></div>
          <DialogTitle>Vérification de l’entreprise</DialogTitle>
          <DialogDescription>Contrôle de l’immatriculation, des représentants et des personnes qui possèdent ou contrôlent l’entreprise.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#541249]" /></div>
        ) : item ? (
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E9DCE6] bg-[#FCF8FB] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-foreground">{item.tradeName || item.legalName}</p>
                <p className="text-sm text-muted-foreground">{item.legalName} · {item.legalForm} · {getCountryLabel(item.country, "fr")}</p>
              </div>
              {status ? <Badge variant="outline" className={status.className}>{status.label}</Badge> : null}
            </div>

            <section>
              <SectionTitle icon={<ShieldCheck className="h-4 w-4" />} title="Identité juridique" />
              <div className="grid gap-x-6 gap-y-3 rounded-2xl border p-4 text-sm sm:grid-cols-2">
                <Info label="Numéro d’immatriculation" value={item.registrationNo} />
                <Info label="Identifiant fiscal" value={item.taxId || "Non renseigné"} />
                <Info label="Adresse du siège" value={item.address} />
                <Info label="Année de création" value={item.foundedYear ? String(item.foundedYear) : "Non renseignée"} />
                <div className="sm:col-span-2"><Info label="Activité" value={item.activity} /></div>
              </div>
            </section>

            <section>
              <SectionTitle icon={<UserRoundCheck className="h-4 w-4" />} title={`Personnes déclarées (${item.owners.length})`} />
              {item.owners.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {item.owners.map((owner) => (
                    <div key={owner.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-semibold text-foreground">{owner.fullName}</p><p className="text-xs text-muted-foreground">Né(e) le {new Date(`${owner.birthDate}T00:00:00`).toLocaleDateString("fr-FR")}</p></div>
                        <Badge variant="outline" className="tnum shrink-0">{owner.ownershipPct.toLocaleString("fr-FR")} %</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <Info label="Nationalité" value={getCountryLabel(owner.nationality, "fr")} />
                        <Info label="Résidence" value={getCountryLabel(owner.residenceCountry, "fr")} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {owner.controlsByOtherMeans ? <Badge variant="secondary">Contrôle autrement</Badge> : null}
                        {owner.politicallyExposed ? <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Vigilance renforcée</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Aucune personne n’a encore été déclarée.</p>}
            </section>

            <section>
              <SectionTitle icon={<UserRoundCheck className="h-4 w-4" />} title="Représentants du compte" />
              <div className="grid gap-3 sm:grid-cols-2">
                {item.representatives.map((representative) => (
                  <div key={representative.id} className="rounded-2xl border p-4">
                    <p className="font-semibold">{representative.firstName} {representative.lastName}</p>
                    <p className="text-sm text-muted-foreground">{representative.email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Pouvoir : {representative.mandate === "manage" ? "gestion" : representative.mandate === "sign" ? "signature" : "consultation"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />} title="Confirmations reçues" />
              <div className="grid gap-2 rounded-2xl border p-4 text-sm sm:grid-cols-3">
                <Confirmation label="Immatriculation exacte" checked={item.registrationConfirmed} />
                <Confirmation label="Propriété complète" checked={item.ownershipConfirmed} />
                <Confirmation label="Pouvoir de représentation" checked={item.actingForCompany} />
              </div>
            </section>

            {canDecide && ["pending", "review"].includes(item.verificationStatus) ? (
              <div className="space-y-2 rounded-2xl border border-[#E4D2E0] bg-[#FCF8FB] p-4">
                <Label htmlFor="company-decision-note">Note de décision</Label>
                <Textarea id="company-decision-note" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Précisez le motif d’une demande de mise à jour ou d’un refus…" />
                <p className="text-xs text-muted-foreground">Le responsable qui prend le dossier en examen ne peut pas rendre la décision finale.</p>
              </div>
            ) : null}

            {item.verificationReason ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dernière demande : {item.verificationReason}</p> : null}
            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          </div>
        ) : error ? (
          <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun dossier disponible.</p>
        )}

        <DialogFooter className="sticky bottom-0 flex-wrap border-t border-[#E9DCE6] bg-white px-5 py-4 sm:justify-between sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          {item && canDecide ? (
            <div className="flex flex-wrap justify-end gap-2">
              {item.verificationStatus === "pending" ? (
                <ActionButton label="Prendre en examen" icon={<SearchCheck className="h-4 w-4" />} busy={saving === "review"} onClick={() => void act("review")} />
              ) : item.verificationStatus === "review" ? (
                <>
                  <ActionButton variant="outline" label="Demander une mise à jour" icon={<RotateCcw className="h-4 w-4" />} busy={saving === "refresh"} disabled={reasonRequired} onClick={() => void act("refresh")} />
                  <ActionButton variant="destructive" label="Refuser" icon={<XCircle className="h-4 w-4" />} busy={saving === "reject"} disabled={reasonRequired} onClick={() => void act("reject")} />
                  <ActionButton label="Vérifier" icon={<CheckCircle2 className="h-4 w-4" />} busy={saving === "approve"} onClick={() => void act("approve")} />
                </>
              ) : null}
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">{icon}{title}</h3>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium text-foreground">{value}</p></div>;
}

function Confirmation({ label, checked }: { label: string; checked: boolean }) {
  return <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${checked ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-700"}`}>{checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}</span><span>{label}</span></div>;
}

function ActionButton({ label, icon, busy, disabled = false, onClick, variant = "default" }: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
}) {
  return <Button variant={variant} onClick={onClick} disabled={busy || disabled}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}{label}</Button>;
}
