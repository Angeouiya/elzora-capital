"use client";

import { useFetch } from "@/hooks/use-fetch";
import { formatDisplayMoney } from "@/lib/display-money";
import { useAppStore } from "@/lib/store";
import type { OfferDTO } from "@/lib/types";
import { OfferCard } from "@/components/site/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CircleCheck,
  Compass,
  HandCoins,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

interface MemberHomeResponse {
  user: {
    firstName: string;
    lastName: string;
    kycStatus: string;
  } | null;
  investments: Array<{ id: string }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  portfolio: {
    totalInvested: number;
    availableBalance: number;
    receivedTotal: number;
    pendingPayments: number;
    activeDeals: number;
  } | null;
}

const COPY = {
  fr: {
    greeting: "Bonjour",
    overview: "Vue d’ensemble",
    invested: "Capital engagé",
    wallet: "Disponible",
    received: "Reçu",
    active: "Participations actives",
    pending: "Paiements à finaliser",
    explore: "Explorer",
    portfolio: "Mon portefeuille",
    finance: "Financer mon entreprise",
    identityApproved: "Identité vérifiée",
    identityPending: "Vérification à terminer",
    identityText: "Finalisez votre profil avant votre prochaine souscription.",
    continue: "Continuer",
    market: "Opportunités du moment",
    marketText: "Des dossiers analysés, prêts à être consultés.",
    all: "Tout voir",
    empty: "La prochaine sélection est en préparation.",
    activity: "Activité récente",
    noActivity: "Vos confirmations et distributions apparaîtront ici.",
    unavailable: "Votre espace ne peut pas être chargé pour le moment.",
    retry: "Ouvrir le portefeuille",
  },
  en: {
    greeting: "Hello",
    overview: "Overview",
    invested: "Capital committed",
    wallet: "Available",
    received: "Received",
    active: "Active positions",
    pending: "Payments to complete",
    explore: "Explore",
    portfolio: "My portfolio",
    finance: "Finance my business",
    identityApproved: "Identity verified",
    identityPending: "Verification to complete",
    identityText: "Complete your profile before your next investment.",
    continue: "Continue",
    market: "Current opportunities",
    marketText: "Reviewed opportunities ready to explore.",
    all: "View all",
    empty: "The next selection is being prepared.",
    activity: "Recent activity",
    noActivity: "Your confirmations and distributions will appear here.",
    unavailable: "Your workspace cannot be loaded right now.",
    retry: "Open portfolio",
  },
} as const;

function MemberHomeLoading() {
  return (
    <section className="page-shell" aria-label="Chargement" role="status">
      <Skeleton className="h-8 w-52 rounded-xl" />
      <Skeleton className="mt-5 h-72 rounded-[1.6rem]" />
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </section>
  );
}

