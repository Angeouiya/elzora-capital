"use client";
import Image from "next/image";
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
import { fmtPct } from "@/lib/finance";
import { formatDisplayMoney } from "@/lib/display-money";
import { getCountryLabel, getSectorLabel } from "@/lib/countries";
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
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const { toast } = useToast();
  const money = (value: bigint | number, compact = false) =>
    formatDisplayMoney(value, displayCurrency, locale, compact);
  const text = locale === "fr" ? {
    missing: "Offre introuvable.", back: "Retour aux offres", low: "Montant insuffisant", login: "Connexion requise", loginText: "Connectez-vous pour enregistrer votre engagement.", failed: "Souscription échouée", saved: "Souscription enregistrée", savedText: "Votre engagement est réservé. Les instructions de paiement seront affichées dans votre espace.", error: "Erreur", unknown: "Erreur inconnue",
    equity: "Prise de participation", debt: "Dette", bullet: "in fine", amortized: "amortissable", conditions: "Conditions financières", goal: "Objectif", raised: "Levé", offered: "Capital offert", return: "Rémunération", duration: "Durée", long: "Long terme", months: "mois", of: "sur", investors: "souscripteurs", from: "Dès", cap: "Plafond", close: "Clôture prévue", project: "Présentation du projet", company: "Entreprise", verified: "Entreprise vérifiée", legalForm: "Forme juridique", country: "Pays", activity: "Activité", founded: "Fondée en", budget: "Budget & remboursement", allocation: "Affectation du budget", source: "Source de remboursement", exit: " / sortie", risks: "Risques identifiés", simulator: "Simulateur d’investissement", amount: "Montant de règlement (XOF)", minimum: "Minimum", maximum: "maximum", share: "Part de", expected: "Remboursement attendu", interest: "Dont intérêts", projected: "Projeté, non garanti. Soumis aux risques du projet.", enter: "Saisissez un montant pour simuler", secure: "Souscription nominative et sécurisée", secureText: "Votre identité vérifiée et votre adresse de contact sont reprises automatiquement depuis votre espace personnel.", submitting: "Enregistrement…", submit: "Enregistrer mon engagement", payment: "Le paiement par carte ou Mobile Money sera proposé uniquement via un prestataire autorisé, avec confirmation avant débit.", riskText: "L’investissement présente un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.",
  } : {
    missing: "Offer not found.", back: "Back to opportunities", low: "Amount too low", login: "Sign-in required", loginText: "Sign in to save your commitment.", failed: "Subscription failed", saved: "Subscription saved", savedText: "Your commitment is reserved. Payment instructions will appear in your account.", error: "Error", unknown: "Unknown error",
    equity: "Equity investment", debt: "Debt", bullet: "bullet", amortized: "amortizing", conditions: "Financial terms", goal: "Target", raised: "Raised", offered: "Equity offered", return: "Return", duration: "Duration", long: "Long term", months: "months", of: "of", investors: "investors", from: "From", cap: "Maximum", close: "Expected closing", project: "Project overview", company: "Company", verified: "Verified company", legalForm: "Legal form", country: "Country", activity: "Activity", founded: "Founded", budget: "Budget & repayment", allocation: "Use of funds", source: "Repayment source", exit: " / exit", risks: "Identified risks", simulator: "Investment simulator", amount: "Settlement amount (XOF)", minimum: "Minimum", maximum: "maximum", share: "Share of", expected: "Expected repayment", interest: "Including interest", projected: "Projected, not guaranteed. Subject to project risks.", enter: "Enter an amount to simulate", secure: "Named and secure subscription", secureText: "Your verified identity and contact address are automatically retrieved from your personal account.", submitting: "Saving…", submit: "Save my commitment", payment: "Card or Mobile Money payment will only be offered through an authorized provider, with confirmation before debit.", riskText: "Investing involves a risk of capital loss. Past performance does not predict future performance.",
  };

  const { data, loading } = useFetch<{ offer: OfferDTO }>(
    offerId ? `/api/offers/${offerId}` : null
  );
  const offer = data?.offer;

  const isEquity = offer?.project.instrumentType === "equity";

  // Simulator state
  const minInv = offer?.minInvestment ?? 0;
  const maxInv = offer?.maxInvestment ?? null;
  const [amount, setAmount] = useState<number>(minInv);
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
        <p className="text-sm text-muted-foreground">{text.missing}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("explore")}
          className="mt-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {text.back}
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
        title: text.low,
        description: `${text.minimum} : ${money(minInv)}`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = (await res.json()) as { error?: string };
      if (res.status === 401) {
        toast({
          title: text.login,
          description: text.loginText,
        });
        setView("login");
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || text.failed);
      }
      toast({
        title: text.saved,
        description: text.savedText,
      });
      setView("investor_dashboard");
    } catch (e) {
      toast({
        title: text.error,
        description: e instanceof Error ? e.message : text.unknown,
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
        {text.back}
      </Button>

      {/* Hero */}
      <div className="relative mb-6 h-56 overflow-hidden rounded-xl sm:h-72">
        <Image
          src={offer.project.imageUrl}
          alt={offer.project.title}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          unoptimized
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-background/95 text-foreground">
              {getSectorLabel(offer.project.sector, locale)}
            </Badge>
            {isEquity ? (
              <Badge className="bg-nexora-lime text-nexora-black">
                {text.equity}
              </Badge>
            ) : (
              <Badge className="bg-nexora-pale text-positive">
                {text.debt} {offer.repaymentType === "bullet" ? text.bullet : text.amortized}
              </Badge>
            )}
            <Badge className="bg-background/80 text-white backdrop-blur">
              <MapPin className="mr-1 h-3 w-3" />
              {offer.project.city}, {getCountryLabel(offer.project.country, locale)}
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
                {text.conditions}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{text.goal}</p>
                  <p className="tnum text-base font-bold text-foreground">
                    {money(offer.fundingGoal, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{text.raised}</p>
                  <p className="tnum text-base font-bold text-positive">
                    {money(offer.raisedAmount, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isEquity ? text.offered : text.return}
                  </p>
                  <p className="tnum text-base font-bold text-foreground">
                    {isEquity
                      ? `${offer.equityOfferedPct?.toFixed(2).replace(".", ",") ?? "—"} %`
                      : `${offer.annualRate?.toFixed(offer.annualRate % 1 === 0 ? 0 : 2).replace(".", ",") ?? "—"} %`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{text.duration}</p>
                  <p className="tnum text-base font-bold text-foreground">
                    {isEquity
                      ? text.long
                      : `${offer.durationMonths ?? "—"} ${text.months}`}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="tnum font-semibold text-foreground">
                    {money(offer.raisedAmount, true)}
                  </span>
                  <span className="text-muted-foreground">
                    {text.of} {money(offer.fundingGoal, true)} · {fmtPct(pct, 0)}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tnum">{offer.backersCount}</span>{" "}
                    {text.investors}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {text.from}{" "}
                    <span className="tnum font-medium text-foreground">
                      {money(offer.minInvestment, true)}
                    </span>
                  </span>
                  {maxInv && (
                    <span className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {text.cap}{" "}
                      <span className="tnum font-medium text-foreground">
                        {money(maxInv, true)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {text.close} :{" "}
                <span className="font-medium text-foreground">
                  {new Date(offer.closingDate).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
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
                    {locale === "fr" ? "Prise de participation au capital" : "Equity investment"}
                  </p>
                  <p className="mt-1 text-xs text-positive">
                    {locale === "fr"
                      ? "Il s’agit d’une prise de participation au capital. Aucun échéancier de remboursement n’est applicable. La sortie envisagée n’est pas garantie."
                      : "This is an equity investment. No repayment schedule applies and the contemplated exit is not guaranteed."}
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
                {text.project}
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
                {text.company}
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
                    {text.verified}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">{text.legalForm}</p>
                  <p className="font-medium text-foreground">
                    {company.legalForm}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{text.country}</p>
                  <p className="font-medium text-foreground">
                    {getCountryLabel(company.country, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{text.activity}</p>
                  <p className="font-medium text-foreground">
                    {company.activity}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{text.founded}</p>
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
                {text.budget}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {offer.project.budgetDetail && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.allocation}
                  </p>
                  <p className="text-sm text-foreground/90">
                    {offer.project.budgetDetail}
                  </p>
                </div>
              )}
              {offer.project.repaymentSource && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.source}
                    {isEquity ? text.exit : ""}
                  </p>
                  <p className="text-sm text-foreground/90">
                    {offer.project.repaymentSource}
                  </p>
                </div>
              )}
              {offer.project.risksIdentified && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.risks}
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
                  {text.simulator}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount input */}
                <div>
                  <Label htmlFor="amount" className="text-xs">
                    {text.amount}
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
                        <span className="tnum">{money(q, true)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {text.minimum} {money(minInv, true)}
                    {maxInv ? ` · ${text.maximum} ${money(maxInv, true)}` : ""}
                  </p>
                </div>

                {/* Results */}
                <div className="rounded-md bg-secondary/60 p-3">
                  {simData ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {text.share} {isEquity ? (locale === "fr" ? "capital" : "equity") : (locale === "fr" ? "l’offre" : "the offer")}
                        </span>
                        <span className="tnum font-bold text-foreground">
                          {fmtPct(simData.sharePct ?? 0, 3)}
                        </span>
                      </div>
                      {!isEquity && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {text.expected}
                            </span>
                            <span className="tnum font-bold text-foreground">
                              {money(simData.expectedRepayment ?? simData.perInvestorRepayment ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {text.interest}
                            </span>
                            <span className="tnum font-medium text-foreground">
                              {money(
                                simData.investorInterest ??
                                  (simData.expectedRepayment ?? simData.perInvestorRepayment ?? 0) - amount
                              )}
                            </span>
                          </div>
                          <p className="pt-1 text-[10px] text-muted-foreground">
                            {text.projected}
                          </p>
                        </>
                      )}
                      {isEquity && (
                        <p className="pt-1 text-[11px] text-muted-foreground">
                          {locale === "fr"
                            ? "Pas d’échéancier — sortie envisagée à terme, non garantie."
                            : "No repayment schedule — a future exit is contemplated but not guaranteed."}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      {text.enter}
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-border/70 bg-background p-3">
                  <p className="text-xs font-semibold text-foreground">
                    {text.secure}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {text.secureText}
                  </p>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={submitting}
                  className="btn-nexora w-full"
                >
                  {submitting ? text.submitting : text.submit}
                </Button>

                <div className="flex items-start gap-2 rounded-md bg-nexora-pale p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                  <p className="text-[11px] leading-relaxed text-positive">
                    {text.payment}
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
                      {text.riskText}
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
