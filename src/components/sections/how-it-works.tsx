"use client";
import { useAppStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileSearch,
  Handshake,
  TrendingUp,
  Banknote,
  Rocket,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";

const INVESTOR_STEPS = [
  {
    icon: Search,
    title: "1. Découvrez les opportunités",
    text: "Parcourez un catalogue de projets dûment analysés par nos équipes financières, filtrables par secteur, pays et niveau de risque.",
  },
  {
    icon: FileSearch,
    title: "2. Analysez le dossier",
    text: "Accédez au business plan complet, aux projections financières sur 5 ans, au CV du porteur de projet et aux contrats commerciaux signés.",
  },
  {
    icon: Handshake,
    title: "3. Investissez",
    text: "Choisissez votre montant (dès 50 000 FCFA), signez électroniquement le pacte d'associés et procédez au virement sur compte séquestre.",
  },
  {
    icon: TrendingUp,
    title: "4. Suivez votre portefeuille",
    text: "Tableau de bord en temps réel, rapports trimestriels, assemblées générales en ligne. Sortie à terme ou revente sur marché secondaire.",
  },
];

const PROMOTER_STEPS = [
  {
    icon: Rocket,
    title: "Soumettez votre projet",
    text: "Présentez votre entreprise en ligne. Nos analystes étudient chaque dossier sous 15 jours.",
  },
  {
    icon: ShieldCheck,
    title: "Due diligence",
    text: "Audit financier, juridique et opérationnel par nos experts et nos partenaires (Big Four locaux).",
  },
  {
    icon: Users,
    title: "Levée participative",
    text: "Mise en ligne, campagne de 60 à 90 jours, accompagnement marketing. Objectif : 100 % du ticket.",
  },
  {
    icon: Banknote,
    title: "Déblocage des fonds",
    text: "Virement des fonds levés moins commission (5 %), mentorat post-levée et reporting trimestriel.",
  },
];

const GUARANTEES = [
  "Analyse approfondie de chaque projet par des analystes certifiés AMF/PSAN",
  "Fonds déposés sur compte séquestre bancaire jusqu'au déblocage",
  "Pacte d'associés signé électroniquement (valeur juridique)",
  "Reporting trimestriel obligatoire des porteurs de projet",
  "Accompagnement post-investissement et droit de suivi en AG",
  "Possibilité de revente sur marché secondaire interne après 12 mois",
];

export function HowItWorks() {
  const { setView } = useAppStore();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Mode d'emploi
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Comment fonctionne Baobab Capital
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Une plateforme transparente qui connecte les porteurs de projet
          ouest-africains aux investisseurs privés, dans un cadre réglementaire strict.
        </p>
      </div>

      {/* Investor flow */}
      <div className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            I
          </span>
          Vous êtes investisseur
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INVESTOR_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Promoter flow */}
      <div className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
            P
          </span>
          Vous êtes porteur de projet
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMOTER_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                  <Icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Guarantees */}
      <div className="mt-12 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Nos garanties & engagements
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <div key={g} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-muted-foreground">{g}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing / fees */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Investisseurs
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">0 %</p>
          <p className="text-xs text-muted-foreground">
            Frais d'inscription et de gestion. Vous investissez, vous suivez, sans
            frais cachés.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Porteurs de projet
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">5 %</p>
          <p className="text-xs text-muted-foreground">
            Commission au succès sur le capital levé. Pas de levée, pas de frais.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Carried interest
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">10 %</p>
          <p className="text-xs text-muted-foreground">
            Au-dessus d'un TRI de 8 %/an, alignement d'intérêts avec les porteurs.
          </p>
        </Card>
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <Button
          onClick={() => setView("projects")}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          Explorer les opportunités
        </Button>
      </div>
    </section>
  );
}
