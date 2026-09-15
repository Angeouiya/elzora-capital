"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  User,
  Building2,
  Phone,
  ShieldCheck,
  Loader2,
  BadgeCheck,
  Info,
  Wallet,
  Landmark,
} from "lucide-react";
import { NexoraLogo, NexoraLogoDark } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";

type AccountType = "INDIVIDUAL" | "COMPANY";
type CompanyGoal = "INVEST" | "BORROW" | "BOTH";

const COUNTRIES = [
  { code: "CI", label: "Côte d'Ivoire", prefix: "+225" },
  { code: "SN", label: "Sénégal", prefix: "+221" },
  { code: "BJ", label: "Bénin", prefix: "+229" },
  { code: "BF", label: "Burkina Faso", prefix: "+226" },
  { code: "ML", label: "Mali", prefix: "+223" },
  { code: "TG", label: "Togo", prefix: "+228" },
  { code: "NE", label: "Niger", prefix: "+227" },
];

const LEGAL_FORMS = ["SARL", "SA", "SAS", "SNC", "GIE", "Coopérative", "Autre"];

const STEPS = ["Compte", "Coordonnées", "Sécurité", "Conditions", "Confirmation"];

export default function InscriptionPage() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("CI");
  const [companyName, setCompanyName] = useState("");
  const [companyLegalForm, setCompanyLegalForm] = useState("SARL");
  const [companyGoal, setCompanyGoal] = useState<CompanyGoal | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [contactCode, setContactCode] = useState("");
  const [contactError, setContactError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.replace(/\D/g, "").length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordValid = password.length >= 8 && (hasLower || hasUpper) && hasDigit;
  const strength = [password.length >= 8, hasLower && hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  const step1Valid = accountType !== "";
  const step2Valid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailValid &&
    phoneValid &&
    (accountType !== "COMPANY" || (companyName.trim().length >= 2 && companyGoal !== ""));
  const step3Valid = passwordValid && password === confirmPassword;
  const step4Valid = acceptedTerms;
  const contactCodeValid = /^\d{6}$/.test(contactCode);

  const canContinue =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : step === 4 ? step4Valid : false;

  const handleContinue = async () => {
    setError("");
    setDuplicate(false);
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    // Étape 4 : création du compte en base
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          phone,
          country,
          accountType,
          companyName: accountType === "COMPANY" ? companyName : undefined,
          companyLegalForm: accountType === "COMPANY" ? companyLegalForm : undefined,
          companyGoal: accountType === "COMPANY" ? companyGoal : undefined,
          marketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setDuplicate(true);
        setError(data.error || "Impossible de créer le compte.");
        return;
      }
      setRegisteredUserId(data.userId);
      setDemoCode(data.demoCode);
      setStep(5);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyContact = async () => {
    setContactError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: registeredUserId, code: contactCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactError(data.error || "Code incorrect.");
        return;
      }
      setDone(true);
    } catch {
      setContactError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const inputClass =
    "flex-1 h-12 bg-transparent text-base md:text-sm text-[#101010] placeholder:text-[#101010]/35 outline-none";
  const boxClass =
    "flex items-center gap-2.5 bg-white rounded-xl px-4 shadow-[0_1px_2px_rgba(16,16,16,0.03)] ring-1 ring-[#101010]/10 focus-within:ring-2 focus-within:ring-[#B6FF00] focus-within:shadow-[0_0_0_4px_rgba(182,255,0,0.15)] transition-all";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-[#101010]/50";

  const StepDots = (
    <div className="flex items-center gap-1 sm:gap-2 mb-6" aria-label={`Étape ${step} sur 5`}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const isDone = done || n < step;
        const isCurrent = n === step && !done;
        return (
          <div key={label} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300 ${
                isDone
                  ? "bg-[#B6FF00] text-[#101010] shadow-[0_2px_10px_rgba(182,255,0,0.4)]"
                  : isCurrent
                    ? "bg-[#101010] text-white ring-4 ring-[#101010]/10"
                    : "bg-white text-[#101010]/40 ring-1 ring-[#101010]/10"
              }`}
              title={label}
            >
              {isDone ? <CheckCircle2 className="h-4.5 w-4.5" /> : n}
            </div>
            {n < 5 && (
              <div
                className={`h-0.5 w-4 sm:w-6 rounded-full transition-colors ${
                  isDone ? "bg-[#B6FF00]" : "bg-[#101010]/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9f7] grid grid-cols-1 lg:grid-cols-2">
      {/* Panneau marque (desktop) */}
      <div className="hidden lg:flex bg-[#101010] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#B6FF00]/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <Link href="/" className="relative flex items-center gap-3">
          <NexoraLogoDark size={40} />
          <span className="text-white text-xl font-semibold tracking-tight">Nexora Capital</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
            Créez votre compte en <span className="text-[#B6FF00]">quelques étapes</span>.
          </h1>
          <p className="text-white/50 mt-4 leading-relaxed">
            Particulier ou entreprise : explorez les offres et préparez vos dossiers. Aucun
            justificatif n&apos;est demandé sur le premier écran.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              {
                icon: Wallet,
                text: "Investissez dès 10 000 FCFA, sans frais de souscription",
              },
              {
                icon: Building2,
                text: "Entreprise : présentez un projet à notre équipe d'analyse",
              },
              {
                icon: ShieldCheck,
                text: "Souscription bloquée jusqu'à la vérification de votre identité",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <item.icon className="h-5 w-5 text-[#B6FF00] shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/30 text-xs flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Plateforme de démonstration — Nexora Capital
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[480px] animate-fade-in-up">
          <div className="flex lg:hidden flex-col items-center mb-8">
            <NexoraLogo size={48} />
            <h1 className="text-xl font-semibold text-[#101010] mt-3 tracking-tight">Nexora Capital</h1>
            <p className="text-sm text-[#101010]/50 mt-0.5">Création de compte</p>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] border border-[#101010]/5">
            {done ? (
              /* ---------------- Étape finale : parcours adapté ---------------- */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#EFFBDD] flex items-center justify-center mx-auto mb-5">
                  <BadgeCheck className="h-8 w-8 text-[#166534]" />
                </div>
                <h2 className="text-xl font-bold text-[#101010]">Compte créé et contact confirmé</h2>
                <p className="text-sm text-[#101010]/60 mt-2 leading-relaxed">
                  {accountType === "COMPANY"
                    ? "Votre espace entreprise est prêt. L'inscription de votre représentant ne valide pas automatiquement la société."
                    : "Votre espace investisseur est prêt."}
                </p>

                <div className="mt-6 text-left space-y-3">
                  {[
                    { n: "1", t: "Connectez-vous", d: "Utilisez l'email et le mot de passe définis à l'étape Sécurité." },
                    { n: "2", t: "Complétez la vérification", d: "La souscription et le versement restent bloqués jusqu'à la vérification complète de votre identité." },
                    { n: "3", t: "Explorez les offres", d: "Vous pouvez consulter le catalogue et préparer vos décisions dès maintenant." },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3 bg-[#f9f9f7] rounded-lg p-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#101010] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {s.n}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#101010]">{s.t}</p>
                        <p className="text-xs text-[#101010]/55 leading-relaxed mt-0.5">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <Link href="/connexion">
                    <Button variant="primary" size="lg" className="w-full">
                      Se connecter
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/offres">
                    <Button variant="secondary" size="lg" className="w-full">
                      Explorer les offres
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="text-lg font-bold text-[#101010] mb-1">Créer un compte</h2>
                <p className="text-sm text-[#101010]/50 mb-5">
                  {accountType === "COMPANY"
                    ? "Espace entreprise : investir, rechercher un financement, ou les deux."
                    : "Étape " + step + " sur 5 — " + STEPS[step - 1]}
                </p>

                {StepDots}

                {/* ---------------- Étape 1 : type de compte ---------------- */}
                {step === 1 && (
                  <div className="space-y-3 animate-fade-in-up">
                    <button
                      type="button"
                      onClick={() => setAccountType("INDIVIDUAL")}
                      className={`w-full text-left rounded-xl p-5 border-2 transition-all ${
                        accountType === "INDIVIDUAL"
                          ? "border-[#B6FF00] bg-[#EFFBDD]/50"
                          : "border-[#101010]/10 bg-[#f9f9f7] hover:border-[#101010]/25"
                      }`}
                      aria-pressed={accountType === "INDIVIDUAL"}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-[#101010]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#101010]">Particulier</p>
                          <p className="text-xs text-[#101010]/55 mt-0.5">
                            Investir mon épargne en toute autonomie
                          </p>
                        </div>
                        {accountType === "INDIVIDUAL" && (
                          <CheckCircle2 className="h-5 w-5 text-[#166534] ml-auto shrink-0" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("COMPANY")}
                      className={`w-full text-left rounded-xl p-5 border-2 transition-all ${
                        accountType === "COMPANY"
                          ? "border-[#B6FF00] bg-[#EFFBDD]/50"
                          : "border-[#101010]/10 bg-[#f9f9f7] hover:border-[#101010]/25"
                      }`}
                      aria-pressed={accountType === "COMPANY"}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-[#101010]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#101010]">Entreprise</p>
                          <p className="text-xs text-[#101010]/55 mt-0.5">
                            Investir, rechercher un financement, ou les deux
                          </p>
                        </div>
                        {accountType === "COMPANY" && (
                          <CheckCircle2 className="h-5 w-5 text-[#166534] ml-auto shrink-0" />
                        )}
                      </div>
                    </button>

                    <p className="text-xs text-[#101010]/45 leading-relaxed pt-1">
                      Une entreprise peut investir et demander un financement : ses deux activités
                      restent distinctes. Une personne peut représenter plusieurs sociétés et
                      investir personnellement sans mélanger les comptes.
                    </p>
                  </div>
                )}

                {/* ---------------- Étape 2 : coordonnées ---------------- */}
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="firstName" className={labelClass}>Prénom</label>
                        <div className={boxClass}>
                          <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Amadou" autoComplete="given-name" className={inputClass} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="lastName" className={labelClass}>Nom</label>
                        <div className={boxClass}>
                          <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)}
                            placeholder="Koné" autoComplete="family-name" className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className={labelClass}>Adresse email</label>
                      <div className={boxClass}>
                        <Mail className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre@email.com" autoComplete="email" className={inputClass} />
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="phone" className={labelClass}>Téléphone</label>
                        <div className={boxClass}>
                          <Phone className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                            placeholder={COUNTRIES.find((c) => c.code === country)?.prefix + " 07 00 00 00 00"}
                            autoComplete="tel" className={inputClass} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="country" className={labelClass}>Pays</label>
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="h-12 bg-[#f9f9f7] rounded-lg px-3 text-sm text-[#101010] outline-none focus:ring-1 focus:ring-[#B6FF00] cursor-pointer"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {accountType === "COMPANY" && (
                      <div className="space-y-4 pt-2 border-t border-[#101010]/10">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50 pt-2">
                          Votre société
                        </p>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="companyName" className={labelClass}>Nom de la société</label>
                          <div className={boxClass}>
                            <Building2 className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                            <input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Ma Société SARL" autoComplete="organization" className={inputClass} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="legalForm" className={labelClass}>Forme juridique</label>
                          <select
                            id="legalForm"
                            value={companyLegalForm}
                            onChange={(e) => setCompanyLegalForm(e.target.value)}
                            className="h-12 bg-[#f9f9f7] rounded-lg px-4 text-sm text-[#101010] outline-none focus:ring-1 focus:ring-[#B6FF00] cursor-pointer"
                          >
                            {LEGAL_FORMS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={labelClass}>Objectif de l&apos;entreprise</span>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { v: "INVEST", label: "Investir" },
                              { v: "BORROW", label: "Financer" },
                              { v: "BOTH", label: "Les deux" },
                            ] as const).map((opt) => (
                              <button key={opt.v} type="button"
                                onClick={() => setCompanyGoal(opt.v)}
                                aria-pressed={companyGoal === opt.v}
                                className={`h-11 rounded-lg text-sm font-medium border transition-colors ${
                                  companyGoal === opt.v
                                    ? "border-[#B6FF00] bg-[#EFFBDD] text-[#101010] font-semibold"
                                    : "border-[#101010]/10 bg-[#f9f9f7] text-[#101010]/60 hover:border-[#101010]/25"
                                }`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- Étape 3 : identifiants ---------------- */}
                {step === 3 && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="password" className={labelClass}>Mot de passe</label>
                      <div className={boxClass}>
                        <Lock className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                        <input id="password" type={showPassword ? "text" : "password"} value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="8 caractères minimum" autoComplete="new-password" className={inputClass} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Masquer" : "Afficher"}
                          className="text-[#101010]/40 hover:text-[#101010] transition-colors shrink-0">
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>

                    {password && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-1">
                          {[1, 2, 3, 4].map((n) => (
                            <div key={n}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                strength >= n
                                  ? strength <= 1 ? "bg-[#C62828]" : strength <= 2 ? "bg-[#D97706]" : strength <= 3 ? "bg-[#166534]/70" : "bg-[#166534]"
                                  : "bg-[#101010]/10"
                              }`} />
                          ))}
                        </div>
                        <span className="text-xs text-[#101010]/50 w-16 text-right">
                          {strength <= 1 ? "Faible" : strength <= 2 ? "Moyen" : strength <= 3 ? "Bon" : "Fort"}
                        </span>
                      </div>
                    )}

                    <ul className="space-y-1.5">
                      {[
                        { ok: password.length >= 8, label: "8 caractères minimum" },
                        { ok: hasLower && hasUpper, label: "Majuscule et minuscule" },
                        { ok: hasDigit, label: "Au moins un chiffre" },
                        { ok: hasSpecial, label: "Un caractère spécial (recommandé)" },
                      ].map((c) => (
                        <li key={c.label} className="flex items-center gap-2">
                          {c.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-[#166534] shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#101010]/25 shrink-0" />
                          )}
                          <span className={`text-xs ${c.ok ? "text-[#101010]/70" : "text-[#101010]/45"}`}>{c.label}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="confirm" className={labelClass}>Confirmer le mot de passe</label>
                      <div className={`${boxClass} ${confirmPassword && password !== confirmPassword ? "border-[#C62828]" : ""}`}>
                        <Lock className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                        <input id="confirm" type={showPassword ? "text" : "password"} value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ressaisissez le mot de passe" autoComplete="new-password" className={inputClass} />
                        {confirmPassword && (
                          confirmPassword === password ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-[#166534] shrink-0" />
                          ) : (
                            <AlertCircle className="h-4.5 w-4.5 text-[#C62828] shrink-0" />
                          )
                        )}
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-[#C62828]">Les mots de passe ne correspondent pas.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ---------------- Étape 4 : conditions ---------------- */}
                {step === 4 && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-[#f9f9f7] rounded-lg p-4 space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 w-4.5 h-4.5 accent-[#507300] cursor-pointer" />
                        <span className="text-sm text-[#101010]/80 leading-relaxed">
                          J&apos;accepte les{" "}
                          <Link href="/cgu" className="underline underline-offset-2 text-[#507300] font-medium" target="_blank">
                            conditions générales
                          </Link>{" "}
                          et reconnais avoir compris que tout investissement comporte un risque de
                          perte en capital.
                        </span>
                      </label>

                      <div className="border-t border-[#101010]/10 pt-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={marketingConsent}
                            onChange={(e) => setMarketingConsent(e.target.checked)}
                            className="mt-0.5 w-4.5 h-4.5 accent-[#507300] cursor-pointer" />
                          <span className="text-sm text-[#101010]/60 leading-relaxed">
                            <span className="font-medium text-[#101010]/75">Facultatif :</span> je
                            souhaite recevoir les nouvelles offres et conseils par email. Je peux
                            retirer ce consentement à tout moment.
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-[#EFFBDD]/60 rounded-lg p-3.5">
                      <Info className="h-4.5 w-4.5 text-[#166534] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#101010]/70 leading-relaxed">
                        Aucun justificatif n&apos;est demandé maintenant. Avant vérification
                        complète, vous pouvez explorer les offres et préparer un dossier ; la
                        souscription et le versement restent bloqués.
                      </p>
                    </div>
                  </div>
                )}

                {/* ---------------- Étape 5 : confirmation du contact ---------------- */}
                {step === 5 && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="flex items-start gap-2.5 bg-[#EFFBDD]/60 rounded-lg p-3.5">
                      <Mail className="h-4.5 w-4.5 text-[#166534] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#101010]/80 leading-relaxed">
                          Un code de confirmation a été envoyé à <strong>{email}</strong>.
                        </p>
                        <p className="text-xs text-[#101010]/50 mt-1">
                          Mode démonstration : le code est affiché ci-dessous au lieu d&apos;être
                          envoyé par email.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#101010] rounded-lg p-4 flex items-center justify-center gap-2">
                      {demoCode.split("").map((digit, i) => (
                        <span key={i} className="w-9 h-11 rounded-md bg-white/10 text-white text-lg font-mono font-semibold flex items-center justify-center">
                          {digit}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="code" className={labelClass}>Code de confirmation</label>
                      <input id="code" inputMode="numeric" maxLength={6} value={contactCode}
                        onChange={(e) => setContactCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="h-12 bg-[#f9f9f7] rounded-lg px-4 text-center text-lg font-mono tracking-[0.4em] text-[#101010] outline-none border border-transparent focus:border-[#B6FF00] transition-colors" />
                    </div>

                    {contactError && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#C62828]/10">
                        <AlertCircle className="h-4.5 w-4.5 text-[#C62828] shrink-0 mt-0.5" />
                        <p className="text-sm text-[#C62828]">{contactError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Erreur API */}
                {error && (
                  <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-[#C62828]/10">
                    <AlertCircle className="h-4.5 w-4.5 text-[#C62828] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[#C62828]">{error}</p>
                      {duplicate && (
                        <Link href="/connexion" className="text-sm text-[#C62828] underline underline-offset-2 font-medium">
                          Se connecter à ce compte
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex items-center gap-3">
                  {step > 1 && (
                    <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)} type="button">
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </Button>
                  )}
                  {step < 5 ? (
                    <Button variant="primary" size="lg" className="flex-1" disabled={!canContinue}
                      onClick={handleContinue} type="button" loading={loading}>
                      {loading ? "Création du compte…" : "Continuer"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button variant="primary" size="lg" className="flex-1" disabled={!contactCodeValid}
                      onClick={handleVerifyContact} type="button" loading={verifying}>
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Vérification…
                        </>
                      ) : (
                        "Confirmer le code"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Lien connexion */}
          {!done && (
            <p className="text-sm text-[#101010]/60 text-center mt-5">
              Vous avez déjà un compte&nbsp;?{" "}
              <Link href="/connexion" className="font-medium text-[#507300] hover:underline underline-offset-2">
                Se connecter
              </Link>
            </p>
          )}

          {/* Sécurité */}
          <div className="mt-4 bg-white/70 rounded-xl px-5 py-4 flex flex-col items-center gap-1 border border-[#101010]/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#166534]" />
              <span className="text-sm font-medium text-[#101010]">
                Vos données restent privées
              </span>
            </div>
            <span className="text-xs text-[#101010]/45">
              Plateforme de démonstration — Nexora Capital
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
