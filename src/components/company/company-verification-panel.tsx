"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, getCountryLabel } from "@/lib/countries";

type Locale = "fr" | "en";

interface OwnerRecord {
  id?: string;
  fullName: string;
  birthDate: string;
  nationality: string;
  residenceCountry: string;
  ownershipPct: number | string;
  controlsByOtherMeans: boolean;
  politicallyExposed: boolean;
}

interface VerificationResponse {
  company: {
    id: string;
    legalName: string;
    tradeName: string | null;
    legalForm: string;
    country: string;
    address: string;
    registrationNo: string;
    taxId: string | null;
    verificationStatus: string;
    verificationSubmittedAt: string | null;
    verificationReason: string | null;
    verifiedAt: string | null;
  };
  canSubmit: boolean;
  profile: {
    registrationConfirmed: boolean;
    ownershipConfirmed: boolean;
    actingForCompany: boolean;
    submittedAt: string;
  } | null;
  owners: OwnerRecord[];
}

const EMPTY_OWNER: OwnerRecord = {
  fullName: "",
  birthDate: "",
  nationality: "CI",
  residenceCountry: "CI",
  ownershipPct: "",
  controlsByOtherMeans: false,
  politicallyExposed: false,
};

const COPY = {
  fr: {
    title: "Vérification de l’entreprise",
    readyTitle: "Entreprise vérifiée",
    readyText: "Votre entreprise peut transmettre ses dossiers pour analyse.",
    pendingTitle: "Déclaration transmise",
    pendingText: "Notre équipe contrôle les informations. Vous serez averti dès que la décision sera disponible.",
    reviewTitle: "Examen en cours",
    reviewText: "Votre déclaration est actuellement examinée par notre équipe.",
    actionTitle: "Finalisez l’identité de l’entreprise",
    actionText: "Indiquez qui possède ou contrôle l’entreprise. Cette étape est nécessaire avant l’envoi d’un projet.",
    updateTitle: "Une mise à jour est demandée",
    updateText: "Corrigez les informations signalées puis transmettez à nouveau la déclaration.",
    rejectedTitle: "Déclaration à corriger",
    start: "Compléter maintenant",
    update: "Mettre à jour",
    unavailable: "Seul un représentant habilité peut transmettre cette déclaration.",
    dialogTitle: "Qui possède ou contrôle l’entreprise ?",
    dialogText: "Ajoutez chaque personne détenant plus de 25 % du capital ou exerçant un contrôle réel par un autre moyen.",
    owner: "Personne",
    fullName: "Nom et prénoms",
    birthDate: "Date de naissance",
    nationality: "Nationalité",
    residence: "Pays de résidence",
    ownership: "Part détenue (%)",
    control: "Cette personne contrôle l’entreprise par un autre moyen",
    exposed: "Cette personne exerce ou a exercé une fonction publique importante",
    addOwner: "Ajouter une personne",
    remove: "Retirer",
    confirmations: "Vos confirmations",
    confirmRegistration: "Les informations d’immatriculation affichées sont exactes et à jour.",
    confirmOwnership: "La liste ci-dessus présente toutes les personnes concernées.",
    confirmAuthority: "Je suis autorisé à agir et à transmettre cette déclaration pour l’entreprise.",
    registry: "Immatriculation",
    registeredOffice: "Siège",
    cancel: "Plus tard",
    submit: "Transmettre pour vérification",
    submitting: "Transmission…",
    sent: "Déclaration transmise",
    sentText: "L’équipe peut maintenant examiner l’entreprise.",
    errorTitle: "Déclaration non transmise",
    loadError: "Les informations de vérification sont momentanément indisponibles.",
    retry: "Réessayer",
    invalid: "Complétez chaque personne et confirmez les trois déclarations.",
    status: { incomplete: "À compléter", pending: "Transmise", review: "En examen", verified: "Vérifiée", rejected: "À corriger", refresh: "Mise à jour requise" },
  },
  en: {
    title: "Company verification",
    readyTitle: "Company verified",
    readyText: "Your company can submit applications for review.",
    pendingTitle: "Declaration submitted",
    pendingText: "Our team is reviewing the information. You will be notified as soon as a decision is available.",
    reviewTitle: "Review in progress",
    reviewText: "Your declaration is currently being reviewed by our team.",
    actionTitle: "Complete the company identity",
    actionText: "Tell us who owns or controls the company. This step is required before submitting a project.",
    updateTitle: "An update is required",
    updateText: "Correct the requested information and submit the declaration again.",
    rejectedTitle: "Declaration needs correction",
    start: "Complete now",
    update: "Update information",
    unavailable: "Only an authorised representative can submit this declaration.",
    dialogTitle: "Who owns or controls the company?",
    dialogText: "Add every person who owns more than 25% of the company or exercises effective control by another means.",
    owner: "Person",
    fullName: "Full name",
    birthDate: "Date of birth",
    nationality: "Nationality",
    residence: "Country of residence",
    ownership: "Ownership (%)",
    control: "This person controls the company by another means",
    exposed: "This person holds or has held an important public function",
    addOwner: "Add a person",
    remove: "Remove",
    confirmations: "Your confirmations",
    confirmRegistration: "The registration information shown is accurate and up to date.",
    confirmOwnership: "The list above includes every person concerned.",
    confirmAuthority: "I am authorised to act and submit this declaration for the company.",
    registry: "Registration",
    registeredOffice: "Registered office",
    cancel: "Later",
    submit: "Submit for verification",
    submitting: "Submitting…",
    sent: "Declaration submitted",
    sentText: "The team can now review the company.",
    errorTitle: "Declaration not submitted",
    loadError: "Verification information is temporarily unavailable.",
    retry: "Try again",
    invalid: "Complete each person and accept all three confirmations.",
    status: { incomplete: "To complete", pending: "Submitted", review: "Under review", verified: "Verified", rejected: "To correct", refresh: "Update required" },
  },
} as const;

