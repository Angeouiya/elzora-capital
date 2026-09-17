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

const INVESTOR_STEPS = [
  {
    icon: Search,
    title: "Découvrir",
    desc: "Parcourez les offres vérifiées, filtrez par secteur, pays, instrument (dette ou capital).",
  },
  {
    icon: FileText,
    title: "Analyser",
    desc: "Lisez la présentation, le budget, les risques. Simulez votre investissement avant de souscrire.",
  },
  {
    icon: Coins,
    title: "Souscrire",
    desc: "Indiquez votre montant, signez électroniquement. Délai de rétractation de 14 jours.",
  },
  {
    icon: CalendarDays,
    title: "Suivre",
    desc: "Suivez les échéances de remboursement et les actualités depuis votre portefeuille.",
  },
];

const COMPANY_STEPS = [
  {
    icon: Building2,
    title: "Déposer",
    desc: "Créez le compte entreprise, soumettez le dossier (bilan, business plan, garanties).",
  },
  {
    icon: FileText,
    title: "Analyse équipe",
    desc: "L&rsquo;équipe NEXORA instruit le dossier, demande les compléments, structure le financement.",
  },
  {
    icon: LayoutGrid,
    title: "Publication",
    desc: "Une fois validé, l&rsquo;offre est publiée sur la plateforme. L&rsquo;entreprise ne publie jamais directement.",
  },
  {
    icon: Wallet,
    title: "Financement",
    desc: "Les fonds sont décaissés à l&rsquo;entreprise. Elle rembourse selon l&rsquo;échéancier contractuel.",
  },
];

const PRICING = [
  {
    label: "Commission initiale",
    value: "6 %",
    desc: "du capital financé, prélevée à la levée",
    audience: "Entreprise",
  },
  {
    label: "Commission de suivi",
    value: "2 %/an",
    desc: "sur le capital restant dû, prorata temporis",
    audience: "Entreprise",
  },
  {
    label: "Frais investisseur",
    value: "0 %",
    desc: "aucun frais de souscription ni de gestion",
    audience: "Investisseur",
  },
];

export function HowItWorks() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Fonctionnement
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Du dépôt du dossier au remboursement des investisseurs — un parcours
          structuré et transparent.
        </p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Investisseurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5" />
              Pour les investisseurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {INVESTOR_STEPS.map((step, i) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nexora-pale text-positive">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Étape {i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Entreprises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5" />
              Pour les entreprises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {COMPANY_STEPS.map((step, i) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nexora-pale text-positive">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Étape {i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p
                    className="mt-0.5 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: step.desc }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notre rôle */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" />
            Notre rôle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            NEXORA Capital analyse et prépare chaque offre publiée sur la
            plateforme. L&rsquo;entreprise ne publie jamais directement : son
            dossier est instruit par l&rsquo;équipe, structuré financièrement,
            puis soumis à validation. Cette instruction préalable vise à
            garantir une information complète et homogène pour les
            investisseurs, mais ne constitue ni un conseil en investissement,
            ni une garantie de remboursement.
          </p>
        </CardContent>
      </Card>

      {/* Tarification */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {p.label}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      p.audience === "Investisseur"
                        ? "border-[#B6FF00] text-positive"
                        : "border-border text-foreground"
                    }
                  >
                    {p.audience}
                  </Badge>
                </div>
                <p className="tnum mt-2 text-2xl font-black text-foreground">
                  {p.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
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
              Avertissement sur les risques
            </p>
            <p className="mt-1 text-xs leading-relaxed text-nexora-danger">
              L&rsquo;investissement en dette comme en capital présente un
              risque de perte en capital. Les performances passées ne
              préjugent pas des performances futures. La capacité de
              remboursement de l&rsquo;entreprise dépend de son activité ;
              l&rsquo;absence de garantie sur le capital investi doit être
              prise en compte. Diversifiez vos investissements et
              n&rsquo;allouez pas plus de 10 % de votre patrimoine à un projet
              unique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
