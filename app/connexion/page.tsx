"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { NexoraLogo, NexoraLogoDark } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const formValid = emailValid && passwordValid;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formValid) {
      setError(
        !emailValid
          ? "Veuillez saisir une adresse email valide."
          : "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect. Veuillez réessayer.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const session = await sessionResponse.json();
      const role = session?.user?.role as string | undefined;

      /* Le portail interne possède sa propre authentification. */
      if (role === "ADMIN") {
        await signOut({ redirect: false });
        setError("Ce compte ne peut pas accéder à ce portail.");
        return;
      }

      let target = role === "ENTERPRISE" ? "/entreprise/dashboard" : "/dashboard";
      const requestedTarget = new URLSearchParams(window.location.search).get(
        "redirectTo"
      );

      const safeRedirect =
        requestedTarget &&
        requestedTarget.startsWith("/") &&
        !requestedTarget.startsWith("//") &&
        !requestedTarget.startsWith("/admin");

      if (safeRedirect) target = requestedTarget;
      window.location.assign(target);
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#F5F5F3] lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#101010] p-10 xl:p-12 lg:flex">
        <div className="absolute right-0 top-0 h-1 w-28 bg-[#B6FF00]" aria-hidden="true" />

        <Link href="/" className="group relative flex items-center gap-3 self-start">
          <NexoraLogoDark size={40} className="transition-transform duration-200 group-hover:scale-[1.03]" />
          <div>
            <p className="text-lg font-bold tracking-[-0.02em] text-white">Nexora Capital</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-white/36">Portail principal</p>
          </div>
        </Link>

        <div className="relative max-w-lg py-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B6FF00]">Votre espace</p>
          <h1 className="mt-4 text-[40px] font-bold leading-[1.03] tracking-[-0.045em] text-white xl:text-[48px]">
            Retrouvez vos opérations dans une interface claire.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/52 xl:text-base">
            Investissements, financement d&apos;entreprise, documents et suivi sont regroupés selon votre profil.
          </p>

          <ul className="mt-9 space-y-4">
            {[
              {
                icon: CheckCircle2,
                text: "Offres publiées après le parcours d’analyse prévu",
              },
              {
                icon: Landmark,
                text: "Aucune commission de plateforme annoncée à l’investisseur",
              },
              {
                icon: TrendingUp,
                text: "Suivi centralisé des investissements et remboursements",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/6">
                  <item.icon className="h-4 w-4 text-[#B6FF00]" />
                </span>
                <span className="pt-1.5 text-sm leading-relaxed text-white/68">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/32">
          <ShieldCheck className="h-4 w-4" />
          <span>Mode démonstration · Aucun paiement réel</span>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-[460px] animate-fade-in-up">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Link href="/" aria-label="Accueil Nexora Capital">
              <NexoraLogo size={48} />
            </Link>
            <h1 className="mt-3 text-xl font-bold tracking-[-0.025em] text-[#101010]">Nexora Capital</h1>
            <p className="mt-1 text-sm text-[#101010]/46">Accédez à votre espace</p>
          </div>

          <div className="rounded-[24px] border border-[#101010]/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.07)] sm:p-8">
            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#101010]/36">Connexion</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[#101010]">Bienvenue</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#101010]/52">
                Utilisez les identifiants de votre compte investisseur ou entreprise.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="text-[13px] font-semibold text-[#101010]/78">
                  Adresse email
                </label>
                <div
                  className={`flex h-[52px] items-center gap-2.5 rounded-[14px] border bg-white px-4 shadow-[0_1px_2px_rgba(16,16,16,0.03)] transition-[border-color,box-shadow] sm:h-12 ${
                    error && !emailValid
                      ? "border-[#C62828] shadow-[0_0_0_4px_rgba(198,40,40,0.08)]"
                      : "border-[#101010]/11 focus-within:border-[#B6FF00] focus-within:shadow-[0_0_0_4px_rgba(182,255,0,0.14)]"
                  }`}
                >
                  <Mail className="h-[18px] w-[18px] shrink-0 text-[#101010]/36" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    className="h-full min-w-0 flex-1 bg-transparent text-base text-[#101010] outline-none placeholder:text-[#101010]/32 sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-[13px] font-semibold text-[#101010]/78">
                    Mot de passe
                  </label>
                  <Link
                    href="/mot-de-passe-oublie"
                    className="text-xs font-semibold text-[#486800] transition-colors hover:text-[#101010]"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div
                  className={`flex h-[52px] items-center gap-2.5 rounded-[14px] border bg-white px-4 shadow-[0_1px_2px_rgba(16,16,16,0.03)] transition-[border-color,box-shadow] sm:h-12 ${
                    error && !passwordValid
                      ? "border-[#C62828] shadow-[0_0_0_4px_rgba(198,40,40,0.08)]"
                      : "border-[#101010]/11 focus-within:border-[#B6FF00] focus-within:shadow-[0_0_0_4px_rgba(182,255,0,0.14)]"
                  }`}
                >
                  <Lock className="h-[18px] w-[18px] shrink-0 text-[#101010]/36" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent text-base text-[#101010] outline-none placeholder:text-[#101010]/32 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-[#101010]/38 transition-colors hover:bg-[#F5F5F3] hover:text-[#101010]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-[14px] border border-[#C62828]/12 bg-[#C62828]/7 p-3.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C62828]" />
                  <p className="text-sm leading-relaxed text-[#C62828]">{error}</p>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
                Se connecter
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#101010]/8" />
              <span className="text-[11px] font-medium text-[#101010]/34">Nouveau sur Nexora ?</span>
              <div className="h-px flex-1 bg-[#101010]/8" />
            </div>

            <Link href="/inscription" className="block">
              <Button variant="secondary" size="lg" fullWidth>
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-[14px] border border-[#101010]/6 bg-white/65 px-4 py-3 text-center">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#166534]" />
            <span className="text-xs font-medium text-[#101010]/54">Protection de session activée · Mode démonstration</span>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-[#101010]/38">
            En vous connectant, vous acceptez nos{" "}
            <Link href="/cgu" className="underline underline-offset-2 transition-colors hover:text-[#101010]">CGU</Link>{" "}
            et notre{" "}
            <Link href="/confidentialite" className="underline underline-offset-2 transition-colors hover:text-[#101010]">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
