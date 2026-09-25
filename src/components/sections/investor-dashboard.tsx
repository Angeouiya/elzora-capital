"use client";
import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PayoutDialog } from "@/components/investor/payout-dialog";
import { KycDialog } from "@/components/investor/kyc-dialog";
import { InvestorProfileDialog } from "@/components/investor/investor-profile-dialog";
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import { formatDisplayMoney } from "@/lib/display-money";
import { getCountryLabel, getSectorLabel } from "@/lib/countries";
import type { Locale } from "@/lib/store";
import {
  Wallet,
  Coins,
  ArrowDownToLine,
  Bell,
  ArrowRight,
  ShieldCheck,
  PieChart as PieIcon,
  BriefcaseBusiness,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserRoundCheck,
  FileCheck2,
  Loader2,
  Undo2,
} from "lucide-react";

const CHART_COLORS = ["#541249", "#7A246C", "#250820", "#A55B98", "#C62828"];

interface DashboardUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  kycStatus: string;
  investmentProfile: {
    complete: boolean;
    needsRefresh: boolean;
    attentionLevel: string | null;
    completedAt: string | null;
    expiresAt: string | null;
  };
}

interface DashboardInvestment {
  id: string;
  offerId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  paymentConfirmedAt: string | null;
  reflectionEndsAt: string | null;
  refundableUntil: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancellation: {
    available: boolean;
    deadline: string | null;
    state: string;
  };
  createdAt: string;
  expectedRepayment: number | null;
  receivedToDate: number;
  equityDividendReceived: number;
  remainingDue: number | null;
  availableBalance: number;
  projectionLabel: string | null;
  equityPosition: {
    status: string;
    ownershipPct: number;
    certificateNo: string | null;
    issuedAt: string | null;
    issuanceStatus: string | null;
    shareClass: string | null;
  } | null;
  project?: {
    id: string;
    title: string;
    sector: string;
    country: string;
    city: string;
    instrumentType: string;
    company?: {
      legalName: string;
      tradeName?: string | null;
      legalForm: string;
    };
  };
}

interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface InvestorDashboardData {
  user: DashboardUser | null;
  investments: DashboardInvestment[];
  notifications: DashboardNotification[];
  portfolio: {
    totalInvested: number;
    availableBalance: number;
    receivedTotal: number;
    pendingPayments: number;
    activeDeals: number;
    bySector: { name: string; value: number }[];
    payoutsEnabled: boolean;
    payoutProviderName: string | null;
    payoutMethods: string[];
  } | null;
}

function NotLoggedIn() {
  const setView = useAppStore((s) => s.setView);
  const locale = useAppStore((s) => s.locale);
  const en = locale === "en";
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nexora-pale">
          <Wallet className="h-7 w-7 text-positive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{en ? "My portfolio" : "Mon portefeuille"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {en ? "Sign in to access your investments, notifications and upcoming repayments." : "Connectez-vous pour accéder à votre portefeuille d’investissements, vos notifications et vos prochains remboursements."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => setView("login")} className="btn-nexora w-full">
            {en ? "Sign in" : "Se connecter"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView("register")}
            className="w-full"
          >
            {en ? "Create account" : "Créer un compte"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ onRetry, locale }: { onRetry: () => void; locale: Locale }) {
  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-xl border border-nexora-danger/30 bg-[#FFF5F5] p-6">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-nexora-danger" />
        <p className="text-sm font-semibold text-nexora-danger">
          {locale === "en" ? "Unable to load your portfolio" : "Impossible de charger votre portefeuille"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "en" ? "Check your connection and try again." : "Vérifiez votre connexion et réessayez."}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {locale === "en" ? "Try again" : "Réessayer"}
        </Button>
      </div>
    </section>
  );
}

function statusBadge(status: string, locale: Locale) {
  const en = locale === "en";
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-nexora-pale text-positive">{en ? "Confirmed" : "Confirmé"}</Badge>
      );
    case "pending_payment":
      return (
        <Badge className="bg-[#FFF8E1] text-[#8a6d00]">
          {en ? "Pending confirmation" : "En attente de confirmation"}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-[#FFF5F5] text-nexora-danger">{en ? "Rejected" : "Rejeté"}</Badge>
      );
    case "refunded":
      return <Badge variant="secondary">{en ? "Repaid" : "Remboursé"}</Badge>;
    case "cancelled":
      return <Badge variant="outline">{en ? "Cancelled" : "Annulé"}</Badge>;
    default:
      return <Badge variant="outline">{en ? "In progress" : "En cours"}</Badge>;
  }
}

