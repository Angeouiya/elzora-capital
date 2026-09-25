"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Ban, CheckCircle2, Loader2, Save, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type {
  DistributionScope,
  MarketAuthorityPath,
  ReviewCheckStatus,
  ReviewDecision,
} from "@/lib/regulatory-review";

export interface AdminRegulatoryReview {
  id: string;
  projectId: string;
  distributionScope: DistributionScope;
  marketAuthorityPath: MarketAuthorityPath;
  corporateActsStatus: ReviewCheckStatus;
  paymentSafeguardingStatus: ReviewCheckStatus;
  beneficialOwnersStatus: ReviewCheckStatus;
  riskDisclosureStatus: ReviewCheckStatus;
  corporateApprovalRef: string | null;
  paymentProviderName: string | null;
  paymentProviderApprovalRef: string | null;
  fundSafeguardingRef: string | null;
  countryOpinionRef: string | null;
  authorityReference: string | null;
  restrictions: string | null;
  decision: ReviewDecision;
  preparedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  complete: boolean;
  missing: string[];
}

interface ReviewForm {
  distributionScope: DistributionScope;
  marketAuthorityPath: MarketAuthorityPath;
  corporateActsStatus: ReviewCheckStatus;
  paymentSafeguardingStatus: ReviewCheckStatus;
  beneficialOwnersStatus: ReviewCheckStatus;
  riskDisclosureStatus: ReviewCheckStatus;
  corporateApprovalRef: string;
  paymentProviderName: string;
  paymentProviderApprovalRef: string;
  fundSafeguardingRef: string;
  countryOpinionRef: string;
  authorityReference: string;
  restrictions: string;
}

const EMPTY_FORM: ReviewForm = {
  distributionScope: "pending",
  marketAuthorityPath: "pending",
  corporateActsStatus: "pending",
  paymentSafeguardingStatus: "pending",
  beneficialOwnersStatus: "pending",
  riskDisclosureStatus: "pending",
  corporateApprovalRef: "",
  paymentProviderName: "",
  paymentProviderApprovalRef: "",
  fundSafeguardingRef: "",
  countryOpinionRef: "",
  authorityReference: "",
  restrictions: "",
};

const CHECK_OPTIONS: Array<{ value: ReviewCheckStatus; label: string }> = [
  { value: "pending", label: "À vérifier" },
  { value: "confirmed", label: "Confirmé" },
  { value: "blocked", label: "Point bloquant" },
];

