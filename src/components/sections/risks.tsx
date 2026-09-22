"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BanknoteArrowDown,
  BriefcaseBusiness,
  FileCheck2,
  Landmark,
  Scale,
  ShieldAlert,
} from "lucide-react";

const RISKS = [
  {
    icon: BanknoteArrowDown,
    title: "Perte en capital",
    description: "La valeur d’une participation peut diminuer et le capital investi peut être perdu en tout ou partie.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Risque d’entreprise",
    description: "Une PME peut subir un recul d’activité, un défaut de trésorerie ou une cessation d’activité.",
  },
  {
    icon: Landmark,
    title: "Liquidité limitée",
    description: "Les titres non cotés ne disposent pas d&rsquo;un marché secondaire garantissant une revente rapide.",
  },
  {
    icon: Scale,
    title: "Dilution et gouvernance",
    description: "De futures levées peuvent diluer la participation et les droits dépendent des statuts et pactes conclus.",
  },
];

export function Risks() {
  const setView = useAppStore((state) => state.setView);

  return (
    <div className="page-shell reveal-in">
      <div className="max-w-3xl">
        <p className="page-kicker">Information investisseur</p>
        <h1 className="page-title mt-2">Investir avec une vision claire du risque.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
          L&rsquo;analyse d&rsquo;un dossier réduit l&rsquo;asymétrie d&rsquo;information ; elle ne
          supprime ni le risque de perte, ni l&rsquo;incertitude sur la performance.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {RISKS.map(({ icon: Icon, title, description }) => (
          <article key={title} className="surface-card rounded-2xl border border-border bg-white/80 p-5 sm:p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-pale text-positive">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-extrabold text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[#541249]/20 bg-[linear-gradient(135deg,#F7EAF5_0%,#FFFFFF_100%)] p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-positive" />
          <div>
            <h2 className="text-base font-extrabold text-foreground">Règle de prudence</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              N&rsquo;investissez que l&rsquo;épargne dont vous n&rsquo;avez pas besoin à court
              terme. Diversifiez entre plusieurs entreprises et examinez les
              documents, les hypothèses financières et les conditions de sortie.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 section-rule pt-8">
        <div className="flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-positive" />
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Cadre réglementaire de référence</h2>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
          Avant toute ouverture au public, chaque opération doit être qualifiée
          juridiquement. Une sollicitation du public ou une diffusion large de
          titres peut relever de l&rsquo;appel public à l&rsquo;épargne et exiger un visa de
          l&rsquo;AMF-UMOA. Les droits attachés aux parts ou actions doivent respecter
          l&rsquo;Acte uniforme OHADA applicable à la forme sociale de l&rsquo;émetteur.
          Les paiements et retraits doivent transiter par un prestataire autorisé.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.amf-umoa.org/reglementation/convention" target="_blank" rel="noreferrer">
            AMF-UMOA · Marché financier
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.ohada.org/droit-des-societes-commerciales-et-du-gie/" target="_blank" rel="noreferrer">
            OHADA · Droit des sociétés
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
          <a className="rounded-xl border border-border bg-white/75 p-4 text-sm font-semibold text-foreground transition hover:border-[#541249]/35" href="https://www.bceao.int/fr/reglementations/instruction-ndeg001-01-2024-du-23-janvier-2024-relative-aux-services-de-paiement" target="_blank" rel="noreferrer">
            BCEAO · Services de paiement
            <ArrowUpRight className="ml-1 inline h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Cette synthèse est informative et ne remplace pas une validation par
          les autorités compétentes ni un avis juridique adapté à chaque offre.
        </p>
      </section>

      <div className="mt-8">
        <Button className="btn-nexora" size="lg" onClick={() => setView("explore")}>
          Consulter les opportunités
        </Button>
      </div>
    </div>
  );
}
