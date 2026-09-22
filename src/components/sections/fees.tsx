"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";

const FEES = [
  {
    icon: Building2,
    audience: "Entreprise",
    title: "Commission de levée",
    value: "6 %",
    description: "Prélevée une seule fois sur le montant effectivement financé.",
  },
  {
    icon: ReceiptText,
    audience: "Entreprise",
    title: "Suivi du financement",
    value: "2 % / an",
    description: "Calculé sur le capital restant dû et au prorata de la durée.",
  },
  {
    icon: CircleDollarSign,
    audience: "Investisseur",
    title: "Souscription",
    value: "0 %",
    description: "Aucune commission de plateforme ajoutée au montant souscrit.",
  },
];

export function Fees() {
  const setView = useAppStore((state) => state.setView);

  return (
    <div className="page-shell reveal-in">
      <section className="overflow-hidden rounded-[1.4rem] border border-[#541249]/15 bg-[linear-gradient(135deg,#541249_0%,#380C31_55%,#130410_100%)] px-5 py-7 text-white shadow-[0_22px_60px_rgba(56,12,49,.18)] sm:px-9 sm:py-10">
        <p className="page-kicker hero-kicker">Tarification transparente</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.045em] sm:text-5xl">
          Comprendre chaque franc, avant de s&rsquo;engager.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
          Les frais de plateforme et les frais du moyen de paiement sont
          présentés séparément avant toute validation. Aucun montant n&rsquo;est
          ajouté après confirmation.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {FEES.map(({ icon: Icon, audience, title, value, description }) => (
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
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white/75 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#250820] text-white">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Carte bancaire et Mobile Money</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Les frais éventuels du prestataire de paiement dépendent du pays,
              de l&rsquo;opérateur et du canal choisi. Ils doivent être affichés dans le
              récapitulatif avant l&rsquo;autorisation du paiement ou du retrait.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="btn-nexora" onClick={() => setView("explore")}>
          Explorer les opportunités
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={() => setView("how")}>
          Voir le fonctionnement
        </Button>
      </div>
    </div>
  );
}
