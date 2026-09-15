"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center px-space-md pb-10">
      {/* Decorative gradient orb */}
      <div className="fixed top-[-120px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-primary-container/20 blur-[100px] pointer-events-none" />

      {/* Top Section - Logo & Brand */}
      <div className="animate-scale-in mt-12 mb-8 flex flex-col items-center gap-space-sm">
        <NexoraLogo size={56} />
        <h1 className="text-headline-md font-headline-md text-on-surface mt-2">
          Nexora Capital
        </h1>
        <p className="text-body-md text-secondary tracking-wide">
          Investissez en toute confiance
        </p>
      </div>

      {/* Login Form Card */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-1 w-full max-w-[420px] bg-surface-container-lowest rounded-[20px] p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]">
        <h2 className="text-headline-sm font-headline-sm text-on-surface mb-6">
          Connexion à votre compte
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-label-caps text-secondary uppercase">
              Adresse email
            </label>
            <div
              className={`flex items-center gap-space-sm bg-surface-container-low rounded-xl px-4 py-3 border transition-colors duration-200 ${
                emailTouched && !emailValid
                  ? "border-error focus-within:border-error"
                  : "border-transparent focus-within:border-primary-container"
              }`}
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">
                mail
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="votre@email.com"
                autoComplete="email"
                className="flex-1 bg-transparent text-body-lg text-on-surface placeholder:text-outline-variant outline-none"
              />
              {emailTouched && emailValid && (
                <span className="material-symbols-outlined text-tertiary text-[20px] animate-scale-in">
                  check_circle
                </span>
              )}
              {emailTouched && !emailValid && email.length > 0 && (
                <span className="material-symbols-outlined text-error text-[20px] animate-scale-in">
                  error
                </span>
              )}
            </div>
            {emailTouched && !emailValid && email.length > 0 && (
              <p className="text-body-sm text-error pl-1 animate-fade-in-up">
                Veuillez entrer une adresse email valide
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-label-caps text-secondary uppercase">
              Mot de passe
            </label>
            <div
              className={`flex items-center gap-space-sm bg-surface-container-low rounded-xl px-4 py-3 border transition-colors duration-200 ${
                passwordTouched && !passwordValid
                  ? "border-error focus-within:border-error"
                  : "border-transparent focus-within:border-primary-container"
              }`}
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">
                lock
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="flex-1 bg-transparent text-body-lg text-on-surface placeholder:text-outline-variant outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-secondary hover:text-on-surface transition-colors duration-200 cursor-pointer"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {passwordTouched && !passwordValid && password.length > 0 && (
              <p className="text-body-sm text-error pl-1 animate-fade-in-up">
                Le mot de passe doit contenir au moins 6 caractères
              </p>
            )}
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="text-body-md font-medium text-on-primary-container hover:text-primary transition-colors duration-200"
            >
              Mot de passe oublié&nbsp;?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="glow-primary bg-primary-container text-on-primary-container rounded-xl py-3.5 px-6 text-body-lg font-semibold flex items-center justify-center gap-space-sm transition-all duration-200 hover:brightness-[1.05] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1"
          >
            {loading ? (
              <>
                <span className="animate-spin material-symbols-outlined text-[20px]">
                  progress_activity
                </span>
                <span>Connexion en cours…</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <span className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-space-sm py-2">
            <div className="flex-1 h-px bg-outline-variant/50" />
            <span className="text-body-sm text-tertiary whitespace-nowrap">ou</span>
            <div className="flex-1 h-px bg-outline-variant/50" />
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-space-sm">
            <button
              type="button"
              className="flex items-center justify-center gap-space-sm bg-surface-container-low hover:bg-surface-container-high rounded-xl py-3 px-4 text-body-md font-medium text-on-surface transition-all duration-200 hover-lift cursor-pointer border border-outline-variant/30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-space-sm bg-on-surface hover:bg-inverse-surface rounded-xl py-3 px-4 text-body-md font-medium text-surface transition-all duration-200 hover-lift cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>Continuer avec Apple</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Badge */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-2 w-full max-w-[420px] mt-4 bg-surface-container-low rounded-2xl px-5 py-4 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-tertiary text-[18px]">
            shield
          </span>
          <span className="text-body-sm font-medium text-on-surface">
            Connexion sécurisée SSL 256-bit
          </span>
        </div>
        <span className="text-body-sm text-tertiary">
          Conforme aux normes BCEAO/UEMOA
        </span>
      </div>

      {/* Register Prompt */}
      <div className="animate-fade-in-up animate-fade-in-up-delay-3 w-full max-w-[420px] mt-8 flex flex-col items-center gap-space-sm">
        <p className="text-body-md text-secondary">Pas encore de compte&nbsp;?</p>
        <Link
          href="/inscription"
          className="inline-flex items-center gap-space-xs bg-primary-container text-on-primary-container rounded-xl px-5 py-2.5 text-body-md font-semibold hover:brightness-[1.05] transition-all duration-200 hover-lift"
        >
          Créer un compte investisseur
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
        <Link
          href="/entreprise"
          className="text-body-sm text-on-primary-container hover:text-primary transition-colors duration-200 mt-1 font-medium"
        >
          Vous êtes une entreprise&nbsp;?
        </Link>
      </div>

      {/* Footer */}
      <p className="animate-fade-in-up animate-fade-in-up-delay-4 text-body-sm text-tertiary text-center max-w-[360px] mt-10 leading-relaxed">
        En vous connectant, vous acceptez nos{" "}
        <Link href="/cgu" className="underline underline-offset-2 hover:text-on-surface transition-colors">
          CGU
        </Link>{" "}
        et notre{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-on-surface transition-colors">
          politique de confidentialité
        </Link>
      </p>
    </main>
  );
}
