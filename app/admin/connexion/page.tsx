"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NexoraLogoDark } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, AlertCircle } from "lucide-react";

export default function AdminConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Identifiants incorrects. Accès réservé à l'équipe Nexora.");
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <NexoraLogoDark size={56} />
          <h1 className="text-white text-2xl font-bold mt-4">Nexora Capital</h1>
          <Badge variant="default" className="mt-3 bg-white/10 text-white/60 border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Espace Équipe Nexora
          </Badge>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-[#101010] mb-1">Connexion administrateur</h2>
          <p className="text-sm text-[#101010]/60 mb-6">
            Portail réservé aux membres autorisés de l&apos;équipe Nexora Capital.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="prenom.nom@nexora.capital"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#C62828]/10 text-[#C62828] text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Se connecter
            </Button>
          </form>

          <p className="text-xs text-[#101010]/40 text-center mt-6">
            Connexion sécurisée · Accès journalisé · Session chiffrée
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} Nexora Capital — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
