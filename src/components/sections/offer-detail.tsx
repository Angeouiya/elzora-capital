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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  FileSpreadsheet,
  FileType2,
  Eye,
  Download,
  CreditCard,
  Smartphone,
  Landmark,
  LoaderCircle,
  CircleCheck,
  Circle,
} from "lucide-react";
import type { OfferDTO, SimulationResult } from "@/lib/types";

type InvestmentReadiness = "checking" | "guest" | "kyc" | "profile" | "ready" | "unavailable";

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
  const en = locale === "en";
  const money = (value: bigint | number, compact = false) =>
    formatDisplayMoney(value, displayCurrency, locale, compact);
  const text = locale === "fr" ? {
    missing: "Offre introuvable.", back: "Retour aux offres", low: "Montant insuffisant", login: "Connexion requise", loginText: "Connectez-vous pour enregistrer votre engagement.", failed: "Souscription échouée", saved: "Souscription enregistrée", savedText: "Votre engagement est réservé. Les instructions de paiement seront affichées dans votre espace.", paymentReady: "Ouverture du paiement sécurisé…", error: "Erreur", unknown: "Erreur inconnue",
    equity: "Part de l’entreprise", debt: "Avec remboursement", conditions: "L’essentiel", overview: "Aperçu", details: "Le projet", subscribeNav: "Souscrire", invest: "Payer mon investissement", investmentCta: "Investir maintenant", demo: "Démonstration", simulate: "Simuler uniquement", runSimulation: "Simuler ce montant", simulationLoading: "Calcul en cours…", simulationError: "L’estimation est momentanément indisponible.", demoText: "Cette opportunité est un exemple de présentation. Vous pouvez préparer votre parcours investisseur, mais aucun montant ne sera débité tant qu’une offre réelle, vérifiée et ouverte n’aura pas été publiée.", goal: "Objectif", raised: "Déjà réuni", offered: "Part proposée", return: "Gain prévu", duration: "Durée", long: "Long terme", months: "mois", of: "sur", investors: "investisseurs", from: "Dès", cap: "Maximum", close: "Clôture prévue", project: "Présentation du projet", gallery: "Le projet en images", documents: "Documents à consulter", documentsHelp: "Ces documents sont librement consultables et téléchargeables, sans créer de compte.", view: "Consulter", download: "Télécharger", company: "Entreprise", verified: "Entreprise vérifiée", legalForm: "Forme juridique", country: "Pays", activity: "Activité", founded: "Fondée en", budget: "Utilisation des fonds", allocation: "Répartition prévue", source: "Origine des futurs paiements", exit: " / de la revente", risks: "Risques à connaître", simulator: "Choisir mon investissement", amount: "Montant à investir", minimum: "Minimum", maximum: "maximum", share: "Votre part de", expected: "Montant prévu à terme", interest: "Gain estimé inclus", projected: "Estimation non garantie, soumise aux risques du projet.", enter: "Saisissez un montant pour voir l’estimation", paymentChoice: "Mode de paiement souhaité", card: "Carte bancaire", mobileMoney: "Mobile Money", bankTransfer: "Virement", walletBalance: "Mon portefeuille", limitIntro: "Limite interne pour ce moyen", limitExceeded: "Ce montant dépasse la limite par opération. Réduisez le montant ou choisissez un autre moyen.", secure: "Une souscription personnelle et protégée", secureText: "Les informations déjà vérifiées dans votre compte seront utilisées pour préparer votre souscription.", consentTitle: "Avant de continuer", acceptAgreement: "Je confirme le montant et j’accepte le bulletin de souscription.", acceptRisk: "J’ai lu les risques et j’accepte la possibilité de perdre tout ou partie du capital investi.", readTerms: "Lire les conditions", readRisk: "Lire les risques", consentRequired: "Confirmez le bulletin et la lecture des risques avant de continuer.", submitting: "Validation en cours…", submit: "Payer cet investissement", payment: "Les paiements sont soumis aux contrôles d’identité, d’origine des fonds et de suivi des opérations. Une confirmation est toujours demandée avant le débit.", riskText: "L’investissement présente un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.",
  } : {
    missing: "Offer not found.", back: "Back to opportunities", low: "Amount too low", login: "Sign-in required", loginText: "Sign in to save your commitment.", failed: "Subscription failed", saved: "Subscription saved", savedText: "Your commitment is reserved. Payment instructions will appear in your account.", paymentReady: "Opening secure payment…", error: "Error", unknown: "Unknown error",
    equity: "Company ownership", debt: "With repayment", conditions: "Key information", overview: "Overview", details: "The project", subscribeNav: "Subscribe", invest: "Pay for my investment", investmentCta: "Invest now", demo: "Demo", simulate: "Simulate only", runSimulation: "Simulate this amount", simulationLoading: "Calculating…", simulationError: "The estimate is temporarily unavailable.", demoText: "This opportunity is a presentation example. You can prepare your investor journey, but no amount will be debited until a real, verified opportunity is published and open for investment.", goal: "Target", raised: "Already raised", offered: "Ownership offered", return: "Expected return", duration: "Duration", long: "Long term", months: "months", of: "of", investors: "investors", from: "From", cap: "Maximum", close: "Expected closing", project: "Project overview", gallery: "The project in pictures", documents: "Documents to review", documentsHelp: "These documents can be viewed and downloaded freely, without creating an account.", view: "View", download: "Download", company: "Company", verified: "Verified company", legalForm: "Legal form", country: "Country", activity: "Activity", founded: "Founded", budget: "Use of funds", allocation: "Planned allocation", source: "Source of future payments", exit: " / resale", risks: "Risks to know", simulator: "Choose my investment", amount: "Amount to invest", minimum: "Minimum", maximum: "maximum", share: "Your share of", expected: "Expected amount at term", interest: "Estimated gain included", projected: "Estimate only, not guaranteed and subject to project risks.", enter: "Enter an amount to view the estimate", paymentChoice: "Preferred payment method", card: "Bank card", mobileMoney: "Mobile Money", bankTransfer: "Bank transfer", walletBalance: "My wallet", limitIntro: "Internal limit for this method", limitExceeded: "This amount exceeds the per-transaction limit. Reduce it or choose another method.", secure: "A personal, protected subscription", secureText: "Information already verified in your account will be used to prepare your subscription.", consentTitle: "Before continuing", acceptAgreement: "I confirm the amount and accept the subscription form.", acceptRisk: "I have read the risks and accept that I may lose some or all of the capital invested.", readTerms: "Read the terms", readRisk: "Read the risks", consentRequired: "Confirm the form and that you have read the risks before continuing.", submitting: "Approving…", submit: "Pay for this investment", payment: "Payments are subject to identity, source-of-funds and transaction-monitoring checks. You will always be asked to confirm before any debit.", riskText: "Investing involves a risk of capital loss. Past performance does not predict future performance.",
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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money" | "bank_transfer" | "wallet_balance">("card");
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [investmentGateOpen, setInvestmentGateOpen] = useState(false);
  const [investmentReadiness, setInvestmentReadiness] = useState<InvestmentReadiness>("checking");
  const [simulationRun, setSimulationRun] = useState(0);
  const [simulationAmount, setSimulationAmount] = useState<number | null>(null);

  // Reset amount when offer changes
  useEffect(() => {
    if (minInv > 0) setAmount(minInv);
    setAcceptAgreement(false);
    setAcceptRisks(false);
    setPaymentMethod("card");
    setSimulationAmount(null);
  }, [minInv, offerId]);

  // Simulation fetch
  const simUrl =
    offerId && simulationAmount !== null && simulationAmount > 0
      ? `/api/offers/${offerId}/subscribe?amount=${simulationAmount}&run=${simulationRun}`
      : null;
  const { data: simData, loading: simLoading, error: simError } = useFetch<SimulationResult>(simUrl);

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
  const simulationAmountValid = amount >= minInv && (maxInv === null || amount <= maxInv);
  const selectedPolicy = simData?.paymentPolicy?.methods.find((item) => item.method === paymentMethod);
  const selectedMethodLimit = paymentMethod === "wallet_balance" ? Number.MAX_SAFE_INTEGER : selectedPolicy?.perTransaction ?? (paymentMethod === "mobile_money" ? 1_000_000 : paymentMethod === "card" ? 10_000_000 : 50_000_000);
  const paymentLimitExceeded = amount > selectedMethodLimit;
  const updateAmount = (nextAmount: number) => {
    setAmount(nextAmount);
    setSimulationAmount(null);
  };
  const runSimulation = () => {
    if (!simulationAmountValid) return;
    setSimulationAmount(amount);
    setSimulationRun((current) => current + 1);
  };

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
          paymentMethod,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        code?: string;
        declaredCapacityMax?: number;
        reasons?: string[];
        payment?: {
          checkoutUrl?: string;
          status?: string;
          message?: string;
          instructions?: { bankName: string; beneficiary: string; accountReference: string; transferReference: string };
        };
      };
      if (res.status === 401) {
        toast({
          title: text.login,
          description: text.loginText,
        });
        setView("login");
        return;
      }
      if (json.code === "KYC_REQUIRED") {
        window.sessionStorage.setItem("nexora-open-kyc", "1");
        toast({
          title: en ? "One last identity check" : "Une dernière vérification d’identité",
          description: en ? "Complete the secure check from your personal space, then return to this opportunity." : "Finalisez le contrôle sécurisé depuis votre espace personnel, puis revenez sur cette opportunité.",
        });
        setView("investor_dashboard");
        return;
      }
      if (json.code === "INVESTOR_PROFILE_REQUIRED") {
        window.sessionStorage.setItem("nexora-open-investor-profile", "1");
        toast({
          title: en ? "Tell us about your investment plans" : "Parlez-nous de votre projet d’investissement",
          description: en ? "Six simple questions are required before your first investment." : "Six questions simples sont nécessaires avant votre première souscription.",
        });
        setView("investor_dashboard");
        return;
      }
      if (json.code === "AMOUNT_EXCEEDS_DECLARED_CAPACITY") {
        toast({
          title: en ? "Amount to review" : "Montant à revoir",
          description: en
            ? "Choose a lower amount or update your answers from your personal space."
            : "Choisissez un montant plus faible ou actualisez vos réponses depuis votre espace personnel.",
          variant: "destructive",
        });
        return;
      }
      if (json.code === "PAYMENT_LIMIT_EXCEEDED" || json.code === "PAYMENT_FREQUENCY_EXCEEDED") {
        toast({
          title: en ? "Payment limit" : "Limite de paiement",
          description: json.error || text.limitExceeded,
          variant: "destructive",
        });
        return;
      }
      if (json.code === "PAYMENT_REVIEW_REQUIRED") {
        toast({
          title: en ? "Verification in progress" : "Vérification en cours",
          description: json.message || (en ? "No amount has been debited." : "Aucun montant n'a été débité."),
        });
        setView("investor_dashboard");
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || text.failed);
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
      if (json.payment?.status === "bank_instructions_ready" && json.payment.instructions) {
        toast({
          title: en ? "Bank transfer details ready" : "Coordonnées de virement prêtes",
          description: `${json.payment.instructions.bankName} · ${json.payment.instructions.accountReference} · ${json.payment.instructions.transferReference}`,
        });
        setView("investor_dashboard");
        return;
      }
      if (json.payment?.status === "wallet_confirmed") {
        toast({
          title: en ? "Investment paid" : "Investissement payé",
          description: en ? "The amount was taken from your investment wallet and your contract is ready." : "Le montant a été prélevé sur votre portefeuille d’investissement et votre contrat est prêt.",
        });
        setView("investor_dashboard");
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
        description: e instanceof Error ? e.message : text.failed,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const company = offer.project.company;
  const gallery = (offer.project.documents ?? []).filter((document) => document.type === "gallery");
  const visitorDocuments = (offer.project.documents ?? []).filter(
    (document) => !["cover", "gallery"].includes(document.type)
  );
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const openSimulator = () => {
    const simulator = document.getElementById("subscription-simulator");
    if (!simulator) return;
    simulator.scrollIntoView({ behavior: "smooth", block: "start" });
    simulator.animate(
      [
        { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(84,18,73,0))" },
        { transform: "scale(1.012)", filter: "drop-shadow(0 18px 28px rgba(84,18,73,.18))" },
        { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(84,18,73,0))" },
      ],
      { duration: 720, easing: "ease-out" }
    );
    window.setTimeout(() => document.getElementById("amount")?.focus({ preventScroll: true }), 420);
  };

  const openInvestmentJourney = async () => {
    setInvestmentReadiness("checking");
    setInvestmentGateOpen(true);
    try {
      const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const auth = (await authResponse.json()) as { user?: { kycStatus?: string } | null };
      if (!authResponse.ok || !auth.user) {
        setInvestmentReadiness("guest");
        return;
      }
      if (auth.user.kycStatus !== "verified") {
        setInvestmentReadiness("kyc");
        return;
      }
      const profileResponse = await fetch("/api/investor/profile", { cache: "no-store" });
      if (!profileResponse.ok) {
        setInvestmentReadiness(profileResponse.status === 401 ? "guest" : "unavailable");
        return;
      }
      const profile = (await profileResponse.json()) as { complete?: boolean };
      setInvestmentReadiness(profile.complete ? "ready" : "profile");
    } catch {
      setInvestmentReadiness("unavailable");
    }
  };

  const continueInvestmentJourney = () => {
    setInvestmentGateOpen(false);
    if (investmentReadiness === "guest") {
      setView("login");
      return;
    }
    if (investmentReadiness === "kyc") {
      window.sessionStorage.setItem("nexora-open-kyc", "1");
      setView("investor_dashboard");
      return;
    }
    if (investmentReadiness === "profile") {
      window.sessionStorage.setItem("nexora-open-investor-profile", "1");
      setView("investor_dashboard");
      return;
    }
    if (investmentReadiness === "ready") openSimulator();
  };

  const signedIn = !["checking", "guest", "unavailable"].includes(investmentReadiness);
  const identityVerified = ["profile", "ready"].includes(investmentReadiness);
  const profileComplete = investmentReadiness === "ready";

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
            {offer.isDemo ? (
              <Badge className="border border-white/20 bg-white/95 text-[#541249]">
                {text.demo}
              </Badge>
            ) : null}
            {offer.visibility === "restricted" ? (
              <Badge className="border border-white/20 bg-[#f4e7f1]/95 text-[#541249]">
                {locale === "fr" ? "Invitation personnelle" : "Personal invitation"}
              </Badge>
            ) : null}
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
        <Button type="button" size="sm" onClick={() => void openInvestmentJourney()} className="btn-nexora shrink-0 rounded-xl">{text.investmentCta}</Button>
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
              {gallery.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">{text.gallery}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((document, index) => (
                      <div
                        key={document.id}
                        className={
                          "relative overflow-hidden rounded-xl bg-[#ead7e6] " +
                          (index === 0 && gallery.length > 2 ? "col-span-2 aspect-[2/1]" : "aspect-[4/3]")
                        }
                      >
                        <Image
                          src={document.fileUrl}
                          alt={document.fileName}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {visitorDocuments.length > 0 && (
                <div className="mt-6 border-t border-[#541249]/10 pt-5">
                  <p className="text-sm font-semibold text-foreground">{text.documents}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text.documentsHelp}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {visitorDocuments.map((document) => {
                      const extension = document.fileName.split(".").pop()?.toUpperCase() || "DOCUMENT";
                      const DocumentIcon = extension === "XLSX" ? FileSpreadsheet : extension === "DOCX" ? FileType2 : FileText;
                      const sizeLabel = document.size
                        ? document.size < 1024 * 1024
                          ? `${Math.max(1, Math.round(document.size / 1024))} ${en ? "KB" : "Ko"}`
                          : `${(document.size / 1024 / 1024).toFixed(1)} ${en ? "MB" : "Mo"}`
                        : null;

                      return (
                        <div
                          key={document.id}
                          className="min-w-0 rounded-2xl border border-[#541249]/10 bg-gradient-to-br from-white to-[#fbf6fa] p-3.5 shadow-[0_10px_28px_rgba(56,12,49,0.06)]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#541249] text-white shadow-[0_8px_18px_rgba(84,18,73,0.2)]">
                              <DocumentIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">{document.fileName}</span>
                              <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-muted-foreground">
                                {extension}{sizeLabel ? ` · ${sizeLabel}` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#541249]/15 bg-white px-3 text-xs font-semibold text-[#541249] transition hover:border-[#541249]/30 hover:bg-[#f8f0f6]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {text.view}
                            </a>
                            <a
                              href={document.fileUrl}
                              download
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#541249] px-3 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(84,18,73,0.18)] transition hover:bg-[#44103c]"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {text.download}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                      updateAmount(Number(e.target.value) || 0)
                    }
                    className="tnum mt-1"
                  />
                  <SegmentedControl
                    value={String(amount)}
                    onValueChange={(next) => updateAmount(Number(next))}
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
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full rounded-xl border-[#541249]/20 text-[#541249]"
                    disabled={!simulationAmountValid || simLoading}
                    onClick={runSimulation}
                  >
                    {simLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                    {simLoading ? text.simulationLoading : text.runSimulation}
                  </Button>
                </div>

                {/* Results */}
                <div className="rounded-md bg-secondary/60 p-3" aria-live="polite">
                  {simLoading ? (
                    <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {text.simulationLoading}
                    </div>
                  ) : simError ? (
                    <p className="text-center text-xs text-nexora-danger">{text.simulationError}</p>
                  ) : simData ? (
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
                                  (simData.expectedRepayment ?? simData.perInvestorRepayment ?? 0) - (simulationAmount ?? amount)
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

                {offer.isDemo ? (
                  <div className="rounded-xl border border-[#541249]/20 bg-[#FBF7FA] p-3.5 text-xs leading-5 text-[#541249]">
                    <p className="font-bold">{text.demo}</p>
                    <p className="mt-1">{text.demoText}</p>
                    <Button type="button" onClick={() => void openInvestmentJourney()} className="btn-nexora mt-3 w-full rounded-xl">
                      {text.investmentCta}
                    </Button>
                  </div>
                ) : <>
                <div>
                  <Label className="text-xs">{text.paymentChoice}</Label>
                  <SegmentedControl
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    ariaLabel={text.paymentChoice}
                    className="mt-2"
                    options={[
                      {
                        value: "card",
                        label: <><CreditCard className="h-4 w-4" />{text.card}</>,
                      },
                      {
                        value: "mobile_money",
                        label: <><Smartphone className="h-4 w-4" />{text.mobileMoney}</>,
                      },
                      {
                        value: "bank_transfer",
                        label: <><Landmark className="h-4 w-4" />{text.bankTransfer}</>,
                      },
                      {
                        value: "wallet_balance",
                        label: <><Wallet className="h-4 w-4" />{text.walletBalance}</>,
                      },
                    ]}
                  />
                  {paymentMethod !== "wallet_balance" ? <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {text.limitIntro} : {money(selectedMethodLimit)}. {selectedPolicy ? `${selectedPolicy.dailyCount} / 24 h · ${selectedPolicy.monthlyCount} / 30 j.` : ""}
                  </p> : <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{en ? "The amount is taken only from your investment wallet." : "Le montant est prélevé uniquement sur votre portefeuille d’investissement."}</p>}
                  {selectedPolicy ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg border border-border/70 bg-white p-2">
                        <span className="block text-muted-foreground">{en ? "Total over 24 h" : "Cumul sur 24 h"}</span>
                        <strong className="mt-0.5 block text-foreground">{money(selectedPolicy.dailyTotal)}</strong>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-white p-2">
                        <span className="block text-muted-foreground">{en ? "Total over 30 days" : "Cumul sur 30 jours"}</span>
                        <strong className="mt-0.5 block text-foreground">{money(selectedPolicy.monthlyTotal)}</strong>
                      </div>
                    </div>
                  ) : null}
                  {paymentLimitExceeded ? (
                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{text.limitExceeded}</span>
                    </div>
                  ) : null}
                  {paymentMethod === "bank_transfer" ? (
                    <p className="mt-2 rounded-xl bg-[#FBF7FA] p-3 text-[11px] leading-relaxed text-[#541249]">
                      {en ? "Bank details are shown only after a two-person review. No debit occurs during review." : "Les coordonnées bancaires sont affichées après une double vérification. Aucun débit n'a lieu pendant l'examen."}
                    </p>
                  ) : null}
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
                  onClick={() => setPaymentConfirmOpen(true)}
                  disabled={submitting || !acceptAgreement || !acceptRisks || paymentLimitExceeded}
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
                </>}
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
          <Button type="button" onClick={() => void openInvestmentJourney()} className="btn-nexora min-h-11 shrink-0 rounded-xl px-5">{text.investmentCta}</Button>
        </div>
      </div>
      <AlertDialog open={investmentGateOpen} onOpenChange={setInvestmentGateOpen}>
        <AlertDialogContent className="max-w-md rounded-[1.6rem]">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e8f2] text-[#541249]"><Wallet className="h-5 w-5" /></div>
            <AlertDialogTitle className="text-center">
              {en ? "Your path to investing" : "Votre parcours pour investir"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-6">
              {investmentReadiness === "checking"
                ? (en ? "We are securely checking the next step for you." : "Nous vérifions de façon sécurisée la prochaine étape pour vous.")
                : investmentReadiness === "guest"
                  ? (en ? "Sign in or create your account. You will then be guided step by step." : "Connectez-vous ou créez votre compte. Vous serez ensuite guidé étape par étape.")
                  : investmentReadiness === "kyc"
                    ? (en ? "A quick identity check is required before investing." : "Une vérification rapide de votre identité est nécessaire avant d’investir.")
                    : investmentReadiness === "profile"
                      ? (en ? "Answer six simple questions about your investment plans." : "Répondez à six questions simples sur votre projet d’investissement.")
                      : investmentReadiness === "ready" && offer.isDemo
                        ? (en ? "Your account is ready. This presentation does not accept payments yet, but you can already simulate an amount." : "Votre compte est prêt. Cette présentation n’accepte pas encore de paiement, mais vous pouvez déjà simuler un montant.")
                        : investmentReadiness === "ready"
                          ? (en ? "Everything is ready. Choose your amount and preferred payment method." : "Tout est prêt. Choisissez votre montant et votre moyen de paiement.")
                          : (en ? "We could not check your information. Please try again." : "Nous n’avons pas pu vérifier vos informations. Réessayez.")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-2xl border border-[#541249]/10 bg-[#fbf7fa] p-3">
            {[
              { label: en ? "Personal account" : "Compte personnel", complete: signedIn },
              { label: en ? "Identity verified" : "Identité vérifiée", complete: identityVerified },
              { label: en ? "Investor profile" : "Profil investisseur", complete: profileComplete },
              { label: en ? "Amount and payment method" : "Montant et moyen de paiement", complete: false },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
                {step.complete ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-[#541249]/35" />}
                <span className={step.complete ? "font-semibold text-foreground" : "text-muted-foreground"}>{step.label}</span>
                {step.complete ? <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-emerald-700">{en ? "Done" : "Terminé"}</span> : null}
              </div>
            ))}
          </div>

          {offer.isDemo && investmentReadiness !== "checking" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs leading-5 text-amber-950">
              {en ? "Presentation project: no card, wallet or Mobile Money debit is possible." : "Projet de présentation : aucun débit par carte, portefeuille ou Mobile Money n’est possible."}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>{en ? "Not now" : "Pas maintenant"}</AlertDialogCancel>
            {investmentReadiness === "checking" ? (
              <Button type="button" disabled className="btn-nexora"><LoaderCircle className="h-4 w-4 animate-spin" />{en ? "Checking…" : "Vérification…"}</Button>
            ) : investmentReadiness === "unavailable" ? (
              <Button type="button" className="btn-nexora" onClick={() => void openInvestmentJourney()}>{en ? "Try again" : "Réessayer"}</Button>
            ) : (
              <AlertDialogAction className="btn-nexora" onClick={continueInvestmentJourney}>
                {investmentReadiness === "guest"
                  ? (en ? "Sign in" : "Se connecter")
                  : investmentReadiness === "kyc"
                    ? (en ? "Verify my identity" : "Vérifier mon identité")
                    : investmentReadiness === "profile"
                      ? (en ? "Complete my profile" : "Compléter mon profil")
                      : offer.isDemo
                        ? (en ? "Simulate an amount" : "Simuler un montant")
                        : (en ? "Choose my investment" : "Choisir mon investissement")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
          {investmentReadiness === "guest" ? (
            <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => { setInvestmentGateOpen(false); setView("register"); }}>
              {en ? "Create an account" : "Créer un compte"}
            </Button>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
      {!offer.isDemo ? (
        <AlertDialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
          <AlertDialogContent className="max-w-md rounded-[1.6rem]">
            <AlertDialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e8f2] text-[#541249]"><Wallet className="h-5 w-5" /></div>
              <AlertDialogTitle className="text-center">{en ? "Confirm this investment payment?" : "Confirmer le paiement de cet investissement ?"}</AlertDialogTitle>
              <AlertDialogDescription className="text-center leading-6">
                {en
                  ? `${money(amount)} will be committed to “${offer.project.title}” using ${paymentMethod === "wallet_balance" ? "your investment wallet" : paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod === "bank_transfer" ? "a bank transfer" : "your bank card"}.`
                  : `${money(amount)} seront engagés dans « ${offer.project.title} » via ${paymentMethod === "wallet_balance" ? "votre portefeuille d’investissement" : paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod === "bank_transfer" ? "un virement bancaire" : "votre carte bancaire"}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs leading-5 text-amber-950">
              {en ? "This investment carries a risk of partial or total capital loss and may not be immediately resellable." : "Cet investissement comporte un risque de perte partielle ou totale du capital et peut ne pas être revendable immédiatement."}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{en ? "Review" : "Revoir"}</AlertDialogCancel>
              <AlertDialogAction className="btn-nexora" onClick={() => { setPaymentConfirmOpen(false); void handleSubscribe(); }}>
                {en ? "Yes, continue to payment" : "Oui, continuer vers le paiement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
