"use client";

import { FormEvent, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { NexoraLogoDark } from "@/components/NexoraLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Identifiants incorrects. Accès réservé aux membres autorisés.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const session = await sessionResponse.json();
      const role = session?.user?.role as string | undefined;

      if (role !== "ADMIN") {
        await signOut({ redirect: false });
        setError("Ce compte n'est pas autorisé à accéder à ce portail.");
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      await signOut({ redirect: false }).catch(() => undefined);
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101010] p-4 sm:p-6">
      <div className="absolute left-0 top-0 h-1 w-32 bg-[#B6FF00]" aria-hidden="true" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center sm:mb-10">
          <NexoraLogoDark size={54} />
          <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-white">Nexora Capital</h1>
          <Badge variant="default" className="mt-3 border-white/10 bg-white/8 text-white/60">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Espace équipe
          </Badge>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white p-5 shadow-[0_26px_70px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#101010]/36">Accès interne</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#101010]">Connexion sécurisée</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#101010]/54">
              Portail réservé aux membres explicitement autorisés de l&apos;équipe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Adresse email"
              type="email"
              placeholder="prenom.nom@nexora.capital"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-[14px] border border-[#C62828]/12 bg-[#C62828]/7 p-3.5 text-[#C62828]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm leading-relaxed">{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              Se connecter
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-[#101010]/40">
            Accès contrôlé · Actions sensibles journalisées
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/28">
          © {new Date().getFullYear()} Nexora Capital
        </p>
      </div>
    </div>
  );
}
