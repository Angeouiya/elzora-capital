"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, getCountryLabel } from "@/lib/countries";
import type { Locale } from "@/lib/store";
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

interface KycDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  status: string;
  onSubmitted: () => void;
}

interface KycState {
  status: string;
  reason: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
}

const inputFileClass = "h-auto min-h-11 cursor-pointer py-1.5 file:mr-3 file:rounded-full file:bg-[#F5EAF3] file:px-3 file:text-[#541249]";

export function KycDialog({ open, onOpenChange, locale, status, onSubmitted }: KycDialogProps) {
  const en = locale === "en";
  const [remote, setRemote] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityType, setIdentityType] = useState("national_id");
  const [country, setCountry] = useState("SN");
  const [sourceOfFunds, setSourceOfFunds] = useState("salary");
  const currentStatus = remote?.status ?? status;
  const editable = ["incomplete", "rejected", "refresh"].includes(currentStatus);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/investor/kyc", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json() as KycState & { error?: string };
        if (!response.ok) throw new Error(json.error || (en ? "Verification unavailable" : "Vérification indisponible"));
        setRemote(json);
      })
      .catch(() => setError(en ? "Unable to load your verification file." : "Impossible de charger votre dossier de vérification."))
      .finally(() => setLoading(false));
  }, [open, en]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("identityType", identityType);
    formData.set("documentCountry", country);
    formData.set("sourceOfFunds", sourceOfFunds);
    formData.set("politicallyExposed", String(formData.get("politicallyExposed") === "on"));
    formData.set("actingForSelf", String(formData.get("actingForSelf") === "on"));
    formData.set("consent", String(formData.get("consent") === "on"));
    try {
      const response = await fetch("/api/investor/kyc", { method: "POST", body: formData });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || (en ? "Submission failed" : "Envoi impossible"));
      setRemote({ status: "pending", reason: null, submittedAt: new Date().toISOString(), verifiedAt: null });
      onSubmitted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : en ? "Submission failed" : "Envoi impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EAF3] text-[#541249]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle>{en ? "Identity verification" : "Vérification d’identité"}</DialogTitle>
          <DialogDescription>
            {en
              ? "A short, secure check is required before your first investment or payout."
              : "Un contrôle simple et sécurisé est requis avant votre premier investissement ou versement."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#541249]" /></div>
        ) : !editable ? (
          <div className="rounded-2xl border border-[#E8D7E5] bg-[#FCF8FB] p-6 text-center">
            {currentStatus === "verified" ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /> : <FileCheck2 className="mx-auto h-10 w-10 text-[#541249]" />}
            <h3 className="mt-3 font-semibold text-foreground">
              {currentStatus === "verified"
                ? en ? "Identity verified" : "Identité vérifiée"
                : en ? "File under review" : "Dossier en cours d’examen"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {currentStatus === "verified"
                ? en ? "Your account is ready to invest and receive payouts." : "Votre compte est prêt pour investir et recevoir vos versements."
                : en ? "Your documents were received. We will notify you as soon as the review is complete." : "Vos documents ont bien été reçus. Vous serez informé dès la fin du contrôle."}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {remote?.reason ? (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>{en ? "Update requested:" : "Mise à jour demandée :"}</strong> {remote.reason}</span>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={en ? "Identity document" : "Pièce d’identité"}>
                <Select value={identityType} onValueChange={setIdentityType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">{en ? "National identity card" : "Carte nationale d’identité"}</SelectItem>
                    <SelectItem value="passport">{en ? "Passport" : "Passeport"}</SelectItem>
                    <SelectItem value="residence_permit">{en ? "Residence permit" : "Titre de séjour"}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={en ? "Document number" : "Numéro de la pièce"}>
                <Input name="identityNumber" autoComplete="off" maxLength={64} required />
              </Field>
              <Field label={en ? "Issuing country" : "Pays d’émission"}>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((item) => <SelectItem key={item.code} value={item.code}>{getCountryLabel(item.code, locale)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={en ? "Expiry date (if any)" : "Date d’expiration (si applicable)"}>
                <Input name="expiresAt" type="date" />
              </Field>
              <Field label={en ? "Residential address" : "Adresse de résidence"}>
                <Input name="residentialAddress" autoComplete="street-address" required />
              </Field>
              <Field label={en ? "City" : "Ville"}>
                <Input name="city" autoComplete="address-level2" required />
              </Field>
              <Field label={en ? "Occupation" : "Profession"}>
                <Input name="occupation" required />
              </Field>
              <Field label={en ? "Main source of funds" : "Origine principale des fonds"}>
                <Select value={sourceOfFunds} onValueChange={setSourceOfFunds}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">{en ? "Salary" : "Salaire"}</SelectItem>
                    <SelectItem value="business">{en ? "Business activity" : "Activité professionnelle"}</SelectItem>
                    <SelectItem value="savings">{en ? "Savings" : "Épargne"}</SelectItem>
                    <SelectItem value="inheritance">{en ? "Inheritance" : "Héritage"}</SelectItem>
                    <SelectItem value="investment_income">{en ? "Investment income" : "Revenus de placement"}</SelectItem>
                    <SelectItem value="other">{en ? "Other" : "Autre"}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="rounded-2xl border border-border/70 p-4">
              <p className="mb-3 text-sm font-semibold">{en ? "Supporting documents" : "Justificatifs"}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={en ? "Document — front" : "Pièce — recto"}><Input className={inputFileClass} name="identityFront" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required /></Field>
                {identityType !== "passport" ? <Field label={en ? "Document — back" : "Pièce — verso"}><Input className={inputFileClass} name="identityBack" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required /></Field> : null}
                <Field label={en ? "Proof of address" : "Justificatif de domicile"}><Input className={inputFileClass} name="proofAddress" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required /></Field>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">PDF, JPG, PNG or WebP · 5 MB max {en ? "per file" : "par fichier"}</p>
            </div>

            <div className="space-y-3 text-sm">
              <Check name="politicallyExposed" label={en ? "I am a politically exposed person (or a close relative)." : "Je suis une personne politiquement exposée (ou un proche)."} />
              <Check name="actingForSelf" required label={en ? "I confirm that I am acting on my own behalf." : "Je confirme agir pour mon propre compte."} />
              <Check name="consent" required label={en ? "I consent to the secure processing of these data for regulatory verification." : "J’accepte le traitement sécurisé de ces données aux fins de vérification réglementaire."} />
            </div>

            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{en ? "Later" : "Plus tard"}</Button>
              <Button type="submit" className="btn-nexora" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {en ? "Send securely" : "Envoyer en toute sécurité"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {!editable && error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium">{label}</Label>{children}</div>;
}

function Check({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-[#E8D7E5] hover:bg-[#FCF8FB]">
      <input name={name} type="checkbox" required={required} className="mt-0.5 h-4 w-4 accent-[#541249]" />
      <span>{label}</span>
    </label>
  );
}
