"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { COUNTRIES, getCountryLabel } from "@/lib/countries";
import { useAppStore } from "@/lib/store";

interface PendingAccount {
  email: string;
  firstName: string;
  lastName: string;
  locale: "fr" | "en";
}

export function GoogleRegistration() {
  const locale = useAppStore((state) => state.locale);
  const login = useAppStore((state) => state.login);
  const setView = useAppStore((state) => state.setView);
  const [pending, setPending] = useState<PendingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("SN");
  const [kind, setKind] = useState("individual");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const en = locale === "en";
  const copy = en ? {
    kicker: "Google account",
    title: "One last step.",
    intro: "Google confirmed your email. Complete the information required to open your NEXORA account.",
    expired: "This Google sign-in has expired.",
    restart: "Start again with Google",
    firstName: "First name", lastName: "Last name", phone: "Phone", country: "Country of residence",
    type: "Account type", individual: "Individual", company: "Company",
    terms: "I accept the Terms of Use and Privacy Policy.",
    risks: "I understand that investing involves a risk of partial or total capital loss.",
    marketing: "I would like to receive new opportunities by email (optional).",
    submit: "Create my secure account", submitting: "Creating your account…",
    error: "Please check all required information.", unavailable: "Account creation is temporarily unavailable.",
    secured: "NEXORA never receives your Google password. Identity verification remains required before investing.",
  } : {
    kicker: "Compte Google",
    title: "Une dernière étape.",
    intro: "Google a confirmé votre adresse email. Complétez les informations nécessaires pour ouvrir votre espace NEXORA.",
    expired: "Cette connexion Google a expiré.",
    restart: "Recommencer avec Google",
    firstName: "Prénom", lastName: "Nom", phone: "Téléphone", country: "Pays de résidence",
    type: "Type de compte", individual: "Particulier", company: "Entreprise",
    terms: "J’accepte les Conditions Générales d’Utilisation et la politique de confidentialité.",
    risks: "Je comprends que l’investissement présente un risque de perte partielle ou totale du capital.",
    marketing: "Je souhaite recevoir les nouvelles opportunités par email (optionnel).",
    submit: "Créer mon espace sécurisé", submitting: "Création de votre espace…",
    error: "Vérifiez toutes les informations obligatoires.", unavailable: "La création du compte est momentanément indisponible.",
    secured: "NEXORA ne reçoit jamais votre mot de passe Google. La vérification d’identité reste obligatoire avant d’investir.",
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/google/pending", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("EXPIRED");
        return response.json() as Promise<{ account: PendingAccount }>;
      })
      .then(({ account }) => {
        setPending(account);
        setFirstName(account.firstName);
        setLastName(account.lastName);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setExpired(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const complete = async () => {
    if (!firstName.trim() || !lastName.trim() || phone.trim().length < 7 || !acceptedTerms || !acceptedRisks) {
      setError(copy.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/google/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          country,
          kind,
          language: locale,
          acceptedTerms,
          acceptedRisks,
          consentMarketing,
        }),
      });
      const payload = (await response.json()) as { user?: { email?: string }; error?: string };
      if (!response.ok || !payload.user?.email) throw new Error(payload.error || copy.unavailable);
      login(payload.user.email);
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== "REGISTER_UNAVAILABLE" ? reason.message : copy.unavailable);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="page-shell py-10"><Skeleton className="mx-auto h-[36rem] max-w-2xl rounded-[1.75rem]" /></section>;
  }
  if (expired || !pending) {
    return (
      <section className="page-shell py-10">
        <Card className="mx-auto max-w-lg rounded-[1.75rem] border-[#541249]/12 p-2 text-center shadow-[0_22px_60px_rgba(56,12,49,.09)]">
          <CardContent className="px-5 py-10 sm:px-10">
            <ShieldCheck className="mx-auto h-10 w-10 text-[#541249]" />
            <h1 className="mt-4 text-2xl font-bold">{copy.expired}</h1>
            <GoogleSignInButton className="mt-6" />
            <Button type="button" variant="link" className="mt-3" onClick={() => setView("login")}>{en ? "Back to sign in" : "Retour à la connexion"}</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="page-shell py-6 sm:py-10">
      <Card className="mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border-[#541249]/12 bg-white shadow-[0_24px_70px_rgba(56,12,49,.11)]">
        <CardHeader className="bg-[linear-gradient(135deg,#541249,#2f0a2a_68%,#160412)] px-5 py-7 text-white sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#e7bade]">{copy.kicker}</p>
          <CardTitle className="mt-2 text-3xl font-black tracking-[-.04em]">{copy.title}</CardTitle>
          <CardDescription className="max-w-xl text-sm leading-6 text-white/70">{copy.intro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
          <div className="rounded-xl border border-[#541249]/10 bg-[#faf6f9] px-4 py-3">
            <p className="text-[11px] text-muted-foreground">Email Google confirmé</p>
            <p className="mt-0.5 truncate text-sm font-bold">{pending.email}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.firstName} value={firstName} onChange={setFirstName} autoComplete="given-name" />
            <Field label={copy.lastName} value={lastName} onChange={setLastName} autoComplete="family-name" />
            <Field label={copy.phone} value={phone} onChange={setPhone} autoComplete="tel" />
            <div>
              <Label className="text-xs">{copy.country}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1 h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((item) => <SelectItem key={item.code} value={item.code}>{getCountryLabel(item.code, locale)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">{copy.type}</Label>
            <SegmentedControl
              className="mt-2"
              value={kind}
              onValueChange={setKind}
              ariaLabel={copy.type}
              options={[{ value: "individual", label: copy.individual }, { value: "company", label: copy.company }]}
            />
          </div>
          <Consent id="google-terms" checked={acceptedTerms} onChange={setAcceptedTerms} label={copy.terms} />
          <Consent id="google-risks" checked={acceptedRisks} onChange={setAcceptedRisks} label={copy.risks} danger />
          <Consent id="google-marketing" checked={consentMarketing} onChange={setConsentMarketing} label={copy.marketing} />
          <div className="flex flex-wrap gap-2 text-xs">
            <a className="font-semibold text-[#541249] underline-offset-4 hover:underline" href="/legal/terms" target="_blank" rel="noreferrer">CGU</a>
            <a className="font-semibold text-[#541249] underline-offset-4 hover:underline" href="/legal/privacy" target="_blank" rel="noreferrer">{en ? "Privacy" : "Confidentialité"}</a>
            <a className="font-semibold text-[#541249] underline-offset-4 hover:underline" href="/legal/compliance" target="_blank" rel="noreferrer">{en ? "Regulatory framework" : "Cadre réglementaire"}</a>
          </div>
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
          <Button type="button" className="btn-nexora h-12 w-full" disabled={submitting} onClick={() => void complete()}>
            {submitting ? copy.submitting : copy.submit}<ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex gap-2 rounded-xl bg-[#f7eef5] p-3 text-[11px] leading-5 text-[#541249]/75">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{copy.secured}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const id = `google-${autoComplete}`;
  return <div><Label htmlFor={id} className="text-xs">{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-1 h-11 rounded-xl" /></div>;
}

function Consent({ id, checked, onChange, label, danger = false }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string; danger?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#541249]/10 p-3.5 hover:bg-[#fcf8fb]">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <span className={`text-sm leading-5 ${danger ? "font-semibold text-red-700" : "text-foreground"}`}>{label}</span>
    </label>
  );
}
