"use client";
import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminLoginResponse {
  admin?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  notice?: string;
  error?: string;
}

// Affichage lisible du rôle admin
const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super-administrateur",
  compliance: "Officier conformité",
  analyst: "Analyste",
  legal: "Juriste",
  technical: "Technique",
  finance: "Finance",
  validator: "Validateur (comité)",
  support: "Support",
  auditor: "Auditeur",
  sales: "Commercial",
};

export function AdminLogin() {
  const loginAdmin = useAppStore((s) => s.loginAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<{
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data: AdminLoginResponse = await res.json();
      if (!res.ok || !data.admin) {
        toast({
          title: "Accès refusé",
          description: data.error || "Identifiants invalides.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      // On affiche d'abord le rôle obtenu, puis on notifie le store.
      setLoggedInAs({
        email: data.admin.email,
        role: data.admin.role,
        firstName: data.admin.firstName,
        lastName: data.admin.lastName,
      });
      toast({
        title: "Accès administrateur accordé",
        description: `Rôle : ${ROLE_LABELS[data.admin.role] || data.admin.role}. ${
          data.notice || "Session admin ouverte."
        }`,
      });
      loginAdmin(
        data.admin.email,
        data.admin.role,
        data.admin.firstName,
        data.admin.lastName
      );
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Impossible de contacter le serveur d'administration.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-nexora-black px-4 py-10 text-white">
      {/* Subtle radial accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #541249 0%, transparent 40%), radial-gradient(circle at 80% 80%, #250820 0%, transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <Card className="border-border/10 bg-white text-foreground shadow-2xl">
          <CardHeader className="space-y-3 pb-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-nexora-black">
              <Lock className="h-6 w-6 text-nexora-lime" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              NEXORA Capital — Administration
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Accès réservé · Sur invitation uniquement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-email" className="text-xs">
                  Email administrateur
                </Label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-password" className="text-xs">
                  Mot de passe
                </Label>
                <div className="relative mt-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="btn-nexora w-full"
              >
                {submitting ? (
                  "Authentification…"
                ) : (
                  <>
                    Accéder au portail
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Affichage du rôle après login réussi */}
            {loggedInAs && (
              <div className="mt-4 rounded-md border border-nexora-lime/40 bg-nexora-pale p-3">
                <p className="text-[10px] uppercase tracking-wide text-positive">
                  Session ouverte
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {loggedInAs.firstName} {loggedInAs.lastName}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {loggedInAs.email}
                </p>
                <div className="mt-2">
                  <Badge className="border-0 bg-nexora-lime text-[11px] text-nexora-black">
                    {ROLE_LABELS[loggedInAs.role] || loggedInAs.role}
                  </Badge>
                </div>
              </div>
            )}

            {/* Aucune inscription publique */}
            <div className="mt-4 flex items-start gap-2 rounded-md bg-nexora-pale p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
              <p className="text-[11px] leading-relaxed text-positive">
                Aucune inscription publique. L&rsquo;accès administrateur n&rsquo;est
                délivré que par invitation signée par la direction. Toute tentative
                d&rsquo;authentification est journalisée.
              </p>
            </div>

            {/* Security notice */}
            <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Cet accès est réservé au personnel autorisé. Chaque action est
                journalisée. Les accès d&rsquo;urgence sont temporaires et audités.
              </p>
            </div>

            {/* Retour au portail public */}
            <Link
              href="/"
              className="mx-auto mt-6 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au portail
            </Link>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-white/40">
          Portail administrateur — application distincte du portail public.
        </p>
      </div>
    </div>
  );
}