export function RegulatoryReviewDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  review,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  review: AdminRegulatoryReview | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ReviewForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState<ReviewDecision | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      review
        ? {
            distributionScope: review.distributionScope,
            marketAuthorityPath: review.marketAuthorityPath,
            corporateActsStatus: review.corporateActsStatus,
            paymentSafeguardingStatus: review.paymentSafeguardingStatus,
            beneficialOwnersStatus: review.beneficialOwnersStatus,
            riskDisclosureStatus: review.riskDisclosureStatus,
            corporateApprovalRef: review.corporateApprovalRef || "",
            paymentProviderName: review.paymentProviderName || "",
            paymentProviderApprovalRef: review.paymentProviderApprovalRef || "",
            fundSafeguardingRef: review.fundSafeguardingRef || "",
            countryOpinionRef: review.countryOpinionRef || "",
            authorityReference: review.authorityReference || "",
            restrictions: review.restrictions || "",
          }
        : EMPTY_FORM
    );
  }, [open, review]);

  const update = <K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (decision: ReviewDecision) => {
    setSubmitting(decision);
    try {
      const response = await fetch("/api/admin/regulatory-reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...form, decision }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; missing?: string[] }
        | null;
      if (!response.ok) {
        const detail = payload?.missing?.length
          ? `À compléter : ${payload.missing.join(", ")}.`
          : payload?.error;
        toast({
          title: "Revue non enregistrée",
          description: detail || "Veuillez vérifier les informations.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title:
          decision === "cleared"
            ? "Cadre confirmé"
            : decision === "blocked"
              ? "Publication suspendue"
              : "Étude enregistrée",
        description:
          decision === "cleared"
            ? "Le dossier peut poursuivre son parcours de validation."
            : "La décision et ses justificatifs sont désormais tracés.",
      });
      onOpenChange(false);
      onSaved();
    } catch {
      toast({
        title: "Connexion interrompue",
        description: "Réessayez dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#541249]" />
            Cadre de publication
          </DialogTitle>
          <DialogDescription>
            {projectTitle}. Cette revue conditionne l’approbation et la publication de l’offre.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[#D9BFD4] bg-[#FCF8FB] p-3 text-xs leading-5 text-[#541249]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Chaque choix doit être soutenu par un document vérifiable. Cette grille organise la décision ; elle ne remplace pas l’avis juridique applicable au pays et à l’opération.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          Enregistrez d’abord l’étude. Pour protéger la décision, une seconde personne habilitée devra confirmer le cadre de publication.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Périmètre de diffusion">
            <Select
              value={form.distributionScope}
              onValueChange={(value) => update("distributionScope", value as DistributionScope)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">À qualifier</SelectItem>
                <SelectItem value="restricted_private">Cercle privé encadré</SelectItem>
                <SelectItem value="public_offering">Diffusion relevant d’une autorité</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Parcours auprès de l’autorité de marché">
            <Select
              value={form.marketAuthorityPath}
              onValueChange={(value) => update("marketAuthorityPath", value as MarketAuthorityPath)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">À qualifier</SelectItem>
                <SelectItem value="private_route_confirmed">Parcours privé confirmé par conseil</SelectItem>
                <SelectItem value="authority_clearance">Position écrite de l’autorité</SelectItem>
                <SelectItem value="visa_obtained">Visa obtenu</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <CheckField label="Actes et autorisations de l’entreprise" value={form.corporateActsStatus} onChange={(value) => update("corporateActsStatus", value)} />
          <CheckField label="Circuit de paiement et protection des fonds" value={form.paymentSafeguardingStatus} onChange={(value) => update("paymentSafeguardingStatus", value)} />
          <CheckField label="Dirigeants et bénéficiaires effectifs" value={form.beneficialOwnersStatus} onChange={(value) => update("beneficialOwnersStatus", value)} />
          <CheckField label="Information complète des investisseurs" value={form.riskDisclosureStatus} onChange={(value) => update("riskDisclosureStatus", value)} />

          <Field label="Référence de la décision sociale · requise">
            <Input
              value={form.corporateApprovalRef}
              onChange={(event) => update("corporateApprovalRef", event.target.value)}
              placeholder="PV d’assemblée, décision d’associés ou mandat"
              maxLength={240}
            />
          </Field>

          <Field label="Prestataire de paiement retenu · requis">
            <Input
              value={form.paymentProviderName}
              onChange={(event) => update("paymentProviderName", event.target.value)}
              placeholder="Nom légal du prestataire autorisé"
              maxLength={240}
            />
          </Field>

          <Field label="Agrément ou enregistrement du prestataire · requis">
            <Input
              value={form.paymentProviderApprovalRef}
              onChange={(event) => update("paymentProviderApprovalRef", event.target.value)}
              placeholder="Référence vérifiée auprès de l’autorité"
              maxLength={240}
            />
          </Field>

          <Field label="Protection des fonds · preuve requise">
            <Input
              value={form.fundSafeguardingRef}
              onChange={(event) => update("fundSafeguardingRef", event.target.value)}
              placeholder="Convention, compte dédié ou attestation"
              maxLength={240}
            />
          </Field>

          <Field label="Référence de l’avis juridique local">
            <Input
              value={form.countryOpinionRef}
              onChange={(event) => update("countryOpinionRef", event.target.value)}
              placeholder="Ex. AVIS-CI-2026-014"
              maxLength={240}
            />
          </Field>

          <Field label={form.distributionScope === "public_offering" ? "Référence de l’autorité · requise" : "Référence de l’autorité · si applicable"}>
            <Input
              value={form.authorityReference}
              onChange={(event) => update("authorityReference", event.target.value)}
              placeholder="Visa, courrier ou position écrite"
              maxLength={240}
            />
          </Field>
        </div>

        <Field label="Conditions, limites ou point bloquant">
          <Textarea
            value={form.restrictions}
            onChange={(event) => update("restrictions", event.target.value)}
            placeholder="Accès restreint, plafond, pays admis, réserve du conseil…"
            rows={3}
            maxLength={3000}
          />
        </Field>

        {review?.missing?.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-semibold">Éléments encore attendus</p>
            <p className="mt-1 leading-5">{review.missing.join(" · ")}</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!!submitting}
            onClick={() => void submit("blocked")}
            className="border-red-200 text-red-800 hover:bg-red-50"
          >
            {submitting === "blocked" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Suspendre
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={!!submitting} onClick={() => void submit("pending")}>
              {submitting === "pending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer l’étude
            </Button>
            <Button type="button" className="btn-nexora" disabled={!!submitting} onClick={() => void submit("cleared")}>
              {submitting === "cleared" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmer le cadre
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function CheckField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReviewCheckStatus;
  onChange: (value: ReviewCheckStatus) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => onChange(next as ReviewCheckStatus)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {CHECK_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
