"use client";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, getCountryLabel } from "@/lib/countries";
import {
  UserRound,
  Building2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Coins,
} from "lucide-react";

type AccountKind = "individual" | "company";
type CompanyObjective = "invest" | "finance" | "both";

const TOTAL_STEPS = 5;

const COPY = {
  fr: {
    step: "Étape", titles: ["Créez votre compte NEXORA", "Vos coordonnées", "Pays et langue", "Consentements", "Compte créé"], companyGoal: "Votre objectif",
    choose: "Choisissez le type de compte. Vous pourrez compléter votre profil plus tard — aucun justificatif n’est demandé à cette étape.", individual: "Particulier", individualDesc: "Investir dans les offres publiées sur NEXORA.", company: "Entreprise", companyDesc: "Rechercher un financement ou investir en tant que société.",
    continue: "Continuer", back: "Retour", firstName: "Prénom", lastName: "Nom", phone: "Téléphone", password: "Mot de passe", confirm: "Confirmer", settlementCurrency: "Devise de règlement", reflection: "Délai de rétractation", days: "jours",
    goalIntro: "Quel est votre objectif principal ? Vous pourrez évoluer plus tard entre les deux rôles.", goals: [["Investir", "Placer la trésorerie de l’entreprise dans des offres publiées."], ["Rechercher un financement", "Déposer un dossier pour lever des fonds."], ["Les deux", "Investir et lever du capital — mêmes accès."]],
    residence: "Pays de résidence", availability: "Disponibilité", pilot: "accès pilote", soon: "bientôt disponible", language: "Langue de communication", profileInfo: "Vous pourrez compléter votre profil, vos justificatifs et vos coordonnées de paiement vérifiées depuis votre espace. La vérification d’identité est requise avant tout investissement.",
    terms: "J’accepte les Conditions Générales d’Utilisation", termsText: "(obligatoire) — j’ai pris connaissance du fonctionnement de la plateforme, des frais applicables et du rôle de NEXORA comme intermédiaire.", risk: "Je reconnais le risque de perte en capital", riskText: "(obligatoire) — l’investissement présente un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.", marketing: "Je souhaite recevoir les nouvelles opportunités d’investissement par email (optionnel).",
    creating: "Création…", create: "Créer mon compte", created: "Compte créé", welcome: (name: string) => `Bienvenue sur NEXORA Capital, ${name || "investisseur"}. Votre identité devra être vérifiée avant votre premier investissement. Vous pouvez dès à présent explorer les offres.`, savedEmail: "Email enregistré :", access: "Accéder à mon espace", exploreFirst: "Explorer d’abord les offres", already: "Vous avez déjà un compte ?", signIn: "Se connecter", security: "Votre mot de passe n’est jamais stocké en clair et votre session est protégée. Une vérification d’identité sera demandée avant toute souscription.",
    errors: { kind: "Sélectionnez le type de compte.", required: "Tous les champs sont obligatoires.", email: "Adresse email invalide.", password: "Le mot de passe doit contenir au moins 10 caractères.", match: "Les mots de passe ne correspondent pas.", goal: "Sélectionnez votre objectif.", consent: "Vous devez accepter les CGU et reconnaître les risques.", create: "Impossible de créer le compte.", network: "Connexion indisponible. Réessayez dans quelques instants." },
  },
  en: {
    step: "Step", titles: ["Create your NEXORA account", "Your contact details", "Country and language", "Consents", "Account created"], companyGoal: "Your objective",
    choose: "Choose your account type. You can complete your profile later — no supporting document is required at this stage.", individual: "Individual", individualDesc: "Invest in opportunities published on NEXORA.", company: "Company", companyDesc: "Seek financing or invest as a company.",
    continue: "Continue", back: "Back", firstName: "First name", lastName: "Last name", phone: "Phone", password: "Password", confirm: "Confirm", settlementCurrency: "Settlement currency", reflection: "Reflection period", days: "days",
    goalIntro: "What is your main objective? You can switch between both roles later.", goals: [["Invest", "Invest company cash in published opportunities."], ["Seek financing", "Submit an application to raise funds."], ["Both", "Invest and raise capital with the same access."]],
    residence: "Country of residence", availability: "Availability", pilot: "pilot access", soon: "coming soon", language: "Communication language", profileInfo: "You can complete your profile, supporting documents and verified payment details from your account. Identity verification is required before investing.",
    terms: "I accept the Terms of Use", termsText: "(required) — I have reviewed how the platform works, the applicable fees and NEXORA’s role as an intermediary.", risk: "I acknowledge the risk of capital loss", riskText: "(required) — investing involves a risk of capital loss. Past performance does not predict future performance.", marketing: "I would like to receive new investment opportunities by email (optional).",
    creating: "Creating…", create: "Create my account", created: "Account created", welcome: (name: string) => `Welcome to NEXORA Capital, ${name || "investor"}. Your identity must be verified before your first investment. You can already explore opportunities.`, savedEmail: "Registered email:", access: "Go to my account", exploreFirst: "Explore opportunities first", already: "Already have an account?", signIn: "Sign in", security: "Your password is never stored in plain text and your session is protected. Identity verification will be required before any subscription.",
    errors: { kind: "Select an account type.", required: "All fields are required.", email: "Invalid email address.", password: "Your password must contain at least 10 characters.", match: "Passwords do not match.", goal: "Select your objective.", consent: "You must accept the terms and acknowledge the risks.", create: "Unable to create the account.", network: "Connection unavailable. Please try again shortly." },
  },
} as const;

