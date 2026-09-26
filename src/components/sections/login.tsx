"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Fingerprint, ScanLine } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function Login() {
  const setView = useAppStore((s) => s.setView);
  const login = useAppStore((s) => s.login);
  const locale = useAppStore((s) => s.locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = locale === "fr" ? {
    title: "Connexion à votre espace",
    intro: "Accédez à votre portefeuille ou à l’espace entreprise.",
    password: "Mot de passe",
    forgot: "Mot de passe oublié ?",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas encore de compte ?",
    register: "Créer un compte",
    orEmail: "ou avec votre adresse email",
    security: "Votre mot de passe et vos informations de connexion restent protégés à chaque visite.",
    kicker: "Votre espace privé", asideTitle: "Retrouvez vos décisions, pas du bruit.", asideText: "Suivez vos engagements, vos documents et vos mouvements depuis un espace unique, pensé pour rester lisible.", protected: "Session protégée", verified: "Identité vérifiée avant souscription",
    invalid: "Adresse email ou mot de passe incorrect.", refused: "Connexion refusée", unavailable: "Connexion momentanément indisponible. Réessayez dans quelques instants.", errorTitle: "Connexion indisponible", welcome: "Bienvenue", welcomeText: (email: string) => `Vous êtes connecté avec ${email}.`,
  } : {
    title: "Sign in to your account",
    intro: "Access your portfolio or company workspace.",
    password: "Password",
    forgot: "Forgot password?",
    submit: "Sign in",
    submitting: "Signing in…",
    noAccount: "Don’t have an account yet?",
    register: "Create account",
    orEmail: "or with your email address",
    security: "Your password and sign-in information remain protected on every visit.",
    kicker: "Your private space", asideTitle: "Find your decisions, not the noise.", asideText: "Track commitments, documents and movements from one clear, carefully designed space.", protected: "Protected session", verified: "Identity verified before subscription",
    invalid: "Incorrect email address or password.", refused: "Sign-in refused", unavailable: "Sign-in is temporarily unavailable. Please try again shortly.", errorTitle: "Sign-in unavailable", welcome: "Welcome", welcomeText: (email: string) => `You are signed in with ${email}.`,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      if (res.status === 401) {
        const msg = copy.invalid;
        setError(msg);
        toast({
          title: copy.refused,
          description: msg,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        const msg = copy.unavailable;
        setError(msg);
        toast({
          title: copy.errorTitle,
          description: msg,
          variant: "destructive",
        });
        return;
      }
      const data = (await res.json()) as { user?: { email?: string } };
      const userEmail = data?.user?.email || trimmedEmail;
      toast({
        title: copy.welcome,
        description: copy.welcomeText(userEmail),
      });
      login(userEmail);
    } catch {
      const msg = copy.unavailable;
      setError(msg);
      toast({
        title: copy.errorTitle,
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-shell auth-page-shell reveal-in">
      <div className="auth-stage grid overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden min-h-[38rem] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-28 top-8 h-72 w-72 rounded-full border border-[#c5878a]/25" />
          <p className="editorial-kicker">{copy.kicker}</p>
          <div className="relative">
            <h1 className="max-w-md text-5xl font-black leading-[.95] tracking-[-.055em]">{copy.asideTitle}</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/62">{copy.asideText}</p>
            <div className="mt-8 grid gap-3 text-xs text-white/72">
              <p className="flex items-center gap-3"><Fingerprint className="h-4 w-4 text-[#d79c9f]" />{copy.protected}</p>
              <p className="flex items-center gap-3"><ScanLine className="h-4 w-4 text-[#d79c9f]" />{copy.verified}</p>
            </div>
          </div>
        </aside>

        <Card className="auth-form-card m-1 rounded-[1.75rem] border-0 bg-[#fffefd] shadow-none sm:m-2 lg:rounded-l-[1.35rem]">
          <CardHeader className="px-5 pb-4 pt-8 sm:px-10 sm:pt-12">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#f3e6f0] text-[#541249]"><Lock className="h-5 w-5" /></div>
            <CardTitle className="text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.title}</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">{copy.intro}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-8 sm:px-10 sm:pb-12">
          <GoogleSignInButton />
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#541249]/10" />
            <span className="text-[11px] font-medium text-muted-foreground">{copy.orEmail}</span>
            <span className="h-px flex-1 bg-[#541249]/10" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="login-email" className="text-xs">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="login-password" className="text-xs">
                  {copy.password}
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-semibold"
                  onClick={() => setView("forgot_password")}
                >
                  {copy.forgot}
                </Button>
              </div>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-nexora-danger/30 bg-[#FFF5F5] p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-nexora-danger" />
                <p className="text-xs text-nexora-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="btn-nexora h-12 w-full"
            >
              {submitting ? (
                copy.submitting
              ) : (
                <>
                  {copy.submit}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* No-account CTA */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {copy.noAccount}{" "}
            <Button type="button" variant="link" onClick={() => setView("register")} className="inline h-auto p-0 align-baseline font-semibold">
              {copy.register}
            </Button>
          </p>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#541249]/8 bg-nexora-pale p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
            <p className="text-[11px] leading-relaxed text-positive">
              {copy.security}
            </p>
          </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
