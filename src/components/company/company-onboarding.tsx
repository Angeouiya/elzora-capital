"use client";

import { FormEvent, useState } from "react";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "@/hooks/use-toast";

interface CompanyOnboardingProps {
  onCreated: () => void;
  compact?: boolean;
}

const LEGAL_FORMS = ["EI", "SARL", "SAS", "SA", "SNC", "SCS", "GIE", "COOPERATIVE"];

export function CompanyOnboarding({ onCreated, compact = false }: CompanyOnboardingProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    legalName: "",
    tradeName: "",
    legalForm: "SARL",
    country: "CI",
    registrationNo: "",
    taxId: "",
    address: "",
    activity: "",
    foundedYear: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, foundedYear: form.foundedYear || null }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        toast({
          title: "Entreprise non enregistrée",
          description: payload.error || "Vérifiez les informations saisies.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Entreprise enregistrée",
        description: payload.message || "Le profil est maintenant en cours de vérification.",
      });
      onCreated();
    } catch {
      toast({ title: "Connexion interrompue", description: "Réessayez dans quelques instants.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={compact ? "border-border/70" : "mx-auto max-w-2xl border-border/70"}>
      <CardHeader className="pb-4">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7ECF5] text-[#541249]">
          <Building2 className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">Enregistrer mon entreprise</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Créez le profil juridique de votre société. Vous pourrez préparer un dossier immédiatement ; sa soumission sera ouverte après vérification.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Raison sociale" required>
              <Input value={form.legalName} onChange={(event) => set("legalName", event.target.value)} placeholder="Ex. Kawa Industries SARL" required />
            </Field>
            <Field label="Nom commercial">
              <Input value={form.tradeName} onChange={(event) => set("tradeName", event.target.value)} placeholder="Ex. Kawa" />
            </Field>
            <Field label="Forme juridique" required>
              <Select value={form.legalForm} onValueChange={(value) => set("legalForm", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGAL_FORMS.map((formName) => <SelectItem key={formName} value={formName}>{formName === "COOPERATIVE" ? "Coopérative" : formName}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Pays d’immatriculation" required>
              <Select value={form.country} onValueChange={(value) => set("country", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Numéro RCCM / registre" required>
              <Input value={form.registrationNo} onChange={(event) => set("registrationNo", event.target.value)} placeholder="CI-ABJ-2024-B-00000" required />
            </Field>
            <Field label="Identifiant fiscal">
              <Input value={form.taxId} onChange={(event) => set("taxId", event.target.value)} placeholder="Optionnel" />
            </Field>
            <Field label="Année de création">
              <Input type="number" inputMode="numeric" min="1800" max={new Date().getFullYear()} value={form.foundedYear} onChange={(event) => set("foundedYear", event.target.value)} placeholder="2021" />
            </Field>
            <Field label="Adresse du siège" required>
              <Input value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Ville, quartier, adresse" required />
            </Field>
          </div>
          <Field label="Activité principale" required>
            <Textarea value={form.activity} onChange={(event) => set("activity", event.target.value)} placeholder="Décrivez clairement l’activité, les produits ou services de l’entreprise." rows={3} required />
          </Field>
          <div className="flex items-start gap-2 rounded-lg border border-[#541249]/15 bg-[#FBF6FA] p-3 text-xs leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#541249]" />
            Les informations seront contrôlées avant publication ou collecte. L’enregistrement ne vaut pas validation du dossier.
          </div>
          <Button type="submit" className="btn-nexora w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer l’entreprise"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required ? <span className="ml-1 text-[#8F1D65]">*</span> : null}</Label>
      {children}
    </div>
  );
}
