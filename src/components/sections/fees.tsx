"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";

const COPY = {
  fr: {
    kicker: "Tarification transparente",
    title: "Comprendre chaque franc, avant de s’engager.",
    intro: "Les frais de plateforme et ceux du moyen de paiement sont présentés séparément avant toute validation. Aucun montant n’est ajouté après confirmation.",
    fees: [
      ["Entreprise", "Commission de levée", "6 %", "Prélevée une seule fois sur le montant effectivement financé."],
      ["Entreprise", "Suivi du financement", "2 % / an", "Calculé sur le capital restant dû et au prorata de la durée."],
      ["Investisseur", "Souscription", "0 %", "Aucune commission de plateforme ajoutée au montant souscrit."],
    ],
    payments: "Carte bancaire et Mobile Money",
    paymentText: "Les frais éventuels du prestataire dépendent du pays, de l’opérateur et du canal choisi. Ils sont affichés dans le récapitulatif avant l’autorisation du paiement ou du retrait.",
    explore: "Explorer les opportunités",
    how: "Voir le fonctionnement",
  },
  en: {
    kicker: "Transparent pricing",
    title: "Understand every charge before committing.",
    intro: "Platform and payment-method fees are presented separately before validation. No amount is added after confirmation.",
    fees: [
      ["Company", "Funding commission", "6%", "Charged once on the amount effectively funded."],
      ["Company", "Financing monitoring", "2% / year", "Calculated on outstanding principal and prorated over time."],
      ["Investor", "Subscription", "0%", "No platform commission is added to the subscribed amount."],
    ],
    payments: "Bank card and Mobile Money",
    paymentText: "Any provider fee depends on the country, operator and selected channel. It is shown in the summary before payment or withdrawal authorization.",
    explore: "Explore opportunities",
    how: "See how it works",
  },
} as const;

const FEE_ICONS = [Building2, ReceiptText, CircleDollarSign];

export function Fees() {
  const setView = useAppStore((state) => state.setView);
  const locale = useAppStore((state) => state.locale);
  const copy = COPY[locale];
  const fees: ReadonlyArray<readonly [string, string, string, string]> = copy.fees;

  return (
    <div className="page-shell reveal-in">
      <section className="overflow-hidden rounded-[1.4rem] border border-[#541249]/15 bg-[linear-gradient(135deg,#541249_0%,#380C31_55%,#130410_100%)] px-5 py-7 text-white shadow-[0_22px_60px_rgba(56,12,49,.18)] sm:px-9 sm:py-10">
        <p className="page-kicker hero-kicker">{copy.kicker}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.045em] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
          {copy.intro}
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {fees.map(([audience, title, value, description], index) => {
          const Icon = FEE_ICONS[index];
          return (
          <article key={title} className="surface-card rounded-2xl border border-border bg-white/80 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-pale text-positive">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-[#541249]/15 bg-[#F7EAF5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-positive">
                {audience}
              </span>
            </div>
            <p className="tnum mt-6 text-3xl font-black tracking-tight text-foreground">{value}</p>
            <h2 className="mt-2 text-sm font-bold text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white/75 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#250820] text-white">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-foreground">{copy.payments}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {copy.paymentText}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="btn-nexora" onClick={() => setView("explore")}>
          {copy.explore}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={() => setView("how")}>
          {copy.how}
        </Button>
      </div>
    </div>
  );
}
