"use client";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  formatFCFA,
  formatCompact,
  formatPct,
  progressPct,
  RISK_LABELS,
} from "@/lib/format";
import type { ProjectDetail } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  Users,
  Clock,
  Briefcase,
  Handshake,
  CheckCircle2,
  Calculator,
  Share2,
  Loader2,
} from "lucide-react";
import { useState } from "react";

export function ProjectDetail() {
  const { selectedProjectId, setView } = useAppStore();
  const { data, loading } = useFetch<{ project: ProjectDetail }>(
    selectedProjectId ? `/api/projects/${selectedProjectId}` : null
  );
  const { toast } = useToast();

  const [investAmount, setInvestAmount] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorEmail, setInvestorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-72 w-full" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data?.project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Projet introuvable.</p>
        <Button onClick={() => setView("projects")} className="mt-4">
          Retour aux opportunités
        </Button>
      </div>
    );
  }

  const p = data.project;
  const pct = progressPct(p.raisedAmount, p.fundingGoal);
  const remaining = p.fundingGoal - p.raisedAmount;
  const risk = RISK_LABELS[p.riskLevel] || RISK_LABELS["Modéré"];

  // Simulation d'investissement
  const amount = parseInt(investAmount || "0", 10) || 0;
  const validAmount = Math.min(amount, remaining);
  const sharePct = p.fundingGoal > 0 ? (validAmount / p.fundingGoal) * 100 : 0;
  const projectedAnnual =
    validAmount * (p.expectedRoi / 100);
  const projectedTotal =
    validAmount + projectedAnnual * (p.duration / 12);

  const handleInvest = async () => {
    if (amount < p.minInvestment) {
      toast({
        title: "Montant insuffisant",
        description: `Le ticket minimum est de ${formatFCFA(p.minInvestment)}.`,
        variant: "destructive",
      });
      return;
    }
    if (!investorName || !investorEmail) {
      toast({
        title: "Informations manquantes",
        description: "Indiquez votre nom et votre email.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${p.id}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          investorName,
          investorEmail,
        }),
      });
      const result = (await res.json()) as { error?: string; sharePct: number };
      if (!res.ok) throw new Error(result.error || "Erreur");
      toast({
        title: "Investissement confirmé ! 🎉",
        description: `Vous détenez ${result.sharePct.toFixed(3)} % du capital. Rendez-vous dans « Mon portefeuille ».`,
      });
      setInvestAmount("");
      setView("dashboard");
    } catch (e: any) {
      toast({
        title: "Échec de l'investissement",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" onClick={() => setView("projects")} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux opportunités
      </Button>

      {/* Header image */}
      <div className="relative mb-6 h-64 overflow-hidden rounded-2xl sm:h-80">
        <img
          src={p.imageUrl}
          alt={p.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge className="bg-background/90 text-foreground">{p.sector}</Badge>
            <Badge
              variant="outline"
              className="border-white/40 bg-black/30 text-white backdrop-blur"
            >
              <MapPin className="mr-1 h-3 w-3" />
              {p.city}, {p.country}
            </Badge>
            <Badge
              variant="outline"
              className="border-white/40 bg-black/30 text-white backdrop-blur"
            >
              Risque {risk.label}
            </Badge>
          </div>
          <h1 className="max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl">
            {p.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/80">{p.tagline}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: description + details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Funding progress */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                État du financement
              </h2>
              <span className="text-2xl font-bold text-primary">
                {formatPct(pct)}
              </span>
            </div>
            <Progress value={pct} className="mb-3 h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Levé</p>
                <p className="font-bold text-foreground">
                  {formatCompact(p.raisedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Objectif</p>
                <p className="font-bold text-foreground">
                  {formatCompact(p.fundingGoal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reste à lever</p>
                <p className="font-bold text-foreground">
                  {formatCompact(remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Investisseurs</p>
                <p className="font-bold text-foreground">{p.backersCount}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Présentation du projet
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.longDescription}
            </p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                icon: TrendingUp,
                label: "TRI cible",
                value: formatPct(p.expectedRoi),
                color: "text-emerald-600",
              },
              {
                icon: Briefcase,
                label: "Capital offert",
                value: formatPct(p.equityOffered),
                color: "text-foreground",
              },
              {
                icon: Clock,
                label: "Durée",
                value: `${p.duration} mois`,
                color: "text-foreground",
              },
              {
                icon: Users,
                label: "Emplois créés",
                value: String(p.jobsCreated),
                color: "text-foreground",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="rounded-xl border border-border/60 bg-card p-4"
                >
                  <Icon className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                </div>
              );
            })}
          </div>

          {/* Promoter */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Handshake className="h-5 w-5 text-primary" />
              Le porteur de projet
            </h2>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary">
                {p.promoterName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{p.promoterName}</p>
                <p className="text-xs text-muted-foreground">{p.promoterRole}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.promoterBio}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: investment simulator (sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-xl border-2 border-primary/20 bg-card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
                <Calculator className="h-5 w-5 text-primary" />
                Simulateur d'investissement
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Ticket min. {formatFCFA(p.minInvestment)} · reste {formatCompact(remaining)}
              </p>

              <Label htmlFor="amount" className="text-xs">
                Montant à investir (FCFA)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex : 500000"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                className="mt-1"
              />

              {/* Quick amounts */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  p.minInvestment,
                  1_000_000,
                  5_000_000,
                  10_000_000,
                ].map((amt) => (
                  <button
                    data-control="chip"
                    key={amt}
                    onClick={() => setInvestAmount(String(amt))}
                    className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {formatCompact(amt)}
                  </button>
                ))}
              </div>

              {/* Simulation results */}
              {validAmount > 0 && (
                <div className="mt-4 space-y-2 rounded-lg bg-secondary/60 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Part du capital</span>
                    <span className="font-semibold text-foreground">
                      {sharePct.toFixed(4)} %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Gains annuels estimés
                    </span>
                    <span className="font-semibold text-emerald-600">
                      +{formatCompact(projectedAnnual)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">
                      Valeur à {p.duration} mois
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCompact(projectedTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Investor info */}
              <div className="mt-4 space-y-2">
                <div>
                  <Label htmlFor="name" className="text-xs">
                    Nom complet
                  </Label>
                  <Input
                    id="name"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    placeholder="Votre nom"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={investorEmail}
                    onChange={(e) => setInvestorEmail(e.target.value)}
                    placeholder="vous@email.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleInvest}
                disabled={submitting}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement…
                  </>
                ) : (
                  <>Investir {validAmount > 0 ? formatCompact(validAmount) : ""}</>
                )}
              </Button>

              <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>
                  Votre investissement est réservé, puis confirmé après validation du
                  paiement sécurisé.
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" disabled>
              <Share2 className="mr-2 h-4 w-4" />
              Partager l'opportunité
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
