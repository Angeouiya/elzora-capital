"use client";
import { Card } from "@/components/ui/card";
import {
  Sprout,
  ShieldCheck,
  Handshake,
  TrendingUp,
  Globe2,
  Zap,
} from "lucide-react";

const VALUES = [
  {
    icon: Sprout,
    title: "Impact réel",
    text: "Chaque investissement finance une entreprise qui crée des emplois locaux et structure l'économie ouest-africaine.",
  },
  {
    icon: ShieldCheck,
    title: "Cadre réglementaire",
    text: "Conformité BCEAO et code CIMA. Vos fonds sont sécurisés sur compte séquestre bancaire jusqu'au déblocage.",
  },
  {
    icon: Handshake,
    title: "Ticket accessible",
    text: "Dès 50 000 FCFA, devenez actionnaire d'entreprises qui façonnent l'avenir de l'Afrique de l'Ouest.",
  },
  {
    icon: TrendingUp,
    title: "Rendements attractifs",
    text: "TRI cibles entre 11 % et 22 %, dans des secteurs à forte croissance démographique et structurelle.",
  },
  {
    icon: Globe2,
    title: "Couverture régionale",
    text: "8 pays de l'UEMOA, du Sénégal à la Guinée-Bissau. Un portefeuille diversifié géographiquement.",
  },
  {
    icon: Zap,
    title: "Transparence totale",
    text: "Dossiers complets, projections financières, reporting trimestriel. Vous décidez en connaissance de cause.",
  },
];

export function ValueProposition() {
  return (
    <section className="border-y border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Pourquoi Baobab Capital
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            La finance au service du développement ouest-africain
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Nous démocratisons l'investissement en capital privé. Plus besoin
            d'être un fonds institutionnel pour accéder aux meilleures
            opportunités de la région.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <Card key={v.title} className="p-5 transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{v.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {v.text}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
