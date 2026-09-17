"use client";
import { useMemo, useState } from "react";
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
import { COUNTRIES } from "@/lib/countries";
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

export function Register() {
  const setView = useAppStore((s) => s.setView);
  const login = useAppStore((s) => s.login);

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
  const [language, setLanguage] = useState("fr");

  // Step 4 — consent
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [acceptRisks, setAcceptRisks] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const progressPct = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  const country = COUNTRIES.find((c) => c.code === countryCode);

  const goToStep = (s: number) => {
    setErrorMsg(null);
    setStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep1Next = () => {
    if (!kind) {
      setErrorMsg("Sélectionnez le type de compte.");
      return;
    }
    goToStep(2);
  };

  const handleStep2Next = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg("Tous les champs sont obligatoires.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Adresse email invalide.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }
    goToStep(3);
  };

  const handleStep3Next = () => {
    if (kind === "company" && !objective) {
      setErrorMsg("Sélectionnez votre objectif.");
      return;
    }
    goToStep(4);
  };

  const handleStep4Next = () => {
    if (!acceptCgu || !acceptRisks) {
      setErrorMsg("Vous devez accepter les CGU et reconnaître les risques.");
      return;
    }
    goToStep(5);
  };

  const handleFinalLogin = () => {
    login(email.trim());
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Étape {step} / {TOTAL_STEPS}
          </span>
          <span className="tnum">{Math.round(progressPct)} %</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">
            {step === 1 && "Créez votre compte NEXORA"}
            {step === 2 && "Vos coordonnées"}
            {step === 3 && (kind === "company" ? "Votre objectif" : "Pays et langue")}
            {step === 4 && "Consentements"}
            {step === 5 && "Compte créé"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* STEP 1 — Account type */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Choisissez le type de compte. Vous pourrez compléter votre
                profil plus tard — <strong className="text-foreground">aucun justificatif n&rsquo;est demandé à cette étape</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setKind("individual")}
                  className={`flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all ${
                    kind === "individual"
                      ? "border-[#B6FF00] bg-nexora-pale ring-1 ring-[#B6FF00]"
                      : "border-border bg-background hover:border-foreground/40"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-black">
                    <UserRound className="h-5 w-5 text-nexora-lime" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Particulier</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Investir dans les offres publiées sur NEXORA.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setKind("company")}
                  className={`flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all ${
                    kind === "company"
                      ? "border-[#B6FF00] bg-nexora-pale ring-1 ring-[#B6FF00]"
                      : "border-border bg-background hover:border-foreground/40"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-black">
                    <Building2 className="h-5 w-5 text-nexora-lime" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Entreprise</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rechercher un financement ou investir en tant que société.
                    </p>
                  </div>
                </button>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex justify-end">
                <Button onClick={handleStep1Next} disabled={!kind} className="btn-nexora">
                  Continuer
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
                    Prénom
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
                    Nom
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
                  Téléphone
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
                    placeholder={country ? `77 000 00 00 (${country.currencyDisplay})` : "Numéro"}
                    className="flex-1"
                  />
                </div>
                {country && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Devise : {country.currencyDisplay} · Délai de rétractation : {country.reflectionPeriodDays} jours
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-password" className="text-xs">
                    Mot de passe
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
                    Confirmer
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
                  Retour
                </Button>
                <Button onClick={handleStep2Next} className="btn-nexora">
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 — Objective (company) OR country/language (individual) */}
          {step === 3 && kind === "company" && (
            <>
              <p className="text-sm text-muted-foreground">
                Quel est votre objectif principal ? Vous pourrez évoluer plus
                tard entre les deux rôles.
              </p>
              <div className="grid gap-3">
                {[
                  {
                    id: "invest" as const,
                    label: "Investir",
                    desc: "Placer la trésorerie de l&rsquo;entreprise dans des offres publiées.",
                    icon: Coins,
                  },
                  {
                    id: "finance" as const,
                    label: "Rechercher un financement",
                    desc: "Déposer un dossier pour lever des fonds.",
                    icon: Building2,
                  },
                  {
                    id: "both" as const,
                    label: "Les deux",
                    desc: "Investir et lever du capital — mêmes accès.",
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
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                        active
                          ? "border-[#B6FF00] bg-nexora-pale ring-1 ring-[#B6FF00]"
                          : "border-border bg-background hover:border-foreground/40"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{opt.label}</p>
                        <p
                          className="mt-0.5 text-xs text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: opt.desc }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora">
                  Continuer
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
                    Pays de résidence
                  </Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="mt-1 w-full" id="reg-country2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.currencyDisplay})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {country && country.operationalStatus !== "active" && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Statut opérationnel : {country.operationalStatus === "demo" ? "démonstration" : "bientôt disponible"}.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reg-lang" className="text-xs">
                    Langue de communication
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
                    Vous pourrez compléter votre profil (justificatifs,
                    coordonnées de paiement vérifiées) depuis votre espace. La
                    vérification d&rsquo;identité est requise avant tout
                    investissement.
                  </p>
                </div>
              </div>
              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button onClick={handleStep3Next} className="btn-nexora">
                  Continuer
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
                    <strong>J&rsquo;accepte les Conditions Générales d&rsquo;Utilisation</strong>{" "}
                    (obligatoire) — j&rsquo;ai pris connaissance du fonctionnement
                    de la plateforme, des frais applicables et du rôle de NEXORA
                    comme intermédiaire.
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
                      Je reconnais le risque de perte en capital
                    </strong>{" "}
                    (obligatoire) — l&rsquo;investissement présente un risque de
                    perte en capital. Les performances passées ne préjugent pas
                    des performances futures.
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
                    Je souhaite recevoir les nouvelles opportunités
                    d&rsquo;investissement par email (optionnel).
                  </span>
                </label>
              </div>

              {errorMsg && <p className="text-xs text-nexora-danger">{errorMsg}</p>}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button onClick={handleStep4Next} className="btn-nexora">
                  Créer mon compte
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
              <h3 className="text-lg font-bold text-foreground">Compte créé</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Bienvenue sur NEXORA Capital, {firstName || "investisseur"}.
                Votre identité devra être vérifiée avant votre premier
                investissement. Vous pouvez dès à présent explorer les offres.
              </p>

              <div className="mt-5 w-full rounded-md border border-border bg-secondary/60 p-3 text-left">
                <p className="text-xs text-muted-foreground">
                  Email enregistré :
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {email || "vous@exemple.com"}
                </p>
              </div>

              <Button
                onClick={handleFinalLogin}
                className="btn-nexora mt-6 w-full"
              >
                Accéder à mon espace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setView("explore")}
                className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Explorer d&rsquo;abord les offres
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Already have account */}
      {step < 5 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <button
            type="button"
            onClick={() => setView("login")}
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Se connecter
          </button>
        </p>
      )}

      {/* Demo notice */}
      <div className="mt-6 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        <p className="text-[11px] leading-relaxed text-positive">
          Mode démonstration — aucune authentification réelle. Le compte est
          créé localement pour la démonstration ; aucune donnée n&rsquo;est
          persistée ni transmise.
        </p>
      </div>
    </section>
  );
}
