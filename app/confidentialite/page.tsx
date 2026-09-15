import type { Metadata } from "next";
import Link from "next/link";
import { NexoraLogo, NexoraLogoDark } from "@/components/NexoraLogo";
import { ArrowLeft, Lock, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Nexora Capital",
  description: "Politique de confidentialité et traitement des données personnelles.",
};

const SECTIONS = [
  {
    title: "1. Données collectées",
    body: [
      "Compte : identité (prénom, nom), coordonnées (email, téléphone), pays, préférences linguistiques et identifiants sécurisés.",
      "Vérification : justificatifs d'identité et documents exigés par la configuration du pays (pièce d'identité, justificatif de domicile, relevés, documents de société selon le cas).",
      "Opérations : historique des souscriptions, paiements, échéances, versements et retraits, nécessaires à l'exécution et à la justification des opérations.",
      "Sécurité : journaux de connexion, appareils et sessions, incidents techniques.",
    ],
  },
  {
    title: "2. Finalités",
    body: [
      "Création et gestion du compte, vérification de l'identité et de l'éligibilité, exécution des opérations financières convenues, obligations légales et réglementaires applicables, prévention de la fraude, assistance et amélioration du service.",
      "Les communications marketing ne sont envoyées qu'avec un consentement séparé et facultatif, révocable à tout moment. Le refus n'affecte pas l'accès au service.",
    ],
  },
  {
    title: "3. Données sensibles et documents",
    body: [
      "Les documents d'identité ne sont jamais publics. Ils sont stockés dans un espace documentaire privé, accessibles uniquement aux personnes habilitées pour la vérification, avec des liens temporaires et un journal d'accès.",
      "Les données sensibles ne sont pas utilisées pour entraîner des systèmes d'intelligence artificielle sans base et autorisation appropriées.",
    ],
  },
  {
    title: "4. Durées de conservation",
    body: [
      "Les données sont conservées pendant la durée de la relation contractuelle, puis selon les obligations applicables au pays concerné (notamment comptables et de lutte contre la fraude). Une fermeture de compte ne supprime pas les droits ou dettes encore actifs : les registres, contrats et historiques nécessaires sont conservés.",
    ],
  },
  {
    title: "5. Partage",
    body: [
      "Les données ne sont partagées qu'avec les prestataires nécessaires à l'exécution (partenaire de paiement habilité, prestataire de vérification d'identité), dans la limite de ce qui est requis, et selon les obligations légales. Les droits d'une entreprise n'ouvrent pas accès aux données d'une autre entreprise.",
      "Dans l'espace entreprise, les informations personnelles des investisseurs sont limitées à ce que les obligations de l'entreprise exigent : pas d'accès par défaut aux documents d'identité ni aux coordonnées de paiement.",
    ],
  },
  {
    title: "6. Vos droits",
    body: [
      "Selon la législation applicable dans votre pays, vous pouvez demander l'accès à vos données, leur rectification, leur effacement dans les limites légales, la limitation ou l'opposition à certains traitements, et la portabilité de vos données. Les demandes sont traitées via l'espace assistance avec des contrôles d'identité adaptés.",
    ],
  },
  {
    title: "7. Sécurité",
    body: [
      "Chiffrement des communications, limitation des tentatives de connexion, authentification renforcée pour les opérations sensibles, séparation des environnements, sauvegardes et procédures de reprise après panne, journal d'audit protégé.",
      "Les alertes de sécurité internes (sanctions, contrôles renforcés) ne sont pas accessibles au public.",
    ],
  },
  {
    title: "8. Statut de démonstration",
    body: [
      "La plateforme fonctionne en mode démonstration : les données saisies servent uniquement au fonctionnement local de la démonstration et aucun transfert à un prestataire réel n'a lieu tant que les intégrations correspondantes ne sont pas contractualisées.",
    ],
  },
];

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#f9f9f7]">
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
            <Lock className="h-4 w-4" />
            Protection des données
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
            Politique de confidentialité
          </h1>
          <p className="text-white/50 mt-3 text-sm leading-relaxed max-w-xl">
            Comment vos données sont collectées, utilisées et protégées. Version de
            démonstration, à valider juridiquement avant tout déploiement réel.
          </p>
        </div>
      </header>

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
              Vos préférences de communication (notifications, email, SMS) sont gérées depuis
              l&apos;espace Paramètres. Les communications contractuelles obligatoires ne peuvent
              pas être désactivées.
            </p>
          </div>

          <div className="mt-6">
            <Link href="/cgu" className="text-sm text-[#507300] font-medium hover:underline underline-offset-2">
              Conditions générales d&apos;utilisation
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
