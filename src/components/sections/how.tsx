"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Coins,
  CalendarDays,
  Building2,
  ShieldCheck,
  TriangleAlert,
  LayoutGrid,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const COPY = {
  fr: {
    kicker: "Un parcours lisible",
    title: "Fonctionnement",
    intro: "Du dépôt du dossier au remboursement des investisseurs — un parcours structuré et transparent.",
    investorTitle: "Pour les investisseurs",
    companyTitle: "Pour les entreprises",
    step: "Étape",
    investorSteps: [
      ["Découvrir", "Parcourez les offres vérifiées et filtrez par secteur, pays ou instrument."],
      ["Analyser", "Lisez la présentation, le budget et les risques. Simulez avant de souscrire."],
      ["Souscrire", "Indiquez votre montant, signez électroniquement et bénéficiez du délai de réflexion applicable."],
      ["Suivre", "Suivez les échéances, les distributions et les actualités depuis votre portefeuille."],
    ],
    companySteps: [
      ["Déposer", "Créez le compte entreprise et soumettez le dossier financier et juridique."],
      ["Analyse équipe", "L’équipe NEXORA instruit le dossier, demande les compléments et structure le financement."],
      ["Publication", "Une fois validée, l’offre est publiée par NEXORA. L’entreprise ne publie jamais directement."],
      ["Financement", "Les fonds sont décaissés après contrôle. L’entreprise respecte ensuite l’échéancier contractuel."],
    ],
    roleTitle: "Notre rôle",
    roleText: "NEXORA Capital analyse et prépare chaque offre publiée. Le dossier est instruit, structuré financièrement, puis soumis à validation. Cette instruction améliore la qualité de l’information sans constituer un conseil en investissement ni une garantie de remboursement.",
    pricing: "Tarification",
    pricingItems: [
      ["Commission initiale", "6 %", "du capital financé, prélevée à la levée", "Entreprise"],
      ["Commission de suivi", "2 %/an", "sur le capital restant dû, au prorata de la durée", "Entreprise"],
      ["Frais investisseur", "0 %", "aucuns frais de souscription ni de gestion", "Investisseur"],
    ],
    riskTitle: "Avertissement sur les risques",
    riskText: "La dette comme le capital présentent un risque de perte. La capacité de remboursement dépend de l’activité de l’entreprise. Diversifiez et n’investissez que des sommes dont vous n’avez pas besoin à court terme.",
  },
  en: {
    kicker: "A clear journey",
    title: "How it works",
    intro: "From application to investor repayment — a structured and transparent journey.",
    investorTitle: "For investors",
    companyTitle: "For companies",
    step: "Step",
    investorSteps: [
      ["Discover", "Browse verified opportunities and filter by sector, country or instrument."],
      ["Review", "Read the presentation, budget and risks. Simulate before subscribing."],
      ["Subscribe", "Choose your amount, sign electronically and benefit from the applicable reflection period."],
      ["Track", "Follow schedules, distributions and updates from your portfolio."],
    ],
    companySteps: [
      ["Apply", "Create a company account and submit the financial and legal application."],
      ["Team review", "The NEXORA team reviews the file, requests additions and structures the financing."],
      ["Publication", "Once approved, the offer is published by NEXORA. Companies never publish directly."],
      ["Funding", "Funds are released after controls. The company then follows the contractual schedule."],
    ],
    roleTitle: "Our role",
    roleText: "NEXORA Capital reviews and prepares every published offer. Each application is assessed, financially structured and submitted for approval. This process improves information quality without constituting investment advice or a repayment guarantee.",
    pricing: "Pricing",
    pricingItems: [
      ["Initial commission", "6%", "of funded capital, charged at closing", "Company"],
      ["Monitoring commission", "2%/year", "on outstanding principal, prorated over time", "Company"],
      ["Investor fee", "0%", "no subscription or management fee", "Investor"],
    ],
    riskTitle: "Risk warning",
    riskText: "Debt and equity investments both involve a risk of loss. Repayment depends on the company’s activity. Diversify and invest only money you will not need in the short term.",
  },
} as const;

const INVESTOR_ICONS = [Search, FileText, Coins, CalendarDays];
const COMPANY_ICONS = [Building2, FileText, LayoutGrid, Wallet];

export function HowItWorks() {
  const locale = useAppStore((state) => state.locale);
  const copy = COPY[locale];
  const investorSteps: ReadonlyArray<readonly [string, string]> = copy.investorSteps;
  const companySteps: ReadonlyArray<readonly [string, string]> = copy.companySteps;
  const pricingItems: ReadonlyArray<readonly [string, string, string, string]> = copy.pricingItems;
  return (
    <div className="page-shell reveal-in">
      <div className="mb-8">
        <p className="page-kicker">{copy.kicker}</p>
        <h1 className="page-title mt-1">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.intro}
        </p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Investisseurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5" />
              {copy.investorTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {investorSteps.map(([title, description], i) => {
              const Icon = INVESTOR_ICONS[i];
              return <div key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nexora-pale text-positive">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {copy.step} {i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>;
            })}
          </CardContent>
        </Card>

        {/* Entreprises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5" />
              {copy.companyTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {companySteps.map(([title, description], i) => {
              const Icon = COMPANY_ICONS[i];
              return <div key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nexora-pale text-positive">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {copy.step} {i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>;
            })}
          </CardContent>
        </Card>
      </div>

      {/* Notre rôle */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" />
            {copy.roleTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            {copy.roleText}
          </p>
        </CardContent>
      </Card>

      {/* Tarification */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5" />
            {copy.pricing}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pricingItems.map(([label, value, description, audience]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      audience === "Investisseur" || audience === "Investor"
                        ? "border-[#541249] text-positive"
                        : "border-border text-foreground"
                    }
                  >
                    {audience}
                  </Badge>
                </div>
                <p className="tnum mt-2 text-2xl font-black text-foreground">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risques */}
      <div
        className="mt-6 border-l-4 p-4"
        style={{ borderColor: "#C62828", backgroundColor: "#FFF5F5" }}
      >
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-nexora-danger" />
          <div>
            <p className="text-sm font-bold text-nexora-danger">
              {copy.riskTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-nexora-danger">
              {copy.riskText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
