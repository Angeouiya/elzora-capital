"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BanknoteArrowDown,
  BriefcaseBusiness,
  FileCheck2,
  ScanSearch,
  Scale,
  ShieldAlert,
} from "lucide-react";

const COPY = {
  fr: {
    kicker: "Information investisseur",
    title: "Investir avec une vision claire du risque.",
    intro: "L’analyse d’un dossier réduit l’asymétrie d’information ; elle ne supprime ni le risque de perte, ni l’incertitude sur la performance.",
    risks: [
      ["Perte en capital", "La valeur d’une participation peut diminuer et le capital investi peut être perdu en tout ou partie."],
      ["Risque d’entreprise", "Une PME peut subir un recul d’activité, un défaut de trésorerie ou une cessation d’activité."],
      ["Liquidité limitée", "Les titres non cotés ne disposent pas d’un marché secondaire garantissant une revente rapide."],
      ["Dilution et gouvernance", "De futures levées peuvent diluer la participation et les droits dépendent des statuts et pactes conclus."],
    ],
    prudence: "Règle de prudence",
    prudenceText: "N’investissez que l’épargne dont vous n’avez pas besoin à court terme. Diversifiez et examinez les documents, les hypothèses financières et les conditions de sortie.",
    framework: "Cadre réglementaire de référence",
    frameworkText: "Avant toute ouverture au public, chaque opération doit être qualifiée juridiquement. Une diffusion large de titres peut relever de l’appel public à l’épargne et exiger un visa de l’AMF-UMOA. Les droits attachés aux titres doivent respecter l’Acte uniforme OHADA applicable. Les paiements et retraits transitent par un prestataire autorisé.",
    info: "Cette synthèse est informative et ne remplace pas une validation par les autorités compétentes ni un avis juridique adapté à chaque offre.",
    cta: "Consulter les opportunités",
  },
  en: {
    kicker: "Investor information",
    title: "Invest with a clear view of risk.",
    intro: "Application review reduces information asymmetry; it does not remove the risk of loss or uncertainty about performance.",
    risks: [
      ["Capital loss", "The value of an investment may fall and invested capital may be lost in whole or in part."],
      ["Business risk", "An SME may experience lower activity, cash-flow stress or cease trading."],
      ["Limited liquidity", "Unlisted securities have no secondary market guaranteeing a quick resale."],
      ["Dilution and governance", "Future rounds may dilute ownership, while rights depend on the articles and shareholder agreements."],
    ],
    prudence: "Prudence rule",
    prudenceText: "Invest only savings you will not need in the short term. Diversify and review the documents, financial assumptions and exit conditions.",
    framework: "Regulatory framework",
    frameworkText: "Before any public launch, each transaction must be legally qualified. Broad distribution of securities may constitute a public offering and require AMF-UMOA approval. Security rights must comply with the applicable OHADA Uniform Act. Payments and withdrawals must pass through an authorized provider.",
    info: "This summary is for information only and does not replace validation by the competent authorities or legal advice tailored to each offer.",
    cta: "Browse opportunities",
  },
} as const;

const RISK_ICONS = [BanknoteArrowDown, BriefcaseBusiness, ScanSearch, Scale];

export function Risks() {
  const setView = useAppStore((state) => state.setView);
  const locale = useAppStore((state) => state.locale);
  const copy = COPY[locale];
  const risks: ReadonlyArray<readonly [string, string]> = copy.risks;

  return (
    <div className="page-shell reveal-in">
      <section className="public-hero px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="editorial-kicker">{copy.kicker}</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl">{copy.title}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
          {copy.intro}
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {risks.map(([title, description], index) => {
          const Icon = RISK_ICONS[index];
          return (
          <article key={title} className="public-panel p-5 sm:p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-pale text-positive">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-extrabold text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-[#541249]/20 bg-[linear-gradient(135deg,#F7EAF5_0%,#FFFFFF_100%)] p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-positive" />
          <div>
            <h2 className="text-base font-extrabold text-foreground">{copy.prudence}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.prudenceText}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 section-rule pt-8">
        <div className="flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-positive" />
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">{copy.framework}</h2>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
          {copy.frameworkText}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.amf-umoa.org/reglementation/convention" target="_blank" rel="noreferrer">
            {locale === "fr" ? "AMF-UMOA · Marché financier" : "AMF-UMOA · Financial market"}
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.ohada.org/droit-des-societes-commerciales-et-du-gie/" target="_blank" rel="noreferrer">
            {locale === "fr" ? "OHADA · Droit des sociétés" : "OHADA · Company law"}
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.bceao.int/fr/reglementations/instruction-ndeg001-01-2024-du-23-janvier-2024-relative-aux-services-de-paiement" target="_blank" rel="noreferrer">
            {locale === "fr" ? "BCEAO · Services de paiement" : "BCEAO · Payment services"}
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {copy.info}
        </p>
      </section>

      <div className="mt-8">
        <Button className="btn-nexora" size="lg" onClick={() => setView("explore")}>
          {copy.cta}
        </Button>
      </div>
    </div>
  );
}
