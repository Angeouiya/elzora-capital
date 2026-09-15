"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Landmark,
  TrendingUp,
  Loader2,
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
        setLoading(false);
        return;
      }

      /* Redirection selon le rôle (ou vers la page demandée via ?redirectTo=) */
      const redirectTo = new URLSearchParams(window.location.search).get(
        "redirectTo"
      );

      let target = "/dashboard";
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const role = session?.user?.role as string | undefined;
        if (role === "ENTERPRISE") target = "/entreprise/dashboard";
        else if (role === "ADMIN") target = "/admin/dashboard";
      } catch {
        /* session illisible : redirection par défaut */
      }
      if (redirectTo && redirectTo.startsWith("/")) target = redirectTo;

      window.location.href = target;
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] grid grid-cols-1 lg:grid-cols-2">
      {/* ----------------------- Panneau marque (desktop) --------------------- */}
      <div className="hidden lg:flex bg-[#101010] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#B6FF00]/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <Link href="/" className="relative flex items-center gap-3">
          <NexoraLogoDark size={40} />
          <span className="text-white text-xl font-semibold tracking-tight">
            Nexora Capital
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
            Investissez en toute{" "}
            <span className="text-[#B6FF00]">confiance</span>.
          </h1>
          <p className="text-white/50 mt-4 leading-relaxed">
            Accédez aux offres d&apos;investissement vérifiées, suivez vos
            placements et percevez vos échéances depuis un espace unique.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              {
                icon: CheckCircle2,
                text: "Offres analysées et vérifiées avant publication",
              },
              {
                icon: Landmark,
                text: "0 frais de souscription pour l'investisseur",
              },
              {
                icon: TrendingUp,
                text: "Suivi des remboursements en temps réel",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <item.icon className="h-5 w-5 text-[#B6FF00] shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm leading-relaxed">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/30 text-xs flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Plateforme de démonstration — Nexora Capital
        </p>
      </div>

      {/* ------------------------------ Formulaire ---------------------------- */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-fade-in-up">
          {/* Logo (visible sur mobile) */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <NexoraLogo size={48} />
            <h1 className="text-xl font-semibold text-[#101010] mt-3 tracking-tight">
              Nexora Capital
            </h1>
            <p className="text-sm text-[#101010]/50 mt-0.5">
              Investissez en toute confiance
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] border border-[#101010]/5">
            <h2 className="text-lg font-bold text-[#101010] mb-1">
              Connexion à votre compte
            </h2>
            <p className="text-sm text-[#101010]/50 mb-6">
              Accédez à votre espace investisseur ou entreprise.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50"
                >
                  Adresse email
                </label>
                <div
                  className={`flex items-center gap-2.5 bg-[#f9f9f7] rounded-lg px-4 border transition-colors ${
                    error && !emailValid
                      ? "border-[#C62828]"
                      : "border-transparent focus-within:border-[#B6FF00]"
                  }`}
                >
                  <Mail className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    className="flex-1 h-12 bg-transparent text-sm text-[#101010] placeholder:text-[#101010]/35 outline-none"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50"
                >
                  Mot de passe
                </label>
                <div
                  className={`flex items-center gap-2.5 bg-[#f9f9f7] rounded-lg px-4 border transition-colors ${
                    error && !passwordValid
                      ? "border-[#C62828]"
                      : "border-transparent focus-within:border-[#B6FF00]"
                  }`}
                >
                  <Lock className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="flex-1 h-12 bg-transparent text-sm text-[#101010] placeholder:text-[#101010]/35 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="text-[#101010]/40 hover:text-[#101010] transition-colors shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end">
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-sm font-medium text-[#507300] hover:underline underline-offset-2 transition-colors"
                >
                  Mot de passe oublié&nbsp;?
                </Link>
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#C62828]/10 animate-fade-in-up">
                  <AlertCircle className="h-4.5 w-4.5 text-[#C62828] shrink-0 mt-0.5" />
                  <p className="text-sm text-[#C62828]">{error}</p>
                </div>
              )}

              {/* Soumission */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? "Connexion en cours…" : "Se connecter"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 py-5">
              <div className="flex-1 h-px bg-[#101010]/10" />
              <span className="text-xs text-[#101010]/40">ou</span>
              <div className="flex-1 h-px bg-[#101010]/10" />
            </div>

            {/* Inscription */}
            <p className="text-sm text-[#101010]/60 text-center mb-3">
              Pas encore de compte&nbsp;?
            </p>
            <Link href="/inscription" className="block">
              <Button variant="secondary" size="lg" className="w-full">
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Sécurité */}
          <div className="mt-4 bg-white/70 rounded-xl px-5 py-4 flex flex-col items-center gap-1 border border-[#101010]/5">
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 text-[#101010]/40 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-[#166534]" />
              )}
              <span className="text-sm font-medium text-[#101010]">
                Connexion sécurisée SSL 256-bit
              </span>
            </div>
            <span className="text-xs text-[#101010]/45">
              Plateforme de démonstration
            </span>
          </div>

          {/* Footer */}
          <p className="text-xs text-[#101010]/40 text-center leading-relaxed mt-6">
            En vous connectant, vous acceptez nos{" "}
            <Link href="/cgu" className="underline underline-offset-2 hover:text-[#101010] transition-colors">
              CGU
            </Link>{" "}
            et notre{" "}
            <Link
              href="/confidentialite"
              className="underline underline-offset-2 hover:text-[#101010] transition-colors"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
