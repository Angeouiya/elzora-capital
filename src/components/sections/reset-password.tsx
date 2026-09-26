"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordChecks, isStrongPassword } from "@/lib/password-policy";
import { PASSWORD_RESET_TOKEN_PATTERN } from "@/lib/password-reset";
import { useAppStore } from "@/lib/store";

export function ResetPassword() {
  const locale = useAppStore((state) => state.locale);
  const setView = useAppStore((state) => state.setView);
  const [token] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(!PASSWORD_RESET_TOKEN_PATTERN.test(token));
  const [error, setError] = useState<string | null>(null);
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const strength = [checks.length, checks.uppercase, checks.lowercase, checks.number, checks.symbol].filter(Boolean).length;
  const en = locale === "en";
  const copy = en ? {
    kicker: "Account security",
    asideTitle: "A fresh key for your private space.",
    asideText: "Choose a strong password. Once confirmed, every active session will be signed out automatically.",
    title: "Create a new password",
    intro: "Use a unique password you do not use on another service.",
    password: "New password",
    confirmation: "Confirm password",
    show: "Show passwords",
    hide: "Hide passwords",
    ruleLength: "10 to 200 characters",
    ruleVariety: "At least three: uppercase, lowercase, number, symbol",
    mismatch: "The two passwords do not match.",
    weak: "Choose a stronger password before continuing.",
    submit: "Secure my account",
    submitting: "Updating…",
    expiredTitle: "This link is no longer valid",
    expiredText: "It may have expired or already been used. Request a new secure link.",
    request: "Request a new link",
    doneTitle: "Your password has been changed",
    doneText: "All previous sessions have been signed out. You can now sign in with your new password.",
    signIn: "Sign in",
    unavailable: "The password cannot be updated right now. Please try again shortly.",
    protected: "Single-use link",
    sessions: "Other sessions automatically closed",
  } : {
    kicker: "Sécurité du compte",
    asideTitle: "Une nouvelle clé pour votre espace privé.",
    asideText: "Choisissez un mot de passe solide. Après confirmation, toutes les connexions actives seront fermées automatiquement.",
    title: "Créez un nouveau mot de passe",
    intro: "Utilisez un mot de passe unique que vous n’employez sur aucun autre service.",
    password: "Nouveau mot de passe",
    confirmation: "Confirmer le mot de passe",
    show: "Afficher les mots de passe",
    hide: "Masquer les mots de passe",
    ruleLength: "10 à 200 caractères",
    ruleVariety: "Au moins trois éléments : majuscule, minuscule, chiffre, symbole",
    mismatch: "Les deux mots de passe ne correspondent pas.",
    weak: "Choisissez un mot de passe plus solide avant de continuer.",
    submit: "Sécuriser mon compte",
    submitting: "Modification en cours…",
    expiredTitle: "Ce lien n’est plus valide",
    expiredText: "Il a peut-être expiré ou déjà été utilisé. Demandez un nouveau lien sécurisé.",
    request: "Demander un nouveau lien",
    doneTitle: "Votre mot de passe est modifié",
    doneText: "Toutes les anciennes connexions ont été fermées. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
    signIn: "Se connecter",
    unavailable: "Le mot de passe ne peut pas être modifié pour le moment. Réessayez dans quelques instants.",
    protected: "Lien à usage unique",
    sessions: "Autres connexions fermées automatiquement",
  };

  useEffect(() => {
    if (!token) return;
    window.history.replaceState({}, "", window.location.pathname);
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) {
      setError(copy.weak);
      return;
    }
    if (password !== confirmation) {
      setError(copy.mismatch);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (response.status === 410 || payload.error === "RESET_LINK_INVALID") {
        setLinkInvalid(true);
        return;
      }
      if (!response.ok) throw new Error(payload.error || "RESET_FAILED");
      setCompleted(true);
      setPassword("");
      setConfirmation("");
    } catch {
      setError(copy.unavailable);
    } finally {
      setSubmitting(false);
    }
  };

  if (linkInvalid) {
    return (
      <section className="page-shell py-8 sm:py-12">
        <Card className="mx-auto max-w-lg rounded-[1.75rem] border-[#541249]/12 p-2 text-center shadow-[0_22px_60px_rgba(56,12,49,.09)]">
          <CardContent className="px-5 py-10 sm:px-10">
            <KeyRound className="mx-auto h-10 w-10 text-[#541249]" />
            <h1 className="mt-5 text-2xl font-black tracking-[-.035em]">{copy.expiredTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.expiredText}</p>
            <Button className="mt-7 h-12 w-full" onClick={() => setView("forgot_password")}>{copy.request}<ArrowRight className="h-4 w-4" /></Button>
            <Button variant="link" className="mt-3" onClick={() => setView("login")}><ArrowLeft className="h-4 w-4" />{copy.signIn}</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (completed) {
    return (
      <section className="page-shell py-8 sm:py-12">
        <Card className="mx-auto max-w-lg overflow-hidden rounded-[1.75rem] border-[#541249]/12 text-center shadow-[0_24px_70px_rgba(56,12,49,.11)]">
          <div className="bg-[linear-gradient(135deg,#541249,#2f0a2a_68%,#160412)] px-6 py-9 text-white">
            <CircleCheck className="mx-auto h-11 w-11 text-[#e7bade]" />
            <h1 className="mt-5 text-3xl font-black tracking-[-.04em]">{copy.doneTitle}</h1>
          </div>
          <CardContent className="px-5 py-8 sm:px-10">
            <p className="text-sm leading-6 text-muted-foreground">{copy.doneText}</p>
            <Button className="mt-7 h-12 w-full" onClick={() => setView("login")}>{copy.signIn}<ArrowRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="page-shell auth-page-shell reveal-in">
      <div className="auth-stage grid overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden min-h-[40rem] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full border border-white/10" />
          <p className="editorial-kicker">{copy.kicker}</p>
          <div className="relative">
            <h1 className="max-w-md text-5xl font-black leading-[.95] tracking-[-.055em]">{copy.asideTitle}</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/62">{copy.asideText}</p>
            <div className="mt-8 grid gap-3 text-xs text-white/72">
              <p className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-[#d79c9f]" />{copy.protected}</p>
              <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[#d79c9f]" />{copy.sessions}</p>
            </div>
          </div>
        </aside>

        <Card className="auth-form-card m-1 rounded-[1.75rem] border-0 bg-[#fffefd] shadow-none sm:m-2 lg:rounded-l-[1.35rem]">
          <CardHeader className="px-5 pb-4 pt-8 sm:px-10 sm:pt-12">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#f3e6f0] text-[#541249]"><LockKeyhole className="h-5 w-5" /></div>
            <CardTitle className="text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.title}</CardTitle>
            <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">{copy.intro}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-8 sm:px-10 sm:pb-12">
            <form onSubmit={submit} className="space-y-4">
              <PasswordField id="reset-password" label={copy.password} value={password} onChange={setPassword} visible={showPassword} autoComplete="new-password" />
              <PasswordField id="reset-confirmation" label={copy.confirmation} value={confirmation} onChange={setConfirmation} visible={showPassword} autoComplete="new-password" />
              <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPassword ? copy.hide : copy.show}
              </Button>
              <div className="rounded-2xl border border-[#541249]/10 bg-[#faf6f9] p-4">
                <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-1.5 rounded-full ${strength >= level ? "bg-[#6f1f62]" : "bg-[#e9dfe6]"}`} />)}
                </div>
                <ul className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">
                  <li className={checks.length ? "text-[#541249]" : ""}>{copy.ruleLength}</li>
                  <li className={strength >= 4 ? "text-[#541249]" : ""}>{copy.ruleVariety}</li>
                </ul>
              </div>
              {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</p> : null}
              <Button type="submit" className="btn-nexora h-12 w-full" disabled={submitting || !password || !confirmation}>
                {submitting ? copy.submitting : copy.submit}<ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PasswordField({ id, label, value, onChange, visible, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; autoComplete: string }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-1.5 h-12 rounded-xl" required />
    </div>
  );
}
