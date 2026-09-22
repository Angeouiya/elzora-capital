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
import { toast } from "@/hooks/use-toast";
import {
  Wallet,
  Coins,
  ArrowDownToLine,
  Bell,
  ArrowRight,
  ShieldCheck,
  PieChart as PieIcon,
  Building2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
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
  createdAt: string;
  expectedRepayment: number | null;
  receivedToDate: number;
  remainingDue: number | null;
  availableBalance: number;
  projectionLabel: string | null;
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
      return <Badge variant="outline">{status}</Badge>;
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
    return { title: "Payout requested", message: "Your request has been sent securely to the payment provider." };
  }
  if (notification.type === "investment") {
    const match = notification.message.match(/engagement de (.+?) FCFA pour « (.+?) »/i);
    return {
      title: "Subscription saved",
      message: match
        ? `Your commitment of XOF ${match[1]} for “${match[2]}” is awaiting payment.`
        : "Your commitment has been saved and is awaiting payment.",
    };
  }
  if (notification.type === "payment") {
    const match = notification.message.match(/investissement de (.+?) FCFA sur « (.+?) »/i);
    return {
      title: "Investment confirmed",
      message: match
        ? `Your investment of XOF ${match[1]} in “${match[2]}” is confirmed.`
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

  useEffect(() => {
    if (!userEmail) return;
    void reload();
  }, [userEmail, reloadKey, reload]);

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
    (i) => i.status === "pending_payment"
  ).length;
  const sectorAllocation = (portfolio?.bySector ?? []).map((item) => ({
    ...item,
    name: getSectorLabel(item.name, locale),
  }));

  return (
    <section className="page-shell reveal-in">
      {/* Top bar — identity */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-black text-sm font-bold text-nexora-lime">
            {initials || "??"}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {fullName}
            </h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        {user.kycStatus === "verified" && (
          <div className="flex items-center gap-2 rounded-full bg-nexora-pale px-3 py-1.5 text-xs font-medium text-positive">
            <ShieldCheck className="h-3.5 w-3.5" />
            {en ? "Identity verified" : "Identité vérifiée"}
          </div>
        )}
      </div>

      {/* 3 metrics max */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Capital engagé */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {en ? "Committed capital" : "Capital engagé"}
            </span>
            <Wallet className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {money(totalInvested)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {en ? "Across" : "Réparti sur"} {portfolio?.activeDeals ?? 0}{" "}
            {en ? ((portfolio?.activeDeals ?? 0) > 1 ? "active deals" : "active deal") : ((portfolio?.activeDeals ?? 0) > 1 ? "dossiers actifs" : "dossier actif")}
          </p>
        </Card>

        {/* 2. Revenus reçus */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {en ? "Returns received" : "Revenus reçus"}
            </span>
            <Coins className="h-4 w-4 text-positive" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-positive">
            {money(receivedTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {receivedTotal > 0
              ? (en ? "Principal and interest distributed" : "Capital et intérêts distribués")
              : (en ? "No repayment received yet" : "Aucun remboursement reçu pour l'instant")}
          </p>
        </Card>

        {/* 3. Disponible */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {en ? "Available" : "Disponible"}
            </span>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {money(availableBalance)}
          </p>
          {availableBalance > 0 && portfolio?.payoutsEnabled ? (
            <Button
              size="sm"
              className="btn-nexora mt-2 h-7 px-3 text-xs"
              onClick={() =>
                toast({
                  title: en ? "Secure payout" : "Versement sécurisé",
                  description: en ? "Select your verified payout method." : "Sélectionnez votre moyen de versement vérifié.",
                })
              }
            >
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
              {en ? "Request payout" : "Demander un versement"}
            </Button>
          ) : availableBalance > 0 ? (
            <p className="mt-1 text-[11px] font-medium text-positive">
              {en ? "Bank and Mobile Money payouts are being activated" : "Versements par banque et Mobile Money en cours d’activation"}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {en ? "Your returns will appear here after distribution" : "Vos revenus apparaîtront ici après distribution"}
            </p>
          )}
        </Card>
      </div>

      {/* Prochaine étape banner — pending investments */}
      {pendingCount > 0 && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-[#541249]/30 bg-nexora-pale p-4 sm:flex-row sm:items-center sm:justify-between">
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
                {en ? "Confirmation will be applied automatically after validation by the payment provider." : "La confirmation sera appliquée automatiquement après validation du prestataire de paiement."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Investments list */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Wallet className="h-4 w-4" />
            {en ? "My investments" : "Mes investissements"}
            <span className="tnum text-xs font-normal text-muted-foreground">
              ({investments.length})
            </span>
          </h2>

          {investments.length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {en ? "You do not have any investments yet" : "Vous n’avez encore aucun investissement"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {en ? `Explore available opportunities and invest from ${money(10_000)}.` : `Explorez les offres disponibles et souscrivez à partir de ${money(10_000)}.`}
              </p>
              <Button
                onClick={() => setView("explore")}
                className="btn-nexora mt-4"
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
                const isPending = inv.status === "pending_payment";
                const received = inv.receivedToDate ?? 0;
                return (
                  <Card
                    key={inv.id}
                    className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                    onClick={() => inv.offerId && openOffer(inv.offerId)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {p?.title || (en ? "Project" : "Projet")}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
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
                    {isDebt && (
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
                    {isEquity && (
                      <div className="mt-3 rounded-md border border-border/60 bg-secondary/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {en ? "Future exit, not guaranteed." : "Sortie à terme, non garantie."}
                          </span>{" "}
                          {en ? "No repayment schedule applies to this equity investment." : "Aucun échéancier de remboursement pour cette prise de participation."}
                        </p>
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
                          <p className="text-xs text-[#8a6d00]">
                            {en ? "Payment pending. Confirmation will appear automatically after provider validation." : "Paiement en attente. Sa confirmation apparaîtra automatiquement après validation par le prestataire."}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — allocation + notifications */}
        <div className="flex flex-col gap-6">
          {/* Allocation par secteur */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <PieIcon className="h-4 w-4" />
              {en ? "Allocation by sector" : "Répartition par secteur"}
            </h2>
            {sectorAllocation.length > 0 ? (
              <Card className="p-4">
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
              <Card className="p-8 text-center text-sm text-muted-foreground">
                {en ? "No allocation yet" : "Pas encore de répartition"}
              </Card>
            )}
          </div>

          {/* Notifications */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Bell className="h-4 w-4" />
              {en ? "Notifications" : "Notifications"}
            </h2>
            {notifications.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                {en ? "No notifications" : "Aucune notification"}
              </Card>
            ) : (
              <Card className="max-h-96 overflow-y-auto p-0">
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

    </section>
  );
}
