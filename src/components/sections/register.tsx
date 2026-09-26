"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, getCountryLabel } from "@/lib/countries";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  UserRound,
  ContactRound,
  TrendingUp,
  Waypoints,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Globe,
  Coins,
} from "lucide-react";

type AccountKind = "individual" | "company";
type CompanyObjective = "invest" | "finance" | "both";

const TOTAL_STEPS = 5;
const REGISTRATION_STEP_ICONS = [UserRound, ContactRound, Globe, FileCheck2, CheckCircle2];

const COPY = {
  fr: {
    step: "Étape", titles: ["Ouvrez votre espace NEXORA", "Faisons connaissance", "Votre profil", "Dernière vérification", "Votre espace est prêt"], sectionTitles: ["Choisissez votre profil", "Vos coordonnées", "Pays et langue", "Vos confirmations", "Bienvenue chez NEXORA"], companyGoal: "Votre objectif",
    choose: "Sélectionnez l’espace qui correspond à votre besoin. Vous pourrez compléter votre profil et ajouter vos justificatifs plus tard.", individual: "Particulier", individualDesc: "Découvrir les opportunités et investir en votre nom.", company: "Entreprise", companyDesc: "Financer votre activité ou investir au nom de votre société.", selected: "Sélectionné",
    continue: "Continuer", back: "Retour", firstName: "Prénom", lastName: "Nom", phone: "Téléphone", password: "Mot de passe", confirm: "Confirmer", settlementCurrency: "Paiements", reflection: "Temps pour changer d’avis", days: "jours",
    goalIntro: "Quel est votre objectif principal ? Vous pourrez évoluer plus tard entre les deux rôles.", goals: [["Investir", "Placer la trésorerie de l’entreprise dans des offres publiées."], ["Rechercher un financement", "Déposer un dossier pour lever des fonds."], ["Les deux", "Investir et lever du capital — mêmes accès."]],
    residence: "Pays de résidence", availability: "Dans votre pays", pilot: "ouverture progressive", soon: "bientôt disponible", language: "Langue de communication", profileInfo: "Vous pourrez compléter votre profil et ajouter vos justificatifs depuis votre espace. Votre identité sera vérifiée avant le premier investissement.",
    terms: "J’accepte les Conditions Générales d’Utilisation", termsText: "(obligatoire) — j’ai pris connaissance du fonctionnement de la plateforme, des frais applicables et du rôle de NEXORA comme intermédiaire.", risk: "Je reconnais le risque de perte en capital", riskText: "(obligatoire) — l’investissement présente un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.", marketing: "Je souhaite recevoir les nouvelles opportunités d’investissement par email (optionnel).", readTerms: "Lire les CGU", readPrivacy: "Confidentialité", readFramework: "Cadre réglementaire",
    creating: "Création…", create: "Créer mon compte", created: "Compte créé", welcome: (name: string) => `Bienvenue sur NEXORA Capital, ${name || "investisseur"}. Votre identité devra être vérifiée avant votre premier investissement. Vous pouvez dès à présent explorer les offres.`, savedEmail: "Email enregistré :", access: "Accéder à mon espace", exploreFirst: "Explorer d’abord les offres", already: "Vous avez déjà un compte ?", signIn: "Se connecter", security: "Votre compte et vos informations restent protégés. Votre identité sera vérifiée avant le premier investissement.",
    errors: { kind: "Sélectionnez le type de compte.", required: "Tous les champs sont obligatoires.", email: "Adresse email invalide.", password: "Le mot de passe doit contenir au moins 10 caractères.", match: "Les mots de passe ne correspondent pas.", goal: "Sélectionnez votre objectif.", consent: "Vous devez accepter les conditions et reconnaître les risques.", country: "Ce pays n’est pas encore disponible.", exists: "Un compte existe déjà avec cette adresse email.", create: "Impossible de créer le compte pour le moment.", network: "Connexion indisponible. Réessayez dans quelques instants." },
  },
  en: {
    step: "Step", titles: ["Open your NEXORA space", "Let’s get acquainted", "Your profile", "Final review", "Your space is ready"], sectionTitles: ["Choose your profile", "Your contact details", "Country and language", "Your confirmations", "Welcome to NEXORA"], companyGoal: "Your objective",
    choose: "Select the space that matches your needs. You can complete your profile and add supporting documents later.", individual: "Individual", individualDesc: "Discover opportunities and invest in your own name.", company: "Company", companyDesc: "Finance your activity or invest on behalf of your company.", selected: "Selected",
    continue: "Continue", back: "Back", firstName: "First name", lastName: "Last name", phone: "Phone", password: "Password", confirm: "Confirm", settlementCurrency: "Payments", reflection: "Time to change your mind", days: "days",
    goalIntro: "What is your main objective? You can switch between both roles later.", goals: [["Invest", "Invest company cash in published opportunities."], ["Seek financing", "Submit an application to raise funds."], ["Both", "Invest and raise capital with the same access."]],
    residence: "Country of residence", availability: "In your country", pilot: "opening gradually", soon: "coming soon", language: "Communication language", profileInfo: "You can complete your profile and add supporting documents from your account. Your identity will be verified before your first investment.",
    terms: "I accept the Terms of Use", termsText: "(required) — I have reviewed how the platform works, the applicable fees and NEXORA’s role as an intermediary.", risk: "I acknowledge the risk of capital loss", riskText: "(required) — investing involves a risk of capital loss. Past performance does not predict future performance.", marketing: "I would like to receive new investment opportunities by email (optional).", readTerms: "Read terms", readPrivacy: "Privacy", readFramework: "Regulatory framework",
    creating: "Creating…", create: "Create my account", created: "Account created", welcome: (name: string) => `Welcome to NEXORA Capital, ${name || "investor"}. Your identity must be verified before your first investment. You can already explore opportunities.`, savedEmail: "Registered email:", access: "Go to my account", exploreFirst: "Explore opportunities first", already: "Already have an account?", signIn: "Sign in", security: "Your account and information stay protected. Your identity will be verified before your first investment.",
    errors: { kind: "Select an account type.", required: "All fields are required.", email: "Invalid email address.", password: "Your password must contain at least 10 characters.", match: "Passwords do not match.", goal: "Select your objective.", consent: "You must accept the terms and acknowledge the risks.", country: "This country is not available yet.", exists: "An account already exists with this email address.", create: "Unable to create the account right now.", network: "Connection unavailable. Please try again shortly." },
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

  const progressPct = (step / TOTAL_STEPS) * 100;

  const country = COUNTRIES.find((c) => c.code === countryCode);
  const StepIcon = REGISTRATION_STEP_ICONS[Math.min(step - 1, TOTAL_STEPS - 1)];
  const sectionTitle = step === 3 && kind === "company"
    ? copy.companyGoal
    : copy.sectionTitles[Math.min(step - 1, copy.sectionTitles.length - 1)];

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
      const payload = (await response.json().catch(() => ({}))) as { code?: string };
      if (!response.ok) {
        const messageByCode: Record<string, string> = {
          INVALID_PAYLOAD: copy.errors.required,
          INVALID_CONTACT: copy.errors.required,
          INVALID_PASSWORD: copy.errors.password,
          UNSUPPORTED_COUNTRY: copy.errors.country,
          REQUIRED_CONSENTS: copy.errors.consent,
          EMAIL_EXISTS: copy.errors.exists,
          REGISTER_UNAVAILABLE: copy.errors.create,
        };
        setErrorMsg((payload.code && messageByCode[payload.code]) || copy.errors.create);
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
    <section className="page-shell registration-shell max-w-4xl reveal-in">
      <div className="registration-frame overflow-hidden rounded-[2rem] border border-[#541249]/10 bg-white/96 shadow-[0_24px_70px_rgba(56,12,49,.12)]">
      <div className="registration-progress relative overflow-hidden bg-[linear-gradient(128deg,#601554_0%,#380c31_52%,#160412_100%)] px-5 py-5 text-white sm:px-8 sm:py-6">
        <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full border border-white/[.07] bg-[#8b367c]/15 shadow-[0_0_90px_rgba(165,91,152,.18)]" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-white/62">{copy.step} {step} / {TOTAL_STEPS}</p>
          <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-bold text-white/78">{Math.round(progressPct)} %</span>
        </div>
        <h1 className="relative mt-2.5 max-w-2xl text-2xl font-black leading-tight tracking-[-.04em] sm:text-[1.8rem]">{copy.titles[Math.min(step - 1, copy.titles.length - 1)]}</h1>
        <div
          className="relative mt-4 grid grid-cols-5 gap-1.5"
          role="progressbar"
          aria-label={`${copy.step} ${step} / ${TOTAL_STEPS}`}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-colors duration-300 ${index < step ? "bg-[#d696c9]" : "bg-white/14"}`}
            />
          ))}
        </div>
      </div>

      <Card className="registration-card gap-3 rounded-none border-0 bg-white/95 py-0 shadow-none">
        <CardHeader className="grid grid-cols-[auto_1fr] items-center gap-x-3 border-b border-[#541249]/8 px-5 py-4 sm:px-8 sm:py-5">
          <span className="row-span-2 flex h-10 w-10 items-center justify-center rounded-[.9rem] bg-[#f3e7f1] text-[#641756]">
            <StepIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <CardTitle className="text-lg font-extrabold tracking-[-.025em] sm:text-xl">{sectionTitle}</CardTitle>
          <CardDescription className="text-xs leading-5">
            {step === 1
              ? locale === "fr" ? "Un choix simple pour personnaliser votre parcours." : "A simple choice to personalize your journey."
              : `${copy.step} ${step} ${locale === "fr" ? "sur" : "of"} ${TOTAL_STEPS}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-5 pb-5 pt-2 sm:px-8 sm:pb-7 sm:pt-3">
          {/* STEP 1 — Account type */}
          {step === 1 && (
            <>
              <GoogleSignInButton />
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-[#541249]/10" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {locale === "fr" ? "ou créer votre espace manuellement" : "or create your account manually"}
                </span>
                <span className="h-px flex-1 bg-[#541249]/10" />
              </div>
              <p className="text-sm text-muted-foreground">
                {copy.choose}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  data-control="choice"
                  type="button"
                  onClick={() => setKind("individual")}
                  aria-pressed={kind === "individual"}
                  className={`relative flex min-h-[8.5rem] items-start gap-4 rounded-[1.2rem] border p-4 pr-12 text-left transition-all hover:-translate-y-0.5 ${
                    kind === "individual"
                      ? "border-[#6c195e]/50 bg-[linear-gradient(145deg,#fcf8fb,#f1dfed)] shadow-[0_12px_28px_rgba(56,12,49,.11)] ring-2 ring-[#541249]/10"
                      : "border-[#541249]/10 bg-[#fdfcfd] shadow-[0_5px_18px_rgba(56,12,49,.035)] hover:border-[#541249]/28 hover:bg-white hover:shadow-[0_11px_25px_rgba(56,12,49,.08)]"
                  }`}
                >
                  <span className={`absolute right-4 top-4 flex h-6 items-center justify-center rounded-full text-[10px] font-bold ${kind === "individual" ? "min-w-6 bg-[#541249] px-1.5 text-white" : "w-6 border border-[#541249]/15 bg-white"}`}>
                    {kind === "individual" ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">{copy.selected}</span></> : null}
                  </span>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[.9rem] bg-[linear-gradient(145deg,#380c31,#160412)] shadow-[0_8px_18px_rgba(56,12,49,.2)]">
                    <UserRound className="h-5 w-5 text-[#f2c7eb]" />
                  </div>
                  <div>
                    <p className="text-[.9375rem] font-extrabold tracking-[-.015em] text-foreground">{copy.individual}</p>
                    <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                      {copy.individualDesc}
                    </p>
                  </div>
                </button>

                <button
                  data-control="choice"
                  type="button"
                  onClick={() => setKind("company")}
                  aria-pressed={kind === "company"}
                  className={`relative flex min-h-[8.5rem] items-start gap-4 rounded-[1.2rem] border p-4 pr-12 text-left transition-all hover:-translate-y-0.5 ${
                    kind === "company"
                      ? "border-[#6c195e]/50 bg-[linear-gradient(145deg,#fcf8fb,#f1dfed)] shadow-[0_12px_28px_rgba(56,12,49,.11)] ring-2 ring-[#541249]/10"
                      : "border-[#541249]/10 bg-[#fdfcfd] shadow-[0_5px_18px_rgba(56,12,49,.035)] hover:border-[#541249]/28 hover:bg-white hover:shadow-[0_11px_25px_rgba(56,12,49,.08)]"
                  }`}
                >
                  <span className={`absolute right-4 top-4 flex h-6 items-center justify-center rounded-full text-[10px] font-bold ${kind === "company" ? "min-w-6 bg-[#541249] px-1.5 text-white" : "w-6 border border-[#541249]/15 bg-white"}`}>
                    {kind === "company" ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">{copy.selected}</span></> : null}
                  </span>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[.9rem] bg-[linear-gradient(145deg,#380c31,#160412)] shadow-[0_8px_18px_rgba(56,12,49,.2)]">
                    <Waypoints className="h-5 w-5 text-[#f2c7eb]" />
                  </div>
                  <div>
                    <p className="text-[.9375rem] font-extrabold tracking-[-.015em] text-foreground">{copy.company}</p>
                    <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                      {copy.companyDesc}
                    </p>
                  </div>
                </button>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex justify-end border-t border-[#541249]/8 pt-5">
                <Button onClick={handleStep1Next} disabled={!kind} className="btn-nexora h-11 w-full min-w-40 sm:w-auto">
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
                    {copy.settlementCurrency} : {locale === "fr" ? "francs CFA" : "CFA francs"} · {copy.reflection} : {country.reflectionPeriodDays} {copy.days}
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

              <div className="registration-actions">
                <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep2Next} className="btn-nexora w-full sm:w-auto">
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
                    icon: TrendingUp,
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
                      data-control="choice"
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
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="registration-actions">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora w-full sm:w-auto">
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
                  <p className="text-sm leading-6 text-muted-foreground">
                    {copy.profileInfo}
                  </p>
                </div>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="registration-actions">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora w-full sm:w-auto">
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
                  <span className="text-sm leading-6 text-foreground">
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
                  <span className="text-sm leading-6 text-foreground">
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
                  <span className="text-sm leading-6 text-muted-foreground">
                    {copy.marketing}
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild type="button" variant="outline" size="sm"><a href="/legal/terms" target="_blank" rel="noreferrer">{copy.readTerms}</a></Button>
                <Button asChild type="button" variant="outline" size="sm"><a href="/legal/privacy" target="_blank" rel="noreferrer">{copy.readPrivacy}</a></Button>
                <Button asChild type="button" variant="outline" size="sm"><a href="/legal/compliance" target="_blank" rel="noreferrer">{copy.readFramework}</a></Button>
              </div>

              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}

              <div className="registration-actions">
                <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {copy.back}
                </Button>
                <Button onClick={handleStep4Next} disabled={submitting} className="btn-nexora w-full sm:w-auto">
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

      <div className="registration-support flex flex-col gap-3 border-t border-[#541249]/8 bg-[linear-gradient(135deg,#fbf8fa,#f7eef5)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex max-w-xl items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[.7rem] bg-white text-[#641756] shadow-[0_4px_12px_rgba(56,12,49,.07)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-xs leading-5 text-[#541249]/80">
            {copy.security}
          </p>
        </div>
        {step < 5 ? (
          <p className="shrink-0 text-sm text-muted-foreground">
            {copy.already}{" "}
            <Button type="button" variant="link" onClick={() => setView("login")} className="inline h-auto p-0 align-baseline font-bold">
              {copy.signIn}
            </Button>
          </p>
        ) : null}
      </div>
      </div>
    </section>
  );
}
