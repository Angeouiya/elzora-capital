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
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fmtPct } from "@/lib/finance";
import { formatDisplayMoney } from "@/lib/display-money";
import { getCountryLabel, getSectorLabel } from "@/lib/countries";
import { LEGAL_VERSIONS } from "@/lib/legal";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Users,
  Coins,
  Wallet,
  Waypoints,
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
  const userEmail = useAppStore((s) => s.userEmail);
  const { toast } = useToast();
  const money = (value: bigint | number, compact = false) =>
    formatDisplayMoney(value, displayCurrency, locale, compact);
  const text = locale === "fr" ? {
    missing: "Offre introuvable.", back: "Retour aux offres", low: "Montant insuffisant", login: "Connexion requise", loginText: "Connectez-vous pour enregistrer votre engagement.", failed: "Souscription échouée", saved: "Souscription enregistrée", savedText: "Votre engagement est réservé. Les instructions de paiement seront affichées dans votre espace.", paymentReady: "Ouverture du paiement sécurisé…", error: "Erreur", unknown: "Erreur inconnue",
    equity: "Part de l’entreprise", debt: "Avec remboursement", conditions: "L’essentiel", overview: "Aperçu", details: "Le projet", subscribeNav: "Souscrire", invest: "Investir", goal: "Objectif", raised: "Déjà réuni", offered: "Part proposée", return: "Gain prévu", duration: "Durée", long: "Long terme", months: "mois", of: "sur", investors: "investisseurs", from: "Dès", cap: "Maximum", close: "Clôture prévue", project: "Présentation du projet", company: "Entreprise", verified: "Entreprise vérifiée", legalForm: "Forme juridique", country: "Pays", activity: "Activité", founded: "Fondée en", budget: "Utilisation des fonds", allocation: "Répartition prévue", source: "Origine des futurs paiements", exit: " / de la revente", risks: "Risques à connaître", simulator: "Choisir mon investissement", amount: "Montant à investir", minimum: "Minimum", maximum: "maximum", share: "Votre part de", expected: "Montant prévu à terme", interest: "Gain estimé inclus", projected: "Estimation non garantie, soumise aux risques du projet.", enter: "Saisissez un montant pour voir l’estimation", secure: "Une souscription personnelle et protégée", secureText: "Les informations déjà vérifiées dans votre compte seront utilisées pour préparer votre souscription.", consentTitle: "Avant de continuer", acceptAgreement: "Je confirme le montant et j’accepte le bulletin de souscription.", acceptRisk: "J’ai lu les risques et j’accepte la possibilité de perdre tout ou partie du capital investi.", readTerms: "Lire les conditions", readRisk: "Lire les risques", consentRequired: "Confirmez le bulletin et la lecture des risques avant de continuer.", submitting: "Validation en cours…", submit: "Continuer vers le paiement", payment: "Vous pourrez payer par carte ou Mobile Money. Une confirmation vous sera toujours demandée avant le débit.", riskText: "L’investissement présente un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.",
  } : {
    missing: "Offer not found.", back: "Back to opportunities", low: "Amount too low", login: "Sign-in required", loginText: "Sign in to save your commitment.", failed: "Subscription failed", saved: "Subscription saved", savedText: "Your commitment is reserved. Payment instructions will appear in your account.", paymentReady: "Opening secure payment…", error: "Error", unknown: "Unknown error",
    equity: "Company ownership", debt: "With repayment", conditions: "Key information", overview: "Overview", details: "The project", subscribeNav: "Subscribe", invest: "Invest", goal: "Target", raised: "Already raised", offered: "Ownership offered", return: "Expected return", duration: "Duration", long: "Long term", months: "months", of: "of", investors: "investors", from: "From", cap: "Maximum", close: "Expected closing", project: "Project overview", company: "Company", verified: "Verified company", legalForm: "Legal form", country: "Country", activity: "Activity", founded: "Founded", budget: "Use of funds", allocation: "Planned allocation", source: "Source of future payments", exit: " / resale", risks: "Risks to know", simulator: "Choose my investment", amount: "Amount to invest", minimum: "Minimum", maximum: "maximum", share: "Your share of", expected: "Expected amount at term", interest: "Estimated gain included", projected: "Estimate only, not guaranteed and subject to project risks.", enter: "Enter an amount to view the estimate", secure: "A personal, protected subscription", secureText: "Information already verified in your account will be used to prepare your subscription.", consentTitle: "Before continuing", acceptAgreement: "I confirm the amount and accept the subscription form.", acceptRisk: "I have read the risks and accept that I may lose some or all of the capital invested.", readTerms: "Read the terms", readRisk: "Read the risks", consentRequired: "Confirm the form and that you have read the risks before continuing.", submitting: "Approving…", submit: "Continue to payment", payment: "You can pay by card or Mobile Money. You will always be asked to confirm before any debit.", riskText: "Investing involves a risk of capital loss. Past performance does not predict future performance.",
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
  const [acceptAgreement, setAcceptAgreement] = useState(false);
  const [acceptRisks, setAcceptRisks] = useState(false);

  // Reset amount when offer changes
  useEffect(() => {
    if (minInv > 0) setAmount(minInv);
    setAcceptAgreement(false);
    setAcceptRisks(false);
  }, [minInv, offerId]);

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
    if (!acceptAgreement || !acceptRisks) {
      toast({ title: text.consentTitle, description: text.consentRequired });
      return;
    }
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
        body: JSON.stringify({
          amount,
          acceptTerms: true,
          acceptRisks: true,
          signatureIntent: true,
          agreementVersion: LEGAL_VERSIONS.subscription,
          locale,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        payment?: { checkoutUrl?: string; status?: string };
      };
      if (res.status === 401) {
        toast({
          title: text.login,
          description: text.loginText,
        });
        setView("login");
        return;
      }
      if (!res.ok) {
        throw new Error(text.failed);
      }
      if (json.payment?.status === "ready" && json.payment.checkoutUrl) {
        const checkout = new URL(json.payment.checkoutUrl);
        if (checkout.protocol !== "https:" || checkout.hostname !== "app.paydunya.com") {
          throw new Error(text.failed);
        }
        toast({ title: text.paymentReady });
        window.location.assign(checkout.toString());
        return;
      }
      toast({
        title: text.saved,
        description: text.savedText,
      });
      setView("investor_dashboard");
    } catch (e) {
      toast({
        title: text.error,
        description: e instanceof Error && e.message === text.failed ? e.message : text.failed,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const company = offer.project.company;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="reveal-in overflow-x-clip pb-36 lg:pb-10">
      <div className="page-shell py-3 sm:py-4">
        <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("explore")}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {text.back}
        </Button>
      </div>

      {/* Hero */}
      <div className="offer-hero-fullbleed relative h-72 overflow-hidden bg-[#250820] shadow-[0_24px_65px_rgba(56,12,49,.16)] sm:h-[25rem]">
        <Image
          src={offer.project.imageUrl}
          alt={offer.project.title}
          fill
          sizes="100vw"
          unoptimized
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(19,4,16,.76)_0%,rgba(37,8,32,.44)_56%,rgba(19,4,16,.18)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#130410]/92 via-[#250820]/35 to-transparent">
          <div className="offer-hero-content py-6 sm:py-9">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-background/95 text-foreground">
              {getSectorLabel(offer.project.sector, locale)}
            </Badge>
            {isEquity ? (
              <Badge className="border border-white/20 bg-white/92 text-[#541249]">
                {text.equity}
              </Badge>
            ) : (
              <Badge className="border border-white/20 bg-[#f4e7f1]/95 text-[#541249]">
                {text.debt}
              </Badge>
            )}
            <Badge className="border border-white/15 bg-[#130410]/48 text-white backdrop-blur">
              <MapPin className="mr-1 h-3 w-3" />
              {offer.project.city}, {getCountryLabel(offer.project.country, locale)}
            </Badge>
          </div>
          <h1 className="max-w-4xl text-2xl font-black leading-tight tracking-[-.035em] text-white sm:text-4xl">
            {offer.project.title}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {company.tradeName || company.legalName}
          </p>
          </div>
        </div>
      </div>

      <div className="page-shell offer-detail-body">

      <nav className="sticky top-[4.05rem] z-30 mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-[#541249]/10 bg-[#fffefd]/94 p-1.5 shadow-[0_10px_30px_rgba(56,12,49,.07)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-5 lg:static lg:w-fit" aria-label={locale === "fr" ? "Sections de l’opportunité" : "Opportunity sections"}>
        <Button type="button" variant="ghost" size="sm" onClick={() => scrollTo("offer-overview")} className="shrink-0 rounded-xl">{text.overview}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => scrollTo("offer-project")} className="shrink-0 rounded-xl">{text.details}</Button>
        <Button type="button" size="sm" onClick={() => scrollTo("subscription-simulator")} className="btn-nexora shrink-0 rounded-xl">{text.subscribeNav}</Button>
      </nav>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {/* Left col */}
        <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-2">
          {/* Conditions financières */}
          <Card id="offer-overview" className="scroll-mt-32 rounded-[1.35rem] border-[#541249]/10">
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
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
          <Card id="offer-project" className="scroll-mt-32 rounded-[1.35rem] border-[#541249]/10">
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
          <Card className="rounded-[1.35rem] border-[#541249]/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Waypoints className="h-5 w-5" />
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
          <Card className="rounded-[1.35rem] border-[#541249]/10">
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
        <div id="subscription-simulator" className="scroll-mt-32 lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Card className="rounded-[1.35rem] border border-[#541249]/25 bg-white/95 shadow-[0_22px_55px_rgba(56,12,49,.12)]">
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
                  <SegmentedControl
                    value={String(amount)}
                    onValueChange={(next) => setAmount(Number(next))}
                    ariaLabel={locale === "fr" ? "Montants rapides" : "Quick amounts"}
                    className="mt-2"
                    buttonClassName="px-2.5 text-xs"
                    options={quickAmounts.map((quickAmount) => ({
                      value: String(quickAmount),
                      label: <span className="tnum">{money(quickAmount, true)}</span>,
                    }))}
                  />
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

                <div className="space-y-2 rounded-xl border border-[#541249]/20 bg-[#FBF7FA] p-3.5">
                  <p className="text-xs font-bold text-foreground">{text.consentTitle}</p>
                  <label htmlFor="subscription-agreement" className="flex cursor-pointer items-start gap-2.5">
                    <Checkbox
                      id="subscription-agreement"
                      checked={acceptAgreement}
                      onCheckedChange={(value) => setAcceptAgreement(value === true)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] leading-relaxed text-foreground">
                      {text.acceptAgreement}
                    </span>
                  </label>
                  <label htmlFor="subscription-risk" className="flex cursor-pointer items-start gap-2.5">
                    <Checkbox
                      id="subscription-risk"
                      checked={acceptRisks}
                      onCheckedChange={(value) => setAcceptRisks(value === true)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] leading-relaxed text-foreground">
                      {text.acceptRisk}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-6 text-[10px] font-semibold">
                    <a href="/legal/terms" target="_blank" rel="noreferrer" className="text-[#541249] underline-offset-2 hover:underline">
                      {text.readTerms}
                    </a>
                    <a href="/legal/compliance" target="_blank" rel="noreferrer" className="text-[#541249] underline-offset-2 hover:underline">
                      {text.readRisk}
                    </a>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={submitting || !acceptAgreement || !acceptRisks}
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

      <div className={`fixed inset-x-3 z-30 lg:hidden ${userEmail ? "bottom-[calc(4.65rem+env(safe-area-inset-bottom))]" : "bottom-[calc(.75rem+env(safe-area-inset-bottom))]"}`}>
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#1b0617]/96 p-2 pl-4 text-white shadow-[0_18px_45px_rgba(19,4,16,.32)] backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/55">{text.from}</p>
            <p className="tnum truncate text-sm font-extrabold">{money(minInv, true)}</p>
          </div>
          <Button type="button" onClick={() => scrollTo("subscription-simulator")} className="btn-nexora min-h-11 shrink-0 rounded-xl px-5">{text.invest}</Button>
        </div>
      </div>
    </div>
  );
}