function instrumentBadge(type: string | undefined, locale: Locale) {
  if (type === "equity") {
    return <Badge className="bg-nexora-lime text-nexora-black">{locale === "en" ? "Equity" : "Action"}</Badge>;
  }
  return <Badge variant="outline">{locale === "en" ? "Debt" : "Dette"}</Badge>;
}

function localizedNotification(notification: DashboardNotification, locale: Locale) {
  if (locale === "fr") return { title: notification.title, message: notification.message };
  if (notification.type === "verification") {
    return { title: "Identity verified", message: "Your identity has been verified. You can now invest." };
  }
  if (notification.type === "payout") {
    return { title: "Payout requested", message: "Your request is being processed securely. We will notify you when it is complete." };
  }
  if (notification.type === "investment") {
    if (/annulé/i.test(`${notification.title} ${notification.message}`)) {
      return {
        title: "Commitment cancelled",
        message: "Your commitment was cancelled before payment. No funds were charged.",
      };
    }
    const match = notification.message.match(/engagement de (.+?) FCFA pour « (.+?) »/i);
    return {
      title: "Subscription saved",
      message: match
        ? `Your commitment of ${match[1]} CFA francs for “${match[2]}” is awaiting payment.`
        : "Your commitment has been saved and is awaiting payment.",
    };
  }
  if (notification.type === "payment") {
    const match = notification.message.match(/investissement de (.+?) FCFA sur « (.+?) »/i);
    return {
      title: "Investment confirmed",
      message: match
        ? `Your investment of ${match[1]} CFA francs in “${match[2]}” is confirmed.`
        : "Your investment has been confirmed.",
    };
  }
  return { title: notification.title, message: notification.message };
}