export function Register() {
  const setView = useAppStore((s) => s.setView);
  const login = useAppStore((s) => s.login);
  const locale = useAppStore((s) => s.locale);
  const copy = COPY[locale];

  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<AccountKind | null>(null);

  // Step 2 — coordonnées
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 3 — objectif (company) OR country+language (individual)
  const [objective, setObjective] = useState<CompanyObjective | null>(null);
  const [language, setLanguage] = useState<string>(locale);

  useEffect(() => setLanguage(locale), [locale]);

  // Step 4 — consent
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [acceptRisks, setAcceptRisks] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const progressPct = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  const country = COUNTRIES.find((c) => c.code === countryCode);

  const goToStep = (s: number) => {
    setErrorMsg(null);
    setStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep1Next = () => {
    if (!kind) {
      setErrorMsg(copy.errors.kind);
      return;
    }
    goToStep(2);
  };

  const handleStep2Next = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg(copy.errors.required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg(copy.errors.email);
      return;
    }
    if (password.length < 10) {
      setErrorMsg(copy.errors.password);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(copy.errors.match);
      return;
    }
    goToStep(3);
  };

  const handleStep3Next = () => {
    if (kind === "company" && !objective) {
      setErrorMsg(copy.errors.goal);
      return;
    }
    goToStep(4);
  };

  const handleStep4Next = async () => {
    if (!acceptCgu || !acceptRisks) {
      setErrorMsg(copy.errors.consent);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          country: countryCode,
          language,
          objective,
          acceptedTerms: acceptCgu,
          acceptedRisks: acceptRisks,
          consentMarketing,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setErrorMsg(payload.error || copy.errors.create);
        return;
      }
      goToStep(5);
    } catch {
      setErrorMsg(copy.errors.network);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalLogin = () => {
    login(email.trim());
  };

  return (
    <section className="page-shell max-w-2xl reveal-in">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {copy.step} {step} / {TOTAL_STEPS}
          </span>
          <span className="tnum">{Math.round(progressPct)} %</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">
            {step === 1 && copy.titles[0]}
            {step === 2 && copy.titles[1]}
            {step === 3 && (kind === "company" ? copy.companyGoal : copy.titles[2])}
            {step === 4 && copy.titles[3]}
            {step === 5 && copy.titles[4]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* STEP 1 — Account type */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                {copy.choose}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setKind("individual")}
                  aria-pressed={kind === "individual"}
                  className={`flex flex-col items-start gap-3 rounded-2xl border p-5 text-left shadow-[0_5px_18px_rgba(56,12,49,.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(56,12,49,.09)] ${
                    kind === "individual"
                      ? "border-[#541249]/55 bg-[linear-gradient(145deg,#FAF4F9,#F1DFEE)] ring-2 ring-[#541249]/12"
                      : "border-[#541249]/10 bg-white/90 hover:border-[#541249]/30"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-black">
                    <UserRound className="h-5 w-5 text-nexora-lime" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{copy.individual}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {copy.individualDesc}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setKind("company")}
                  aria-pressed={kind === "company"}
                  className={`flex flex-col items-start gap-3 rounded-2xl border p-5 text-left shadow-[0_5px_18px_rgba(56,12,49,.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(56,12,49,.09)] ${
                    kind === "company"
                      ? "border-[#541249]/55 bg-[linear-gradient(145deg,#FAF4F9,#F1DFEE)] ring-2 ring-[#541249]/12"
                      : "border-[#541249]/10 bg-white/90 hover:border-[#541249]/30"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-black">
                    <Building2 className="h-5 w-5 text-nexora-lime" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{copy.company}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {copy.companyDesc}
                    </p>
                  </div>
                </button>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex justify-end">
                <Button onClick={handleStep1Next} disabled={!kind} className="btn-nexora">
                  {copy.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 2 — Coordonnées */}
          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-firstName" className="text-xs">
                    {copy.firstName}
                  </Label>
                  <Input
                    id="reg-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Aïssatou"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-lastName" className="text-xs">
                    {copy.lastName}
                  </Label>
                  <Input
                    id="reg-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Diallo"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reg-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reg-phone" className="text-xs">
                  {copy.phone}
                </Label>
                <div className="mt-1 flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px] shrink-0" id="reg-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.phonePrefix} · {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="reg-phone"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    className="flex-1"
                  />
                </div>
                {country && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {copy.settlementCurrency} : {country.currencyDisplay} ({country.currency}) · {copy.reflection} : {country.reflectionPeriodDays} {copy.days}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-password" className="text-xs">
                    {copy.password}
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-confirm" className="text-xs">
                    {copy.confirm}
                  </Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
              </div>

              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep2Next} className="btn-nexora">
                  {copy.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 — Objective (company) OR country/language (individual) */}
          {step === 3 && kind === "company" && (
            <>
              <p className="text-sm text-muted-foreground">
                {copy.goalIntro}
              </p>
              <div className="grid gap-3">
                {[
                  {
                    id: "invest" as const,
                    label: copy.goals[0][0],
                    desc: copy.goals[0][1],
                    icon: Coins,
                  },
                  {
                    id: "finance" as const,
                    label: copy.goals[1][0],
                    desc: copy.goals[1][1],
                    icon: Building2,
                  },
                  {
                    id: "both" as const,
                    label: copy.goals[2][0],
                    desc: copy.goals[2][1],
                    icon: ShieldCheck,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = objective === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setObjective(opt.id)}
                      aria-pressed={active}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left shadow-[0_4px_16px_rgba(56,12,49,.035)] transition-all hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(56,12,49,.08)] ${
                        active
                          ? "border-[#541249]/55 bg-[linear-gradient(145deg,#FAF4F9,#F1DFEE)] ring-2 ring-[#541249]/12"
                          : "border-[#541249]/10 bg-white/90 hover:border-[#541249]/30"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{opt.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora">
                  {copy.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && kind === "individual" && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reg-country2" className="text-xs">
                    {copy.residence}
                  </Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="mt-1 w-full" id="reg-country2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {getCountryLabel(c.code, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {country && country.operationalStatus !== "active" && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {copy.availability} : {country.operationalStatus === "demo" ? copy.pilot : copy.soon}.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reg-lang" className="text-xs">
                    {copy.language}
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1 w-full" id="reg-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-2 rounded-md bg-secondary/60 p-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {copy.profileInfo}
                  </p>
                </div>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora">
                  {copy.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 4 — Consent */}
          {step === 4 && (
            <>
              <div className="space-y-3">
                <label
                  htmlFor="consent-cgu"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40"
                >
                  <Checkbox
                    id="consent-cgu"
                    checked={acceptCgu}
                    onCheckedChange={(v) => setAcceptCgu(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-relaxed text-foreground">
                    <strong>{copy.terms}</strong>{" "}{copy.termsText}
                  </span>
                </label>

                <label
                  htmlFor="consent-risks"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40"
                >
                  <Checkbox
                    id="consent-risks"
                    checked={acceptRisks}
                    onCheckedChange={(v) => setAcceptRisks(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-relaxed text-foreground">
                    <strong className="text-nexora-danger">
                      {copy.risk}
                    </strong>{" "}
                    {copy.riskText}
                  </span>
                </label>

                <label
                  htmlFor="consent-marketing"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40"
                >
                  <Checkbox
                    id="consent-marketing"
                    checked={consentMarketing}
                    onCheckedChange={(v) => setConsentMarketing(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {copy.marketing}
                  </span>
                </label>
              </div>

              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep4Next} disabled={submitting} className="btn-nexora">
                  {submitting ? copy.creating : copy.create}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 5 — Success */}
          {step === 5 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nexora-pale">
                <CheckCircle2 className="h-7 w-7 text-positive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{copy.created}</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {copy.welcome(firstName)}
              </p>

              <div className="mt-5 w-full rounded-md border border-border bg-secondary/60 p-3 text-left">
                <p className="text-xs text-muted-foreground">
                  {copy.savedEmail}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {email || "vous@exemple.com"}
                </p>
              </div>

              <Button
                onClick={handleFinalLogin}
                className="btn-nexora mt-6 w-full"
              >
                {copy.access}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button type="button" variant="link" size="sm" onClick={() => setView("explore")} className="mt-3 text-xs text-muted-foreground">
                {copy.exploreFirst}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Already have account */}
      {step < 5 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {copy.already}{" "}
          <Button type="button" variant="link" onClick={() => setView("login")} className="inline h-auto p-0 align-baseline font-semibold">
            {copy.signIn}
          </Button>
        </p>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          {copy.security}
        </p>
      </div>
    </section>
  );
}