export function MemberHome() {
  const locale = useAppStore((state) => state.locale);
  const displayCurrency = useAppStore((state) => state.displayCurrency);
  const userEmail = useAppStore((state) => state.userEmail);
  const setView = useAppStore((state) => state.setView);
  const { data, loading, error } = useFetch<MemberHomeResponse>("/api/investor/dashboard");
  const { data: offerData, loading: offersLoading } = useFetch<{ offers: OfferDTO[] }>("/api/offers");
  const copy = COPY[locale];

  if (loading) return <MemberHomeLoading />;

  if (error || !data?.user || !data.portfolio) {
    return (
      <section className="page-shell reveal-in">
        <div className="mx-auto max-w-lg rounded-[1.4rem] border border-[#541249]/10 bg-white p-6 text-center shadow-sm">
          <WalletCards className="mx-auto h-7 w-7 text-[#541249]" />
          <p className="mt-3 text-sm font-semibold">{copy.unavailable}</p>
          <Button className="btn-nexora mt-4" onClick={() => setView("investor_dashboard")}>
            {copy.retry}<ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  const firstName = data.user.firstName?.trim() || userEmail?.split("@")[0] || "";
  const portfolio = data.portfolio;
  const offers = offerData?.offers ?? [];
  const latestNotification = data.notifications[0] ?? null;
  const kycApproved = data.user.kycStatus === "verified";
  const money = (amount: number, compact = false) =>
    formatDisplayMoney(amount, displayCurrency, locale, compact);

  const quickActions = [
    { icon: Compass, label: copy.explore, view: "explore" as const },
    { icon: WalletCards, label: copy.portfolio, view: "investor_dashboard" as const },
    { icon: BriefcaseBusiness, label: copy.finance, view: "company_dashboard" as const },
  ];

  return (
    <section className="page-shell member-home reveal-in">
      <header className="flex items-center justify-between gap-4 pb-4 sm:pb-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{copy.greeting}</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-[-.04em] text-foreground sm:text-3xl">
            {firstName}
          </h1>
        </div>
        <Badge className={kycApproved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}>
          {kycApproved ? <CircleCheck className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {kycApproved ? copy.identityApproved : copy.identityPending}
        </Badge>
      </header>

      <div className="member-overview-card relative overflow-hidden rounded-[1.6rem] p-5 text-white sm:p-7 lg:grid lg:grid-cols-[1.2fr_.8fr] lg:gap-10 lg:p-9">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-white/58">{copy.overview}</p>
          <p className="tnum mt-4 text-[2rem] font-black leading-none tracking-[-.05em] sm:text-5xl">
            {money(portfolio.totalInvested)}
          </p>
          <p className="mt-2 text-sm text-white/64">{copy.invested}</p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-white/10 bg-white/[.07] p-3.5 backdrop-blur-xl">
              <WalletCards className="h-4 w-4 text-[#e4b4d9]" />
              <p className="mt-3 text-xs text-white/58">{copy.wallet}</p>
              <p className="tnum mt-1 text-base font-bold">{money(portfolio.availableBalance, true)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.07] p-3.5 backdrop-blur-xl">
              <HandCoins className="h-4 w-4 text-[#d99ca1]" />
              <p className="mt-3 text-xs text-white/58">{copy.received}</p>
              <p className="tnum mt-1 text-base font-bold">{money(portfolio.receivedTotal, true)}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-col justify-between rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-xl lg:mt-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="tnum text-2xl font-black">{portfolio.activeDeals}</p>
              <p className="mt-1 text-xs leading-4 text-white/58">{copy.active}</p>
            </div>
            <div>
              <p className="tnum text-2xl font-black">{portfolio.pendingPayments}</p>
              <p className="mt-1 text-xs leading-4 text-white/58">{copy.pending}</p>
            </div>
          </div>
          <Button
            onClick={() => setView("investor_dashboard")}
            className="mt-6 h-11 w-full border border-white/12 !bg-none !bg-white !text-[#380c31] hover:!bg-[#f8edf5]"
          >
            {copy.portfolio}<ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!kycApproved ? (
        <button
          type="button"
          data-control="choice"
          onClick={() => setView("investor_dashboard")}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-amber-950">{copy.identityPending}</span>
            <span className="mt-0.5 block text-xs leading-5 text-amber-900/72">{copy.identityText}</span>
          </span>
          <span className="text-xs font-bold text-amber-950">{copy.continue}</span>
        </button>
      ) : null}

      <nav aria-label={locale === "fr" ? "Accès rapides" : "Quick access"} className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              data-control="choice"
              key={action.view}
              onClick={() => setView(action.view)}
              className="group flex min-h-24 flex-col items-start justify-between rounded-2xl border border-[#541249]/10 bg-white p-3 text-left shadow-[0_8px_24px_rgba(56,12,49,.045)] hover:border-[#541249]/22 hover:bg-[#fcf8fb] sm:min-h-28 sm:p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4ebf2] text-[#541249] transition-colors group-hover:bg-[#541249] group-hover:text-white">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="mt-3 text-xs font-bold leading-4 text-foreground sm:text-sm">{action.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="mt-8 sm:mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-[-.025em] sm:text-2xl">{copy.market}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.marketText}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("explore")} className="shrink-0 text-[#541249]">
            {copy.all}<ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {offersLoading ? (
          <div className="mt-4 flex gap-3 overflow-hidden">
            {Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-80 min-w-[82%] rounded-[1.35rem] sm:min-w-0 sm:flex-1" />)}
          </div>
        ) : offers.length > 0 ? (
          <div className="mobile-card-rail -mx-[.55rem] mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[.55rem] pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {offers.slice(0, 3).map((offer, index) => (
              <div key={offer.id} className="min-w-[86%] snap-center sm:min-w-0">
                <OfferCard offer={offer} eager={index === 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#541249]/10 bg-white p-5 text-sm text-muted-foreground">
            {copy.empty}
          </div>
        )}
      </section>

      <section className="mt-7 rounded-[1.35rem] border border-[#541249]/10 bg-white p-4 sm:mt-9 sm:p-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-4.5 w-4.5 text-[#541249]" />
          <h2 className="text-sm font-black">{copy.activity}</h2>
        </div>
        {latestNotification ? (
          <div className="mt-3 border-l-2 border-[#7b286d] pl-3">
            <p className="text-sm font-semibold">{latestNotification.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{latestNotification.message}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.noActivity}</p>
        )}
      </section>
    </section>
  );
}