export function InvestorDashboard() {
  const userEmail = useAppStore((s) => s.userEmail);
  const setView = useAppStore((s) => s.setView);
  const openOffer = useAppStore((s) => s.openOffer);
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const money = (value: bigint | number, compact = false) => formatDisplayMoney(value, displayCurrency, locale, compact);
  const en = locale === "en";
  const dateLocale = en ? "en-GB" : "fr-FR";

  const [data, setData] = useState<InvestorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DashboardInvestment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetch("/api/investor/dashboard")
      .then(async (r) => {
        if (r.status === 401) {
          // Pas connecté — laisser vide
          setData(null);
          setLoading(false);
          return;
        }
        if (!r.ok) throw new Error("Erreur " + r.status);
        return r.json() as Promise<InvestorDashboardData>;
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || (en ? "Network error" : "Erreur réseau"));
        setLoading(false);
      });
  }, [en]);

  const cancelInvestment = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const response = await fetch(`/api/investor/investments/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "withdrawn_during_reflection" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          en
            ? "This commitment can no longer be cancelled from your account."
            : result.error || "Cet engagement ne peut plus être annulé depuis votre espace."
        );
      }
      setCancelTarget(null);
      setReloadKey((current) => current + 1);
    } catch (cancelFailure) {
      setCancelError(
        cancelFailure instanceof Error
          ? cancelFailure.message
          : en
            ? "Cancellation is temporarily unavailable."
            : "L'annulation est momentanément indisponible."
      );
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!userEmail) return;
    void reload();
  }, [userEmail, reloadKey, reload]);

  useEffect(() => {
    if (!userEmail) return;
    if (window.sessionStorage.getItem("nexora-open-kyc") === "1") {
      window.sessionStorage.removeItem("nexora-open-kyc");
      setKycOpen(true);
    }
    if (window.sessionStorage.getItem("nexora-open-investor-profile") === "1") {
      window.sessionStorage.removeItem("nexora-open-investor-profile");
      setProfileOpen(true);
    }
  }, [userEmail]);

  if (!userEmail) return <NotLoggedIn />;

  if (loading) {
    return (
      <div className="page-shell">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        locale={locale}
        onRetry={() => {
          setLoading(true);
          setError(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  if (!data?.user) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {en ? "No investor account found for" : "Aucun compte investisseur trouvé pour"}{" "}
          <strong className="text-foreground">{userEmail}</strong>.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setView("explore")}
        >
          {en ? "Explore opportunities" : "Explorer les offres"}
        </Button>
      </section>
    );
  }

  const { user, investments, notifications, portfolio } = data;
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const totalInvested = portfolio?.totalInvested ?? 0;
  const receivedTotal = portfolio?.receivedTotal ?? 0;
  const availableBalance = portfolio?.availableBalance ?? 0;

  const pendingCount = investments.filter(
    (i) => ["pending_payment", "payment_pending"].includes(i.status)
  ).length;
  const sectorAllocation = (portfolio?.bySector ?? []).map((item) => ({
    ...item,
    name: getSectorLabel(item.name, locale),
  }));

  return (
    <section className="page-shell private-app-screen reveal-in">
      <div className="private-dashboard-hero mb-6">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-sm font-black text-white backdrop-blur-xl">
              {initials || "??"}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">
                {en ? "My portfolio" : "Mon portefeuille"}
              </p>
              <h1 className="truncate text-xl font-black tracking-[-.035em] text-white sm:text-2xl">
                {fullName}
              </h1>
              <p className="truncate text-xs text-white/58">{user.email}</p>
            </div>
          </div>
          {user.kycStatus === "verified" ? (
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl">
              <ShieldCheck className="h-3.5 w-3.5 text-[#e4b4d9]" />
              {en ? "Identity verified" : "Identité vérifiée"}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-white/15 bg-white text-[#541249] hover:border-white/20 hover:bg-[#f8edf5] sm:w-auto"
              onClick={() => setKycOpen(true)}
            >
              <UserRoundCheck className="h-4 w-4" />
              {user.kycStatus === "pending" || user.kycStatus === "review"
                ? en ? "Verification in progress" : "Vérification en cours"
                : en ? "Verify my identity" : "Vérifier mon identité"}
            </Button>
          )}
        </div>

        <div className="private-metric-grid">
          <div className="private-metric">
            <div className="flex items-center justify-between gap-3 text-white/58">
              <span className="text-[11px] font-medium">{en ? "Committed capital" : "Capital engagé"}</span>
              <Wallet className="h-4 w-4 shrink-0" />
            </div>
            <p className="tnum mt-2 text-xl font-black tracking-[-.035em] text-white sm:text-2xl">{money(totalInvested)}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/52">
              {portfolio?.activeDeals ?? 0} {en ? ((portfolio?.activeDeals ?? 0) > 1 ? "active deals" : "active deal") : ((portfolio?.activeDeals ?? 0) > 1 ? "dossiers actifs" : "dossier actif")}
            </p>
          </div>
          <div className="private-metric">
            <div className="flex items-center justify-between gap-3 text-white/58">
              <span className="text-[11px] font-medium">{en ? "Returns received" : "Revenus reçus"}</span>
              <Coins className="h-4 w-4 shrink-0" />
            </div>
            <p className="tnum mt-2 text-xl font-black tracking-[-.035em] text-white sm:text-2xl">{money(receivedTotal)}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/52">
              {receivedTotal > 0
                ? (en ? "Capital and interest distributed" : "Capital et intérêts distribués")
                : (en ? "No distribution yet" : "Aucune distribution pour le moment")}
            </p>
          </div>
          <div className="private-metric">
            <div className="flex items-center justify-between gap-3 text-white/58">
              <span className="text-[11px] font-medium">{en ? "Available" : "Disponible"}</span>
              <ArrowDownToLine className="h-4 w-4 shrink-0" />
            </div>
            <p className="tnum mt-2 text-xl font-black tracking-[-.035em] text-white sm:text-2xl">{money(availableBalance)}</p>
            {availableBalance > 0 && portfolio?.payoutsEnabled ? (
              <Button
                size="sm"
                className="mt-2 h-8 border-white/15 !bg-none !bg-white px-3 text-[11px] !text-[#541249] hover:!bg-[#f8edf5]"
                onClick={() => setPayoutOpen(true)}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                {en ? "Request payout" : "Demander un versement"}
              </Button>
            ) : (
              <p className="mt-1 text-[10px] leading-4 text-white/52">
                {availableBalance > 0
                  ? (en ? "Mobile Money activation in progress" : "Activation Mobile Money en cours")
                  : (en ? "Your distributions will appear here" : "Vos distributions apparaîtront ici")}
              </p>
            )}
          </div>
        </div>
      </div>

      {!user.investmentProfile.complete ? (
        <div className="mb-5 flex flex-col gap-4 rounded-[1.35rem] border border-[#541249]/12 bg-gradient-to-r from-[#fbf6fa] to-white p-4 shadow-[0_14px_40px_-30px_rgba(84,18,73,.55)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#541249] text-white">
              <FileCheck2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {user.investmentProfile.needsRefresh
                  ? en ? "Update your investment plans" : "Actualisez votre projet d’investissement"
                  : en ? "Before your first investment" : "Avant votre première souscription"}
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                {en
                  ? "Answer six simple questions so the opportunities and amounts shown remain suited to your situation."
                  : "Répondez à six questions simples afin que les opportunités et les montants proposés restent adaptés à votre situation."}
              </p>
            </div>
          </div>
          <Button className="btn-nexora w-full shrink-0 sm:w-auto" size="sm" onClick={() => setProfileOpen(true)}>
            {user.investmentProfile.needsRefresh
              ? en ? "Update my answers" : "Mettre à jour"
              : en ? "Answer the 6 questions" : "Répondre aux 6 questions"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Prochaine étape banner — pending investments */}
      {pendingCount > 0 && (
        <div className="private-notice mt-6 flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
            <div>
              <p className="text-sm font-bold text-positive">
                {en ? "You have" : "Vous avez"} {pendingCount}{" "}
                {en
                  ? pendingCount > 1 ? "investments awaiting payment confirmation." : "investment awaiting payment confirmation."
                  : pendingCount > 1 ? "investissements en attente de confirmation de paiement." : "investissement en attente de confirmation de paiement."}
              </p>
              <p className="mt-0.5 text-xs text-positive/90">
                {en ? "Your payment will appear here as soon as it is confirmed." : "Votre paiement apparaîtra ici dès qu’il sera confirmé."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Investments list */}
        <div className="lg:col-span-2">
          <h2 className="private-section-heading">
            <Wallet className="h-4 w-4" />
            {en ? "My investments" : "Mes investissements"}
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({investments.length})
            </span>
          </h2>

          {investments.length === 0 ? (
            <Card className="private-list-card gap-3 p-4 text-center sm:flex-row sm:items-center sm:p-5 sm:text-left">
              <span className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4ebf2] text-[#541249] sm:mx-0">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {en ? "You do not have any investments yet" : "Vous n’avez encore aucun investissement"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {en ? "Discover carefully selected companies and choose the opportunity that suits you." : "Découvrez des entreprises soigneusement sélectionnées et choisissez l’opportunité qui vous correspond."}
                </p>
              </div>
              <Button
                onClick={() => setView("explore")}
                className="btn-nexora w-full shrink-0 sm:w-auto"
                size="sm"
              >
                {en ? "Explore opportunities" : "Explorer les offres"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => {
                const p = inv.project;
                const isEquity = p?.instrumentType === "equity";
                const isDebt = p?.instrumentType === "debt";
                const company = p?.company;
                const companyLabel =
                  company?.tradeName || company?.legalName || "—";
                const isPending = ["pending_payment", "payment_pending"].includes(inv.status);
                const isCancelled = inv.status === "cancelled";
                const received = inv.receivedToDate ?? 0;
                return (
                  <Card
                    key={inv.id}
                    className="private-list-card cursor-pointer p-4"
                    onClick={() => inv.offerId && openOffer(inv.offerId)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {p?.title || (en ? "Project" : "Projet")}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <BriefcaseBusiness className="h-3 w-3" />
                          {companyLabel}
                          {p?.city && (
                            <>
                              <span className="mx-1">·</span>
                              {p.city}, {getCountryLabel(p.country, locale)}
                            </>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {p?.sector && (
                            <Badge variant="outline">{getSectorLabel(p.sector, locale)}</Badge>
                          )}
                          {instrumentBadge(p?.instrumentType, locale)}
                          {statusBadge(inv.status, locale)}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="tnum">
                              {new Date(inv.createdAt).toLocaleDateString(
                                dateLocale
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-base font-bold text-foreground">
                          {money(inv.amount, true)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {en ? "Equivalent to" : "Soit"}{" "}
                          <span className="tnum font-medium text-foreground">
                            {money(inv.amount)}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="tnum font-semibold text-foreground">
                            {inv.sharePct.toFixed(3).replace(".", en ? "." : ",")} %
                          </span>{" "}
                          {isEquity ? (en ? "of equity" : "du capital") : (en ? "of the offer" : "de l’offre")}
                        </p>
                      </div>
                    </div>

                    {/* Financial details — clearly labeled */}
                    {isDebt && !isCancelled && (
                      <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border/60 bg-secondary/40 p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {en ? "Expected repayment" : "Remboursement attendu"}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-muted-foreground">
                            {inv.expectedRepayment !== null
                              ? money(inv.expectedRepayment)
                              : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {en ? "projected, not guaranteed" : "projeté, non garanti"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {en ? "Received to date" : "Reçu à ce jour"}
                          </p>
                          <p
                            className={`tnum mt-0.5 text-sm font-semibold ${
                              received > 0 ? "text-positive" : "text-muted-foreground"
                            }`}
                          >
                            {money(received)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {en ? "Remaining due" : "Restant dû"}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-muted-foreground">
                            {inv.remainingDue !== null
                              ? money(inv.remainingDue)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    {isEquity && !isCancelled && (
                      <div className="mt-3 rounded-md border border-[#D9BFD4] bg-[#FCF8FB] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-[#541249]" />
                            <span className="text-xs font-semibold text-foreground">
                              {inv.equityPosition?.status === "issued"
                                ? en ? "Participation recorded" : "Participation enregistrée"
                                : inv.equityPosition?.status === "pending_issuance"
                                  ? en ? "Allocation recorded" : "Allocation enregistrée"
                                  : en ? "Funding in progress" : "Collecte en cours"}
                            </span>
                          </div>
                          <Badge variant="outline" className="border-[#D9BFD4] bg-white text-[10px] text-[#541249]">
                            {(inv.equityPosition?.ownershipPct ?? inv.sharePct)
                              .toFixed(6)
                              .replace(/0+$/, "")
                              .replace(/\.$/, "")
                              .replace(".", en ? "." : ",")} %
                          </Badge>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          {inv.equityPosition?.status === "issued"
                            ? en
                              ? `The participation is recorded in the equity register${inv.equityPosition.certificateNo ? ` under reference ${inv.equityPosition.certificateNo}` : ""}. Liquidity and exit value remain unguaranteed.`
                              : `La participation est enregistrée dans le registre des titres${inv.equityPosition.certificateNo ? ` sous la référence ${inv.equityPosition.certificateNo}` : ""}. La liquidité et la valeur de sortie restent non garanties.`
                            : inv.equityPosition?.status === "pending_issuance"
                              ? en
                                ? "Your economic allocation is fixed. Legal issuance remains subject to the company's corporate documents and validation."
                                : "Votre allocation économique est figée. L’émission juridique reste soumise aux actes sociaux de l’entreprise et à leur validation."
                              : en
                                ? "The displayed ownership is indicative until the funding closes and the legal issuance is completed."
                                : "La participation affichée reste indicative jusqu’à la clôture de la collecte et à la réalisation de l’émission juridique."}
                        </p>
                        {inv.equityDividendReceived > 0 && (
                          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E8D8E4] bg-white px-3 py-2">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                              <Coins className="h-3.5 w-3.5 text-[#541249]" />
                              {en ? "Net dividends received" : "Dividendes nets reçus"}
                            </span>
                            <span className="tnum text-sm font-bold text-[#541249]">
                              {money(inv.equityDividendReceived)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Paiement en attente de validation par le prestataire */}
                    {isPending && (
                      <div
                        className="mt-3 flex flex-col items-start gap-2 rounded-md border border-[#FFF0B3] bg-[#FFF8E1] p-3 sm:flex-row sm:items-center sm:justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d00]" />
                          <div>
                            <p className="text-xs text-[#8a6d00]">
                              {en ? "Payment pending. We will notify you as soon as it is confirmed." : "Paiement en attente. Vous serez informé dès sa confirmation."}
                            </p>
                            {inv.cancellation.available && inv.cancellation.deadline ? (
                              <p className="mt-1 text-[11px] text-[#8a6d00]/80">
                                {en ? "You may change your mind until" : "Vous pouvez changer d'avis jusqu'au"}{" "}
                                {new Date(inv.cancellation.deadline).toLocaleString(dateLocale, {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}.
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {inv.cancellation.available ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 border-[#d8b14c] bg-white text-[11px] text-[#684f00] hover:bg-[#fffdf4]"
                            onClick={() => {
                              setCancelError(null);
                              setCancelTarget(inv);
                            }}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            {en ? "Change my mind" : "Changer d'avis"}
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — allocation + notifications */}
        <div className="flex flex-col gap-4">
          {/* Allocation par secteur */}
          <div>
            <h2 className="private-section-heading">
              <PieIcon className="h-4 w-4" />
              {en ? "Allocation by sector" : "Répartition par secteur"}
            </h2>
            {sectorAllocation.length > 0 ? (
              <Card className="private-list-card p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sectorAllocation}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {sectorAllocation.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RTooltip
                      formatter={(v: number) => money(v, true)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {sectorAllocation.map((s, i) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        {s.name}
                      </span>
                      <span className="tnum font-medium text-foreground">
                        {money(s.value, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="private-list-card gap-0 p-5 text-center text-sm text-muted-foreground">
                {en ? "No allocation yet" : "Pas encore de répartition"}
              </Card>
            )}
          </div>

          {/* Notifications */}
          <div>
            <h2 className="private-section-heading">
              <Bell className="h-4 w-4" />
              {en ? "Notifications" : "Notifications"}
            </h2>
            {notifications.length === 0 ? (
              <Card className="private-list-card gap-0 p-5 text-center text-sm text-muted-foreground">
                {en ? "No notifications" : "Aucune notification"}
              </Card>
            ) : (
              <Card className="private-list-card max-h-96 overflow-y-auto p-0">
                <ul className="divide-y divide-border">
                  {notifications.map((n) => {
                    const localized = localizedNotification(n, locale);
                    return (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 p-4 ${
                        !n.read ? "bg-nexora-pale/60" : ""
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          !n.read
                            ? "bg-nexora-lime text-nexora-black"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {localized.title}
                          </p>
                          {!n.read && (
                            <span className="shrink-0 text-[10px] font-bold uppercase text-positive">
                              {en ? "New" : "Nouveau"}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {localized.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString(dateLocale, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      <KycDialog
        open={kycOpen}
        onOpenChange={setKycOpen}
        locale={locale}
        status={user.kycStatus}
        onSubmitted={() => setReloadKey((key) => key + 1)}
      />

      <InvestorProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        locale={locale}
        onSaved={() => setReloadKey((key) => key + 1)}
      />

      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        locale={locale}
        displayCurrency={displayCurrency}
        onCompleted={() => setReloadKey((current) => current + 1)}
      />

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !cancelling) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[1.6rem] border-[#541249]/12 bg-[#fffefd] p-5 sm:p-6">
          <AlertDialogHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ebf2] text-[#541249]">
              <Undo2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-[-.03em]">
              {en ? "Cancel this commitment?" : "Annuler cet engagement ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {en
                ? "No payment has been confirmed. The reserved amount will be released immediately and the opportunity will become available again."
                : "Aucun paiement n'a été confirmé. Le montant réservé sera libéré immédiatement et redeviendra disponible sur l'offre."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelTarget ? (
            <div className="rounded-2xl border border-[#541249]/10 bg-[#f8f2f7] p-4">
              <p className="text-sm font-bold text-foreground">{cancelTarget.project?.title}</p>
              <p className="tnum mt-1 text-lg font-black text-[#541249]">{money(cancelTarget.amount)}</p>
              {cancelTarget.cancellation.deadline ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {en ? "Reflection period ends" : "Fin du délai de réflexion"}{" "}
                  {new Date(cancelTarget.cancellation.deadline).toLocaleString(dateLocale, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.
                </p>
              ) : null}
            </div>
          ) : null}
          {cancelError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {cancelError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              {en ? "Keep commitment" : "Conserver l'engagement"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              className="bg-[#541249] text-white hover:bg-[#380c31]"
              onClick={(event) => {
                event.preventDefault();
                void cancelInvestment();
              }}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              {cancelling
                ? en ? "Cancelling…" : "Annulation…"
                : en ? "Confirm cancellation" : "Confirmer l'annulation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </section>
  );
}
