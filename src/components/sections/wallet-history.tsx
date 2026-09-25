"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Clock3,
  Coins,
  Loader2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PayoutDialog } from "@/components/investor/payout-dialog";
import { formatDisplayMoney } from "@/lib/display-money";
import { useAppStore } from "@/lib/store";

interface WalletEntry {
  id: string;
  amount: number;
  currency: string;
  sourceType: string;
  reference: string;
  createdAt: string;
  balanceAfter: number;
}

interface WalletPayload {
  summary: {
    availableBalance: number;
    totalReceived: number;
    totalPaidOut: number;
    pendingPayout: number;
    payoutsEnabled: boolean;
  };
  entries: WalletEntry[];
  nextCursor: string | null;
}

const COPY = {
  fr: {
    kicker: "Mon portefeuille",
    title: "Chaque mouvement, clairement retracé.",
    intro: "Suivez les remboursements, dividendes et versements enregistrés sur votre portefeuille.",
    back: "Retour au portefeuille",
    available: "Disponible",
    received: "Reçu sur le portefeuille",
    paidOut: "Déjà versé",
    pending: "en cours de versement",
    request: "Demander un versement",
    activation: "Activation Mobile Money en cours",
    history: "Historique des mouvements",
    historyHelp: "Les montants et le solde après chaque opération sont conservés dans l’ordre chronologique.",
    empty: "Aucun mouvement pour le moment.",
    emptyHelp: "Vos futurs remboursements et dividendes apparaîtront ici automatiquement.",
    more: "Afficher les mouvements précédents",
    loadingMore: "Chargement…",
    balanceAfter: "Solde après mouvement",
    reference: "Réf.",
    repayment: "Remboursement reçu",
    dividend: "Dividende reçu",
    payout: "Versement demandé",
    released: "Montant rendu disponible",
    credit: "Montant reçu",
    debit: "Montant versé",
    protected: "Historique personnel et protégé",
    protectedHelp: "Seul votre compte peut consulter ces mouvements.",
    loadError: "Impossible de charger les mouvements du portefeuille.",
    retry: "Réessayer",
    signIn: "Se connecter",
  },
  en: {
    kicker: "My portfolio",
    title: "Every movement, clearly recorded.",
    intro: "Track repayments, dividends and payouts recorded in your portfolio.",
    back: "Back to portfolio",
    available: "Available",
    received: "Received in portfolio",
    paidOut: "Already paid out",
    pending: "being paid out",
    request: "Request payout",
    activation: "Mobile Money activation in progress",
    history: "Movement history",
    historyHelp: "Amounts and the balance after each operation are kept in chronological order.",
    empty: "No movement yet.",
    emptyHelp: "Future repayments and dividends will appear here automatically.",
    more: "Show earlier movements",
    loadingMore: "Loading…",
    balanceAfter: "Balance after movement",
    reference: "Ref.",
    repayment: "Repayment received",
    dividend: "Dividend received",
    payout: "Payout requested",
    released: "Amount made available again",
    credit: "Amount received",
    debit: "Amount paid out",
    protected: "Personal, protected history",
    protectedHelp: "Only your account can view these movements.",
    loadError: "Unable to load portfolio movements.",
    retry: "Try again",
    signIn: "Sign in",
  },
} as const;

