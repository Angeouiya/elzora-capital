"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Inbox, Mail, MailCheck, ShieldCheck, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";

export function ForgotPassword() {
  const locale = useAppStore((state) => state.locale);
  const setView = useAppStore((state) => state.setView);
  const userEmail = useAppStore((state) => state.userEmail);
  const [email, setEmail] = useState(userEmail || "");
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const en = locale === "en";
  const copy = en ? {
    kicker: "Account access",
    asideTitle: "A secure way back in.",
    asideText: "Request a private, time-limited link. Your current password is never sent or displayed.",
    title: "Forgot your password?",
    intro: "Enter the email address linked to your NEXORA account.",
    email: "Email address",
    submit: "Send the secure link",
    submitting: "Sending…",
    back: "Back to sign in",
    unavailable: "We cannot send the email right now. Please try again shortly.",
    sentTitle: "Check your inbox",
    sentText: (value: string) => `If a NEXORA account matches ${value}, a secure link will arrive shortly.`,
    sentHint: "The link can only be used once and expires after 30 minutes.",
    resend: "Use another address",
    protected: "No account information is revealed",
    limited: "Requests are automatically limited",
  } : {
    kicker: "Accès au compte",
    asideTitle: "Retrouvez votre accès, en toute sécurité.",
    asideText: "Recevez un lien privé et temporaire. Votre mot de passe actuel n’est jamais envoyé ni affiché.",
    title: "Mot de passe oublié ?",
    intro: "Saisissez l’adresse e-mail associée à votre compte NEXORA.",
    email: "Adresse e-mail",
    submit: "Recevoir le lien sécurisé",
    submitting: "Envoi en cours…",
    back: "Retour à la connexion",
    unavailable: "Nous ne pouvons pas envoyer l’e-mail pour le moment. Réessayez dans quelques instants.",
    sentTitle: "Consultez votre boîte mail",
    sentText: (value: string) => `Si un compte NEXORA correspond à ${value}, un lien sécurisé arrivera dans quelques instants.`,
    sentHint: "Le lien est utilisable une seule fois et expire après 30 minutes.",
    resend: "Utiliser une autre adresse",
    protected: "Aucune information de compte n’est révélée",
    limited: "Les demandes sont automatiquement limitées",
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, locale }),
      });
      if (!response.ok) throw new Error("EMAIL_UNAVAILABLE");
      setSentTo(normalizedEmail);
    } catch {
      setError(copy.unavailable);
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
              <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[#d79c9f]" />{copy.protected}</p>
              <p className="flex items-center gap-3"><TimerReset className="h-4 w-4 text-[#d79c9f]" />{copy.limited}</p>
            </div>
          </div>
        </aside>

        <Card className="auth-form-card m-1 rounded-[1.75rem] border-0 bg-[#fffefd] shadow-none sm:m-2 lg:rounded-l-[1.35rem]">
          {sentTo ? (
            <CardContent className="flex min-h-[34rem] flex-col justify-center px-5 py-10 sm:px-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6f0] text-[#541249]">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-[-.04em]">{copy.sentTitle}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{copy.sentText(sentTo)}</p>
              <div className="mt-6 rounded-2xl border border-[#541249]/10 bg-[#faf6f9] p-4">
                <p className="text-xs leading-5 text-[#541249]">{copy.sentHint}</p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Button className="h-12" onClick={() => setView("login")}>
                  <ArrowLeft className="h-4 w-4" />{copy.back}
                </Button>
                <Button variant="outline" className="h-12" onClick={() => { setSentTo(""); setError(null); }}>
                  {copy.resend}
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="px-5 pb-4 pt-8 sm:px-10 sm:pt-12">
                <Button variant="ghost" size="sm" className="mb-5 w-fit -ml-2" onClick={() => setView("login")}>
                  <ArrowLeft className="h-4 w-4" />{copy.back}
                </Button>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#f3e6f0] text-[#541249]"><Inbox className="h-5 w-5" /></div>
                <CardTitle className="text-2xl font-black tracking-[-.035em] sm:text-3xl">{copy.title}</CardTitle>
                <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">{copy.intro}</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-8 sm:px-10 sm:pb-12">
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <Label htmlFor="forgot-email" className="text-xs">{copy.email}</Label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="vous@exemple.com"
                        className="h-12 rounded-xl pl-9"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</p> : null}
                  <Button type="submit" className="btn-nexora h-12 w-full" disabled={submitting || !email.trim()}>
                    {submitting ? copy.submitting : copy.submit}<ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