export function CompanyVerificationPanel({
  companyId,
  locale,
  onChanged,
}: {
  companyId: string;
  locale: Locale;
  onChanged: () => void;
}) {
  const copy = COPY[locale];
  const { toast } = useToast();
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [owners, setOwners] = useState<OwnerRecord[]>([{ ...EMPTY_OWNER }]);
  const [confirmations, setConfirmations] = useState({ registration: false, ownership: false, authority: false });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/company/verification?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
      const payload = (await response.json()) as VerificationResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.loadError);
      setData(payload);
      setOwners(payload.owners.length ? payload.owners.map((owner) => ({ ...owner })) : [{ ...EMPTY_OWNER }]);
      setConfirmations({
        registration: Boolean(payload.profile?.registrationConfirmed),
        ownership: Boolean(payload.profile?.ownershipConfirmed),
        authority: Boolean(payload.profile?.actingForCompany),
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveStatus = data?.company.verificationStatus === "pending" && !data.profile
    ? "incomplete"
    : data?.company.verificationStatus || "incomplete";
  const editable = ["incomplete", "rejected", "refresh"].includes(effectiveStatus);
  const formReady = useMemo(
    () =>
      confirmations.registration &&
      confirmations.ownership &&
      confirmations.authority &&
      owners.length > 0 &&
      owners.every((owner) => {
        const ownership = Number(owner.ownershipPct);
        return owner.fullName.trim().length >= 3 && Boolean(owner.birthDate) && Boolean(owner.nationality) &&
          Boolean(owner.residenceCountry) && Number.isFinite(ownership) && ownership >= 0 && ownership <= 100 &&
          (ownership > 25 || owner.controlsByOtherMeans);
      }),
    [confirmations, owners]
  );

  const updateOwner = <K extends keyof OwnerRecord>(index: number, key: K, value: OwnerRecord[K]) => {
    setOwners((current) => current.map((owner, ownerIndex) => ownerIndex === index ? { ...owner, [key]: value } : owner));
  };

  const submit = async () => {
    if (!formReady || !data) {
      toast({ title: copy.errorTitle, description: copy.invalid, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/company/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          registrationConfirmed: confirmations.registration,
          ownershipConfirmed: confirmations.ownership,
          actingForCompany: confirmations.authority,
          owners: owners.map((owner) => ({ ...owner, ownershipPct: Number(owner.ownershipPct) })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.invalid);
      toast({ title: copy.sent, description: copy.sentText });
      setOpen(false);
      await load();
      onChanged();
    } catch (cause) {
      toast({
        title: copy.errorTitle,
        description: cause instanceof Error ? cause.message : copy.invalid,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Card className="h-32 animate-pulse border-[#E9DCE6] bg-[#FCF8FB]" />;
  if (loadError || !data) {
    return (
      <Card className="flex flex-col gap-3 border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-red-800">{copy.loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{copy.retry}</Button>
      </Card>
    );
  }

  const content = statusContent(effectiveStatus, copy);
  const StatusIcon = effectiveStatus === "verified" ? CheckCircle2 : effectiveStatus === "pending" || effectiveStatus === "review" ? Clock3 : ShieldCheck;

  return (
    <>
      <Card className={`overflow-hidden border p-0 ${effectiveStatus === "verified" ? "border-emerald-200 bg-emerald-50/70" : "border-[#E4D2E0] bg-[#FCF8FB]"}`}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 gap-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${effectiveStatus === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-[#EFE0EC] text-[#541249]"}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">{content.title}</h2>
                <Badge variant="outline" className="border-[#D8BED2] bg-white/80 text-[10px] text-[#541249]">
                  {copy.status[effectiveStatus as keyof typeof copy.status] || effectiveStatus}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{content.text}</p>
              {data.company.verificationReason && ["rejected", "refresh"].includes(effectiveStatus) ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{data.company.verificationReason}</p>
              ) : null}
              {!data.canSubmit && editable ? <p className="mt-2 text-xs text-muted-foreground">{copy.unavailable}</p> : null}
            </div>
          </div>
          {editable && data.canSubmit ? (
            <Button className="btn-nexora w-full shrink-0 sm:w-auto" onClick={() => setOpen(true)}>
              <UserRoundCheck className="h-4 w-4" />
              {effectiveStatus === "incomplete" ? copy.start : copy.update}
            </Button>
          ) : null}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-[#E9DCE6] bg-[#FCF8FB] px-5 py-5 text-left sm:px-6">
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFE0EC] text-[#541249]"><UserRoundCheck className="h-5 w-5" /></div>
            <DialogTitle className="text-xl">{copy.dialogTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">{copy.dialogText}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div className="grid gap-3 rounded-2xl border border-[#E9DCE6] bg-[#FCF8FB] p-4 text-sm sm:grid-cols-2">
              <Info label={copy.registry} value={`${data.company.legalForm} · ${data.company.registrationNo}`} />
              <Info label={copy.registeredOffice} value={`${data.company.address} · ${getCountryLabel(data.company.country, locale)}`} />
            </div>

            <div className="space-y-4">
              {owners.map((owner, index) => (
                <div key={owner.id || index} className="rounded-2xl border border-[#E4D2E0] p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-foreground">{copy.owner} {index + 1}</h3>
                    {owners.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setOwners((current) => current.filter((_, ownerIndex) => ownerIndex !== index))}>
                        <Trash2 className="h-4 w-4" />{copy.remove}
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.fullName} className="sm:col-span-2">
                      <Input value={owner.fullName} onChange={(event) => updateOwner(index, "fullName", event.target.value)} autoComplete="name" />
                    </Field>
                    <Field label={copy.birthDate}>
                      <Input type="date" max={new Date().toISOString().slice(0, 10)} value={owner.birthDate} onChange={(event) => updateOwner(index, "birthDate", event.target.value)} />
                    </Field>
                    <Field label={copy.ownership}>
                      <Input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={owner.ownershipPct} onChange={(event) => updateOwner(index, "ownershipPct", event.target.value)} placeholder="40" />
                    </Field>
                    <CountryField label={copy.nationality} value={owner.nationality} locale={locale} onChange={(value) => updateOwner(index, "nationality", value)} />
                    <CountryField label={copy.residence} value={owner.residenceCountry} locale={locale} onChange={(value) => updateOwner(index, "residenceCountry", value)} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    <CheckLine checked={owner.controlsByOtherMeans} onChange={(checked) => updateOwner(index, "controlsByOtherMeans", checked)} label={copy.control} />
                    <CheckLine checked={owner.politicallyExposed} onChange={(checked) => updateOwner(index, "politicallyExposed", checked)} label={copy.exposed} />
                  </div>
                </div>
              ))}
              {owners.length < 20 ? (
                <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setOwners((current) => [...current, { ...EMPTY_OWNER }])}>
                  <Plus className="h-4 w-4" />{copy.addOwner}
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#E4D2E0] bg-[#FCF8FB] p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">{copy.confirmations}</h3>
              <div className="space-y-3">
                <CheckLine checked={confirmations.registration} onChange={(checked) => setConfirmations((current) => ({ ...current, registration: checked }))} label={copy.confirmRegistration} />
                <CheckLine checked={confirmations.ownership} onChange={(checked) => setConfirmations((current) => ({ ...current, ownership: checked }))} label={copy.confirmOwnership} />
                <CheckLine checked={confirmations.authority} onChange={(checked) => setConfirmations((current) => ({ ...current, authority: checked }))} label={copy.confirmAuthority} />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-[#E9DCE6] bg-white px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{copy.cancel}</Button>
            <Button type="button" className="btn-nexora" disabled={!formReady || submitting} onClick={() => void submit()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? copy.submitting : copy.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function statusContent(status: string, copy: typeof COPY.fr | typeof COPY.en) {
  if (status === "verified") return { title: copy.readyTitle, text: copy.readyText };
  if (status === "pending") return { title: copy.pendingTitle, text: copy.pendingText };
  if (status === "review") return { title: copy.reviewTitle, text: copy.reviewText };
  if (status === "refresh") return { title: copy.updateTitle, text: copy.updateText };
  if (status === "rejected") return { title: copy.rejectedTitle, text: copy.updateText };
  return { title: copy.actionTitle, text: copy.actionText };
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>;
}

function CountryField({ label, value, locale, onChange }: { label: string; value: string; locale: Locale; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{getCountryLabel(country.code, locale)}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
}

function CheckLine({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 text-sm leading-relaxed transition-colors hover:border-[#E4D2E0] hover:bg-white">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium text-foreground">{value}</p></div>;
}
