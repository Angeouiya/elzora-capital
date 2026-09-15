"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft, ShieldCheck } from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!emailValid) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la demande.");
        return;
      }
      setSent(true);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <NexoraLogo size={48} />
          <h1 className="text-xl font-semibold text-[#101010] mt-3 tracking-tight">
            Nexora Capital
          </h1>
          <p className="text-sm text-[#101010]/50 mt-0.5">Récupération de compte</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] border border-[#101010]/5">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-[#EFFBDD] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-[#166534]" />
              </div>
              <h2 className="text-lg font-bold text-[#101010]">Demande enregistrée</h2>
              <p className="text-sm text-[#101010]/60 mt-2 leading-relaxed">
                Si un compte est associé à <strong>{email}</strong>, des instructions de
                récupération ont été envoyées à cette adresse.
              </p>
              <p className="text-xs text-[#101010]/45 mt-3 leading-relaxed">
                Pour des raisons de sécurité, la réponse ne révèle pas si le compte existe.
                Les demandes de récupération font l&apos;objet de contrôles adaptés.
              </p>
              <div className="mt-6">
                <Link href="/connexion">
                  <Button variant="primary" size="lg" className="w-full">
                    Retour à la connexion
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#101010] mb-1">Mot de passe oublié</h2>
              <p className="text-sm text-[#101010]/50 mb-6 leading-relaxed">
                Indiquez l&apos;adresse email de votre compte. Nous vous enverrons la marche à
                suivre pour définir un nouveau mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50">
                    Adresse email
                  </label>
                  <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 shadow-[0_1px_2px_rgba(16,16,16,0.03)] ring-1 ring-[#101010]/10 focus-within:ring-2 focus-within:ring-[#B6FF00] focus-within:shadow-[0_0_0_4px_rgba(182,255,0,0.15)] transition-all">
                    <Mail className="h-4.5 w-4.5 text-[#101010]/40 shrink-0" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="email"
                      className="flex-1 h-12 bg-transparent text-base md:text-sm text-[#101010] placeholder:text-[#101010]/35 outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#C62828]/10">
                    <AlertCircle className="h-4.5 w-4.5 text-[#C62828] shrink-0 mt-0.5" />
                    <p className="text-sm text-[#C62828]">{error}</p>
                  </div>
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                  {loading ? "Envoi en cours…" : "Envoyer les instructions"}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#507300] hover:underline underline-offset-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 bg-white/70 rounded-xl px-5 py-4 flex items-center justify-center gap-2 border border-[#101010]/5">
          <ShieldCheck className="h-4 w-4 text-[#166534]" />
          <span className="text-xs text-[#101010]/45">
            Plateforme de démonstration — aucun email réel n&apos;est envoyé
          </span>
        </div>
      </div>
    </div>
  );
}
