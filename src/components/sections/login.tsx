"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas encore de compte ?",
    register: "Créer un compte",
    security: "Votre mot de passe n’est jamais stocké en clair. La session est conservée dans un cookie sécurisé inaccessible aux scripts de la page.",
  } : {
    title: "Sign in to your account",
    intro: "Access your portfolio or company workspace.",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    noAccount: "Don’t have an account yet?",
    register: "Create account",
    security: "Your password is never stored in plain text. Your session is kept in a secure cookie that page scripts cannot access.",
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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data?.error || "Identifiants invalides.";
        setError(msg);
        toast({
          title: "Connexion refusée",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data?.error || "Erreur inattendue. Réessayez.";
        setError(msg);
        toast({
          title: "Erreur",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      const data = (await res.json()) as { user?: { email?: string } };
      const userEmail = data?.user?.email || trimmedEmail;
      toast({
        title: "Bienvenue",
        description: `Vous êtes connecté en tant que ${userEmail}.`,
      });
      login(userEmail);
    } catch (err) {
      const msg = "Réseau inaccessible. Vérifiez votre connexion et réessayez.";
      setError(msg);
      toast({
        title: "Erreur réseau",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-shell max-w-md py-10 sm:py-14 reveal-in">
      <Card className="border-border/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-nexora-black">
            <Lock className="h-6 w-6 text-nexora-lime" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {copy.title}
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {copy.intro}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="login-password" className="text-xs">
                {copy.password}
              </Label>
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
              className="btn-nexora w-full"
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
            <button
              type="button"
              onClick={() => setView("register")}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {copy.register}
            </button>
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
            <p className="text-[11px] leading-relaxed text-positive">
              {copy.security}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
