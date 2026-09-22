"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtFCFA, fmtCompact, fmtPct } from "@/lib/finance";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Users,
  Coins,
  Wallet,
  Building2,
  ShieldCheck,
  TriangleAlert,
  FileText,
} from "lucide-react";
import type { OfferDTO, SimulationResult } from "@/lib/types";

function progressPct(raised: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((raised / goal) * 1000) / 10));
}

export function OfferDetail() {
  const offerId = useAppStore((s) => s.selectedOfferId);
  const setView = useAppStore((s) => s.setView);
  const { toast } = useToast();

  const { data, loading } = useFetch<{ offer: OfferDTO }>(
    offerId ? `/api/offers/${offerId}` : null
  );
  const offer = data?.offer;

  const isEquity = offer?.project.instrumentType === "equity";

  // Simulator state
  const minInv = offer?.minInvestment ?? 0;
  const maxInv = offer?.maxInvestment ?? null;
  const [amount, setAmount] = useState<number>(minInv);
  const [investorName, setInvestorName] = useState("");
  const [investorEmail, setInvestorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset amount when offer changes
  useEffect(() => {
    if (minInv > 0) setAmount(minInv);
  }, [minInv]);

  // Simulation fetch
  const simUrl =
    offerId && amount > 0
      ? `/api/offers/${offerId}/subscribe?amount=${amount}`
      : null;
  const { data: simData } = useFetch<SimulationResult>(simUrl);

  if (loading) {
    return (
      <div className="page-shell">
        <Skeleton className="mb-6 h-10 w-32" />
        <Skeleton className="mb-6 h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-muted-foreground">Offre introuvable.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("explore")}
          className="mt-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux offres
        </Button>
      </div>
    );
  }

  const pct = progressPct(offer.raisedAmount, offer.fundingGoal);
  const quickAmounts = [minInv, minInv * 2, minInv * 5, maxInv ?? minInv * 10];

  const handleSubscribe = async () => {
    if (!offerId) return;
    if (amount < minInv) {
      toast({
        title: "Montant insuffisant",
        description: `Minimum : ${fmtFCFA(minInv)}`,
        variant: "destructive",
      });
      return;
    }
    if (!investorName.trim() || !investorEmail.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Indiquez votre nom et votre email.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          investorName: investorName.trim(),
          investorEmail: investorEmail.trim(),
          investorType: "individual",
          investorId: "guest",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Souscription échouée");
      }
      toast({
        title: "Souscription enregistrée",
        description:
          "Votre engagement est réservé. Les instructions de paiement seront affichées dans votre espace.",
      });
      setView("investor_dashboard");
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const company = offer.project.company;

  return (
    <div className="page-shell reveal-in">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("explore")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux offres
      </Button>

      {/* Hero */}
      <div className="relative mb-6 h-56 overflow-hidden rounded-xl sm:h-72">
        <img
          src={offer.project.imageUrl}
          alt={offer.project.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-background/95 text-foreground">
              {offer.project.sector}
            </Badge>
            {isEquity ? (
              <Badge className="bg-nexora-lime text-nexora-black">
                Prise de participation
              </Badge>
            ) : (
              <Badge className="bg-nexora-pale text-positive">
                Dette {offer.repaymentType === "bullet" ? "bullet" : "amortie"}
              </Badge>
            )}
            <Badge className="bg-background/80 text-white backdrop-blur">
              <MapPin className="mr-1 h-3 w-3" />
              {offer.project.city}, {offer.project.country}
            </Badge>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-3xl">
            {offer.project.title}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {company.tradeName || company.legalName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left col */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Conditions financières */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-5 w-5" />
                Conditions financières
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Objectif</p>
                  <p className="tnum text-base font-bold text-foreground">
                    {fmtCompact(offer.fundingGoal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Levé</p>
                  <p className="tnum text-base font-bold text-positive">
                    {fmtCompact(offer.raisedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isEquity ? "Capital offert" : "Rémunération"}
                  </p>
                  <p className="tnum text-base font-bold text-foreground">
                    {isEquity
                      ? `${offer.equityOfferedPct?.toFixed(2).replace(".", ",") ?? "—"} %`
                      : `${offer.annualRate?.toFixed(offer.annualRate % 1 === 0 ? 0 : 2).replace(".", ",") ?? "—"} %`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durée</p>
                  <p className="tnum text-base font-bold text-foreground">
                    {isEquity
                      ? "Long terme"
                      : `${offer.durationMonths ?? "—"} mois`}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="tnum font-semibold text-foreground">
                    {fmtCompact(offer.raisedAmount)}
                  </span>
                  <span className="text-muted-foreground">
                    sur {fmtCompact(offer.fundingGoal)} · {fmtPct(pct, 0)}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tnum">{offer.backersCount}</span>{" "}
                    souscripteurs
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    Dès{" "}
                    <span className="tnum font-medium text-foreground">
                      {fmtCompact(offer.minInvestment)}
                    </span>
                  </span>
                  {maxInv && (
                    <span className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      Plafond{" "}
                      <span className="tnum font-medium text-foreground">
                        {fmtCompact(maxInv)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Clôture prévue :{" "}
                <span className="font-medium text-foreground">
                  {new Date(offer.closingDate).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Equity notice */}
          {isEquity && (
            <div className="rounded-lg border border-[#541249]/30 bg-[#F7EAF5] p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
                <div>
                  <p className="text-sm font-bold text-positive">
                    Prise de participation au capital
                  </p>
                  <p className="mt-1 text-xs text-positive">
                    Il s&rsquo;agit d&rsquo;une prise de participation au
                    capital. Aucun échéancier de remboursement n&rsquo;est
                    applicable. La sortie envisagée n&rsquo;est pas garantie.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Présentation du projet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Présentation du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90">
                {offer.project.longDescription || offer.project.description}
              </p>
            </CardContent>
          </Card>

          {/* Entreprise */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5" />
                Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-foreground">
                    {company.tradeName || company.legalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {company.legalName}
                  </p>
                </div>
                {company.verificationStatus === "verified" && (
                  <Badge className="bg-nexora-pale text-positive">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Entreprise vérifiée
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Forme juridique</p>
                  <p className="font-medium text-foreground">
                    {company.legalForm}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pays</p>
                  <p className="font-medium text-foreground">
                    {company.country}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Activité</p>
                  <p className="font-medium text-foreground">
                    {company.activity}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fondée en</p>
                  <p className="tnum font-medium text-foreground">
                    {company.foundedYear ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget & remboursement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-5 w-5" />
                Budget &amp; remboursement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offer.project.budgetDetail && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Affectation du budget
                  </p>
                  <p className="text-sm text-foreground/90">
                    {offer.project.budgetDetail}
                  </p>
                </div>
              )}
              {offer.project.repaymentSource && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source de remboursement
                    {isEquity ? " / sortie" : ""}
                  </p>
                  <p className="text-sm text-foreground/90">
                    {offer.project.repaymentSource}
                  </p>
                </div>
              )}
              {offer.project.risksIdentified && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risques identifiés
                  </p>
                  <p className="text-sm text-foreground/90">
                    {offer.project.risksIdentified}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right col — Simulateur */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Card className="border-2 border-[#541249]">
              <CardHeader>
                <CardTitle className="text-base">
                  Simulateur d&rsquo;investissement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount input */}
                <div>
                  <Label htmlFor="amount" className="text-xs">
                    Montant (FCFA)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    value={amount || ""}
                    min={minInv}
                    max={maxInv ?? undefined}
                    onChange={(e) =>
                      setAmount(Number(e.target.value) || 0)
                    }
                    className="tnum mt-1"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickAmounts.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setAmount(q)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                      >
                        <span className="tnum">{fmtCompact(q)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Minimum {fmtCompact(minInv)}
                    {maxInv ? ` · maximum ${fmtCompact(maxInv)}` : ""}
                  </p>
                </div>

                {/* Results */}
                <div className="rounded-md bg-secondary/60 p-3">
                  {simData ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Part de {isEquity ? "capital" : "l&rsquo;offre"}
                        </span>
                        <span className="tnum font-bold text-foreground">
                          {fmtPct(simData.sharePct ?? 0, 3)}
                        </span>
                      </div>
                      {!isEquity && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Remboursement attendu
                            </span>
                            <span className="tnum font-bold text-foreground">
                              {fmtFCFA(simData.expectedRepayment ?? simData.perInvestorRepayment ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Dont intérêts
                            </span>
                            <span className="tnum font-medium text-foreground">
                              {fmtFCFA(
                                simData.investorInterest ??
                                  (simData.expectedRepayment ?? simData.perInvestorRepayment ?? 0) - amount
                              )}
                            </span>
                          </div>
                          <p className="pt-1 text-[10px] text-muted-foreground">
                            Projeté, non garanti. Soumis aux risques du projet.
                          </p>
                        </>
                      )}
                      {isEquity && (
                        <p className="pt-1 text-[11px] text-muted-foreground">
                          Pas d&rsquo;échéancier — sortie envisagée à terme,
                          non garantie.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Saisissez un montant pour simuler
                    </p>
                  )}
                </div>

                {/* Investor info */}
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="name" className="text-xs">
                      Nom complet
                    </Label>
                    <Input
                      id="name"
                      value={investorName}
                      onChange={(e) => setInvestorName(e.target.value)}
                      placeholder="Aïssatou Diallo"
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
                      placeholder="vous@exemple.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={submitting}
                  className="btn-nexora w-full"
                >
                  {submitting ? "Traitement…" : "Souscrire"}
                </Button>

                <div className="flex items-start gap-2 rounded-md bg-nexora-pale p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                  <p className="text-[11px] leading-relaxed text-positive">
                    Le paiement par carte ou Mobile Money sera proposé uniquement
                    via un prestataire autorisé, avec confirmation avant débit.
                  </p>
                </div>

                {/* Risk notice */}
                <div
                  className="border-l-4 p-3"
                  style={{
                    borderColor: "#C62828",
                    backgroundColor: "#FFF5F5",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-nexora-danger" />
                    <p className="text-[11px] leading-relaxed text-nexora-danger">
                      L&rsquo;investissement présente un risque de perte en
                      capital. Les performances passées ne préjugent pas des
                      performances futures.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
