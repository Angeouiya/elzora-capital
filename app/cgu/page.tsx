import type { Metadata } from "next";
import Link from "next/link";
import { NexoraLogo, NexoraLogoDark } from "@/components/NexoraLogo";
import { ArrowLeft, ShieldCheck, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions générales — Nexora Capital",
  description: "Conditions générales d'utilisation de la plateforme Nexora Capital.",
};

const SECTIONS = [
  {
    title: "1. Objet",
    body: [
      "Les présentes conditions générales régissent l'accès et l'utilisation de la plateforme Nexora Capital, un service de financement participatif destiné à l'Afrique de l'Ouest. La plateforme met en relation des entreprises cherchant un financement et des investisseurs particuliers ou entreprises éligibles.",
      "La plateforme n'est pas un établissement de crédit. L'encaissement et la conservation des fonds sont confiés à un partenaire habilité, dans les conditions prévues aux conditions particulières applicables à chaque offre.",
    ],
  },
  {
    title: "2. Statut de démonstration",
    body: [
      "La version actuelle de la plateforme fonctionne en mode démonstration : les paiements, décaissements et versements sont simulés et aucun fonds réel n'est manipulé. Les opérations financières décrites dans ces conditions ne deviennent exécutables qu'après l'intégration contractuelle des prestataires concernés.",
    ],
  },
  {
    title: "3. Compte utilisateur",
    body: [
      "L'inscription est ouverte aux particuliers et aux entreprises selon les conditions d'ouverture définies par pays. L'inscription de l'entreprise ne vaut pas vérification de la société : un dossier permanent de vérification doit être complété avant tout usage financier.",
      "Avant vérification complète, l'usager peut explorer les offres et préparer un dossier. La souscription et le versement restent bloqués tant que les conditions nécessaires ne sont pas réunies.",
      "L'usager est responsable de la confidentialité de ses identifiants. Tout changement de bénéficiaire, versement ou signature sensible peut exiger une authentification renforcée.",
    ],
  },
  {
    title: "4. Offres et risques",
    body: [
      "Chaque offre publiée présente la société juridiquement responsable, le projet, les conditions financières, les frais, les risques et l'origine du remboursement. Les éléments essentiels des risques et conditions restent visibles avant tout engagement.",
      "Un financement en dette (prêt ou obligation) et une participation au capital (actions) sont des instruments distincts, avec des droits et distributions distincts. Les actions ne sont pas une dette à rendement fixe et ne comportent pas d'échéancier de remboursement.",
      "Tout investissement comporte un risque de perte en capital, de défaillance de l'entreprise et d'illiquidité. Un total prévisionnel n'est pas une garantie. Aucun rendement futur n'est présenté comme déjà reçu.",
    ],
  },
  {
    title: "5. Tarification",
    body: [
      "Aucune commission de souscription n'est due par l'investisseur. L'entreprise supporte : une commission initiale calculée sur le capital effectivement financé, et des frais de suivi annuels calculés au prorata de la durée sur le capital restant à rembourser.",
      "La grille tarifaire applicable à un financement est figée contractuellement à la conclusion de celui-ci. Aucune modification rétroactive n'est appliquée. La tarification des opérations en capital (actions) fait l'objet d'un modèle spécifique distinct.",
    ],
  },
  {
    title: "6. Collecte et exécution",
    body: [
      "Les fonds reçus ne sont crédités qu'après vérification serveur de la référence, du montant, de la devise et de la confirmation du prestataire. La collecte distingue les engagements et les fonds confirmés.",
      "En cas de collecte insuffisante, les fonds confirmés sont restitués aux investisseurs selon la procédure prévue. Une collecte conclue n'est ni prolongée ni modifiée sans appliquer la procédure de nouvelle validation.",
      "Après collecte réussie, le versement à l'entreprise intervient après vérification des conditions prévues au contrat, par tranches éventuelles, vers un compte professionnel vérifié.",
    ],
  },
  {
    title: "7. Retards, défauts et litiges",
    body: [
      "En cas d'impayé, l'investisseur en est informé, un dossier de suivi est ouvert et une proposition de restructuration peut être étudiée sous réserve des consultations nécessaires. L'échéancier initial et chaque révision sont conservés.",
      "Une difficulté commerciale n'est pas automatiquement une fraude. Les opérations en difficulté sont affichées honnêtement dans les statistiques. Les garanties éventuelles ne couvrent pas nécessairement l'intégralité des sommes dues.",
    ],
  },
  {
    title: "8. Données personnelles",
    body: [
      "Les données sont traitées conformément à la politique de confidentialité. Les documents d'identité ne sont jamais publics. Les données nécessaires aux obligations applicables sont conservées selon les durées prévues, sans promesse d'effacement immédiat de tous les historiques.",
    ],
  },
  {
    title: "9. Communications",
    body: [
      "Les communications contractuelles (décisions, échéances, versements, incidents) ne peuvent pas être désactivées. Les communications marketing sont facultatives et séparées du consentement aux conditions.",
    ],
  },
  {
    title: "10. Droit applicable et réclamations",
    body: [
      "Les présentes conditions sont soumises au droit applicable dans le pays de configuration retenu. Toute réclamation peut être adressée via l'espace assistance ; les recours éventuels sont traités selon les procédures locales.",
    ],
  },
];

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Bandeau */}
      <header className="bg-[#101010] pt-10 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3">
              <NexoraLogoDark size={32} />
              <span className="text-white font-semibold tracking-tight">Nexora Capital</span>
            </Link>
            <Link
              href="/connexion"
              className="text-sm text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </div>
          <div className="flex items-center gap-2 text-[#B6FF00] text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Document contractuel
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
            Conditions générales d&apos;utilisation
          </h1>
          <p className="text-white/50 mt-3 text-sm leading-relaxed max-w-xl">
            Version de démonstration — ce document présente la structure des conditions
            applicables. La version contractuelle définitive requiert une validation juridique.
          </p>
        </div>
      </header>

      {/* Sommaire */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6 pb-20">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] border border-[#101010]/5">
          <nav aria-label="Sommaire" className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#101010]/50 mb-3">
              Sommaire
            </p>
            {/* Mobile : chips défilantes — Desktop : liste verticale */}
            <ol className="flex md:flex-col gap-2 md:gap-0 md:space-y-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0 [scrollbar-width:none]">
              {SECTIONS.map((s) => (
                <li key={s.title} className="shrink-0">
                  <a
                    href={`#section-${s.title.split(".")[0]}`}
                    className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#F5F5F3] ring-1 ring-[#101010]/8 text-[13px] font-medium text-[#101010]/70 whitespace-nowrap hover:ring-[#B6FF00] hover:text-[#101010] active:bg-[#EFFBDD] transition-all md:h-auto md:px-0 md:rounded-none md:bg-transparent md:ring-0 md:text-sm md:font-normal md:text-[#507300] md:hover:underline md:hover:underline-offset-2 md:active:bg-transparent"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.title} id={`section-${s.title.split(".")[0]}`}>
                <h2 className="text-base font-bold text-[#101010] mb-2">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm text-[#101010]/70 leading-relaxed mb-2 last:mb-0">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[#101010]/10 flex items-start gap-2.5 bg-[#EFFBDD]/50 rounded-lg p-4 -mx-1">
            <Info className="h-4.5 w-4.5 text-[#166534] shrink-0 mt-0.5" />
            <p className="text-xs text-[#101010]/65 leading-relaxed">
              Les points nécessitant une validation juridique ou un prestataire habilité sont
              identifiés comme tels. Sans ces prérequis, les opérations concernées restent en
              démonstration et ne peuvent pas manipuler d&apos;argent réel.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/confidentialite" className="text-[#507300] font-medium hover:underline underline-offset-2">
              Politique de confidentialité
            </Link>
            <Link href="/entreprise/conditions" className="text-[#507300] font-medium hover:underline underline-offset-2">
              Conditions de financement entreprise
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <NexoraLogo size={28} />
          <p className="text-xs text-[#101010]/40 mt-2">
            Nexora Capital — Plateforme de démonstration
          </p>
        </div>
      </main>
    </div>
  );
}