export function WalletHistory() {
  const { locale, displayCurrency, setView, userEmail } = useAppStore();
  const copy = COPY[locale];
  const [data, setData] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<"AUTH" | string | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const money = (value: number) => formatDisplayMoney(value, displayCurrency, locale);

  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/investor/wallet?${query}`, { cache: "no-store" });
      if (response.status === 401) {
        setError("AUTH");
        return;
      }
      const payload = (await response.json()) as WalletPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.loadError);
      setData((current) => cursor && current
        ? { ...payload, entries: [...current.entries, ...payload.entries] }
        : payload
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.loadError);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <WalletSkeleton />;
  if (error || !data) {
    return (
      <section className="page-shell py-8 sm:py-12">
        <div className="mx-auto max-w-xl rounded-[1.75rem] border border-[#541249]/12 bg-white p-7 text-center shadow-[0_20px_60px_rgba(56,12,49,.08)]">
          <WalletCards className="mx-auto h-10 w-10 text-[#541249]" />
          <h1 className="mt-4 text-xl font-bold tracking-[-.03em]">{copy.loadError}</h1>
          <Button className="btn-nexora mt-6" onClick={() => error === "AUTH" ? setView("login") : void load()}>
            {error === "AUTH" ? copy.signIn : copy.retry}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell private-app-screen space-y-5 py-5 sm:space-y-6 sm:py-8">
      <header className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#541249_0%,#2f0a2a_58%,#160412_100%)] text-white shadow-[0_24px_60px_rgba(56,12,49,.2)]">
        <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 rounded-full px-2.5 text-xs text-white/72 hover:bg-white/10 hover:text-white"
            onClick={() => setView("investor_dashboard")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {copy.back}
          </Button>
          <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#e8bedf]">{copy.kicker}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/70">{copy.intro}</p>
            </div>
            {data.summary.availableBalance > 0 && data.summary.payoutsEnabled ? (
              <Button className="h-11 rounded-full !bg-none !bg-white px-5 !text-[#541249] hover:!bg-[#f8edf5]" onClick={() => setPayoutOpen(true)}>
                <ArrowDownToLine className="h-4 w-4" />
                {copy.request}
              </Button>
            ) : data.summary.availableBalance > 0 ? (
              <span className="w-fit rounded-full border border-white/12 bg-white/[.08] px-4 py-2.5 text-xs font-semibold text-white/72">
                {copy.activation}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-3">
          <SummaryMetric icon={WalletCards} label={copy.available} value={money(data.summary.availableBalance)} />
          <SummaryMetric icon={Coins} label={copy.received} value={money(data.summary.totalReceived)} />
          <SummaryMetric
            icon={ArrowUpFromLine}
            label={copy.paidOut}
            value={money(data.summary.totalPaidOut)}
            note={data.summary.pendingPayout > 0 ? `${money(data.summary.pendingPayout)} ${copy.pending}` : undefined}
          />
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[#541249]/10 bg-white p-5 shadow-[0_16px_42px_rgba(56,12,49,.055)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4e7f1] text-[#541249]">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-[-.02em]">{copy.history}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.historyHelp}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#f8f2f7] px-3 py-2 text-xs font-semibold text-[#541249]">
          <ShieldCheck className="h-3.5 w-3.5" />
          {copy.protected}
        </div>
      </div>

      {data.entries.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#541249]/18 bg-white px-5 py-12 text-center">
          <Clock3 className="mx-auto h-9 w-9 text-[#7a246c]" />
          <p className="mt-4 text-base font-semibold">{copy.empty}</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{copy.emptyHelp}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-[#541249]/10 bg-white shadow-[0_16px_42px_rgba(56,12,49,.045)]">
          <ul className="divide-y divide-[#541249]/8">
            {data.entries.map((entry) => (
              <WalletEntryRow key={entry.id} entry={entry} locale={locale} copy={copy} money={money} />
            ))}
          </ul>
          {data.nextCursor ? (
            <div className="border-t border-[#541249]/8 p-4 text-center">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-[#541249]/18 px-5 text-[#541249]"
                disabled={loadingMore}
                onClick={() => void load(data.nextCursor || undefined)}
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                {loadingMore ? copy.loadingMore : copy.more}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <p className="px-1 text-center text-xs leading-5 text-muted-foreground">
        {copy.protectedHelp} {userEmail ? `· ${userEmail}` : ""}
      </p>

      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        locale={locale}
        displayCurrency={displayCurrency}
        onCompleted={() => void load()}
      />
    </section>
  );
}

function SummaryMetric({ icon: Icon, label, value, note }: { icon: typeof WalletCards; label: string; value: string; note?: string }) {
  return (
    <div className="border-white/10 px-5 py-4 sm:border-r sm:px-7 sm:last:border-r-0">
      <div className="flex items-center justify-between gap-3 text-white/55">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="tnum mt-2 text-xl font-bold tracking-[-.035em] text-white sm:text-2xl">{value}</p>
      {note ? <p className="mt-1 text-xs text-white/52">{note}</p> : null}
    </div>
  );
}

function WalletEntryRow({
  entry,
  locale,
  copy,
  money,
}: {
  entry: WalletEntry;
  locale: "fr" | "en";
  copy: (typeof COPY)["fr"] | (typeof COPY)["en"];
  money: (value: number) => string;
}) {
  const credit = entry.amount >= 0;
  const label = entry.sourceType === "distribution"
    ? copy.repayment
    : entry.sourceType === "equity_dividend"
      ? copy.dividend
      : entry.sourceType === "payout"
        ? credit ? copy.released : copy.payout
        : credit ? copy.credit : copy.debit;
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(entry.createdAt));

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${credit ? "bg-[#edf7f1] text-[#146c43]" : "bg-[#f8edf5] text-[#541249]"}`}>
          {credit ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{date}</p>
          {entry.reference ? <p className="mt-0.5 text-xs text-muted-foreground">{copy.reference} {entry.reference}</p> : null}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 pl-[3.25rem] sm:block sm:pl-0 sm:text-right">
        <p className={`tnum text-base font-bold ${credit ? "text-[#146c43]" : "text-[#541249]"}`}>
          {credit ? "+" : "−"}{money(Math.abs(entry.amount))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.balanceAfter} <span className="tnum font-semibold text-foreground">{money(entry.balanceAfter)}</span>
        </p>
      </div>
    </li>
  );
}

function WalletSkeleton() {
  return (
    <section className="page-shell space-y-5 py-5 sm:py-8" aria-label="Chargement" role="status">
      <Skeleton className="h-72 rounded-[1.75rem]" />
      <Skeleton className="h-24 rounded-[1.5rem]" />
      <Skeleton className="h-80 rounded-[1.5rem]" />
      <span className="sr-only">Chargement…</span>
    </section>
  );
}
