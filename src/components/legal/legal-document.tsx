"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LEGAL_VERSIONS, REGULATORY_SOURCES } from "@/lib/legal";
import { useAppStore } from "@/lib/store";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Handshake,
  Database,
  FileCheck2,
  Fingerprint,
  Globe2,
  ScrollText,
  LockKeyhole,
  Scale,
  ShieldAlert,
  UserCheck,
  WalletCards,
} from "lucide-react";

export type LegalDocumentKind = "terms" | "privacy" | "compliance";

type Section = { title: string; body: string; bullets?: string[] };

const COPY = {
  fr: {
    back: "Retour à la plateforme",
    nav: { terms: "Conditions", privacy: "Confidentialité", compliance: "Cadre réglementaire" },
    updated: "Version du 24 septembre 2026",
    notice: "Document de travail pré-lancement",
    noticeText: "La plateforme n’affirme pas disposer d’un agrément. L’ouverture d’une offre réelle reste conditionnée à sa qualification juridique, aux validations requises et à la contractualisation avec des prestataires autorisés.",
    terms: {
      kicker: "Relation contractuelle",
      title: "Des règles simples, lisibles avant chaque engagement.",
      intro: "Ces conditions décrivent le fonctionnement prévu du service. Les conditions particulières de chaque offre, le bulletin de souscription et les documents sociaux priment pour l’opération concernée.",
      sections: [
        { title: "1. Accès et éligibilité", body: "L’accès investisseur est réservé aux personnes majeures capables d’agir pour leur propre compte. Une entreprise doit être valablement constituée, représentée et fournir des informations exactes.", bullets: ["Compte individuel et non cessible", "Vérification d’identité avant investissement ou retrait", "Contrôles renforcés selon le niveau de risque"] },
        { title: "2. Sélection des dossiers", body: "Une analyse réduit l’asymétrie d’information mais ne constitue ni une garantie, ni un conseil personnalisé, ni une promesse de rendement.", bullets: ["Examen de l’entreprise, de ses dirigeants et de son financement", "Conditions finales figées dans une version publiée", "Rejet ou demande de complément possible à tout moment avant publication"] },
        { title: "3. Souscription et paiement", body: "Une intention de souscrire ne devient un investissement confirmé qu’après acceptation des documents, signature, réception irrévocable du paiement et contrôles applicables.", bullets: ["Règlement en XOF par carte ou Mobile Money via un prestataire autorisé", "Aucun numéro de carte n’est conservé par la plateforme", "Annulation, échec ou remboursement tracé dans le portefeuille"] },
        { title: "4. Dette, actions et droits", body: "Une dette donne droit aux paiements contractuels sous réserve de la capacité de remboursement. Une action confère les droits prévus par les statuts, le pacte et la décision sociale concernée.", bullets: ["Aucune liquidité, revente rapide ou distribution de dividende n’est garantie", "Chaque dividende exige une décision sociale, une date de référence et les contrôles applicables", "Les montants nets sont répartis selon les titres inscrits et la retenue fiscale déclarée", "Les titres restent inscrits et administrés selon les actes sociaux applicables"] },
        { title: "5. Portefeuille et versements", body: "Le portefeuille est un registre des créances et mouvements dus à l’utilisateur ; il ne doit pas être présenté comme un compte bancaire. Les fonds doivent rester chez les partenaires financiers habilités jusqu’à leur affectation.", bullets: ["Grand livre à partie double et réconciliation", "Versement uniquement vers un bénéficiaire vérifié", "Blocage possible en cas d’anomalie, fraude ou obligation réglementaire"] },
        { title: "6. Réclamations et responsabilité", body: "L’utilisateur doit signaler rapidement toute erreur. La plateforme répond de ses obligations de service, sans couvrir les pertes économiques propres à l’entreprise financée ni les événements hors de son contrôle raisonnable.", bullets: ["Réclamation documentée à contact@nexora.capital", "Conservation des preuves et journaux d’opération", "Droit applicable précisé dans les documents contractuels définitifs"] },
      ] as Section[],
    },
    privacy: {
      kicker: "Protection des données",
      title: "Les données utiles seulement, protégées par conception.",
      intro: "Cette politique présente les traitements prévus. Elle devra être complétée par les formalités nationales applicables et les coordonnées du responsable définitif avant lancement commercial.",
      sections: [
        { title: "1. Données collectées", body: "Identité, coordonnées, pays, informations professionnelles, données KYC, dossiers d’entreprise, contrats, paiements et journaux de sécurité.", bullets: ["Le numéro complet de pièce n’est pas conservé en clair dans la base applicative", "Les documents sont stockés dans un coffre privé", "Les données de carte sont traitées par le prestataire de paiement"] },
        { title: "2. Finalités", body: "Création du compte, vérification, analyse des offres, exécution des contrats, tenue du registre financier, lutte contre la fraude, respect des obligations légales et assistance.", bullets: ["Aucune revente de données personnelles", "Marketing uniquement sur consentement distinct", "Accès interne limité au besoin d’en connaître"] },
        { title: "3. Partage et sous-traitants", body: "Les données peuvent être transmises aux prestataires autorisés de paiement, vérification, signature, hébergement, audit et conseil, ainsi qu’aux autorités lorsque la loi l’exige.", bullets: ["Contrats de confidentialité et de traitement", "Pas de document KYC accessible publiquement", "Traçage des consultations sensibles"] },
        { title: "4. Sécurité", body: "Chiffrement en transit, cookies de session inaccessibles aux scripts, contrôles de rôle, journal d’audit, validation à quatre yeux et sauvegardes contrôlées.", bullets: ["Principe du moindre privilège", "Contrôles d’intégrité sur les documents", "Aucun secret de paiement stocké dans le navigateur"] },
        { title: "5. Conservation", body: "Les durées seront fixées selon la relation contractuelle, les prescriptions et les obligations de connaissance client, de comptabilité et de lutte contre le blanchiment.", bullets: ["Suppression ou anonymisation à l’issue des durées applicables", "Gel possible en cas de contentieux ou demande d’une autorité", "Versions remplacées des documents rendues inactives"] },
        { title: "6. Vos droits", body: "Selon la législation nationale applicable, vous pouvez demander l’accès, la rectification, la limitation, l’opposition ou la suppression lorsqu’elle n’entre pas en conflit avec une obligation légale.", bullets: ["Demande à contact@nexora.capital", "Vérification de l’identité du demandeur", "Possibilité de saisir l’autorité nationale de protection des données"] },
      ] as Section[],
    },
    compliance: {
      kicker: "Périmètre réglementaire",
      title: "Innover sans contourner la protection de l’épargne.",
      intro: "Le caractère non coté ou privé d’une opération ne la soustrait pas automatiquement aux règles du marché financier. Chaque montage doit être qualifié avant publication.",
      sections: [
        { title: "AMF‑UMOA · titres et appel public", body: "L’AMF‑UMOA organise et contrôle l’appel public à l’épargne et les intervenants du marché financier régional. Une diffusion large de titres peut relever de son contrôle même hors BRVM.", bullets: ["Qualification juridique et seuils de diffusion par offre", "Visa, autorisation, placement encadré ou restriction d’accès selon le cas", "Information loyale, complète et non trompeuse des investisseurs"] },
        { title: "OHADA · droit des sociétés", body: "L’AUSCGIE gouverne la constitution, les augmentations de capital, les valeurs mobilières, la gouvernance et les droits des associés. La forme sociale doit être compatible avec l’opération.", bullets: ["Décisions sociales et formalités valides", "Statuts et pactes cohérents avec les droits affichés", "La SAS ne doit pas être utilisée pour contourner l’interdiction d’appel public à l’épargne"] },
        { title: "BCEAO · paiements", body: "L’encaissement, le cantonnement et le versement doivent être confiés à des prestataires autorisés. La plateforme ne doit ni émettre de monnaie électronique ni détenir des fonds comme un établissement financier sans habilitation.", bullets: ["Carte et Mobile Money via un partenaire agréé", "Réconciliation et idempotence des notifications de paiement", "Comptes de collecte séparés et bénéficiaires vérifiés"] },
        { title: "LCB‑FT · connaissance client", body: "Le dispositif prévoit l’identification, l’origine des fonds, les personnes politiquement exposées, la surveillance des opérations et l’escalade des alertes.", bullets: ["Approche par les risques", "Revue renforcée et validation à quatre yeux", "Conservation des preuves et signalements selon le cadre applicable"] },
        { title: "Protection de l’investisseur", body: "Les performances projetées ne sont pas garanties. Les frais, conflits d’intérêts, risques, droits, dilution, liquidité et scénarios de défaut doivent être exposés avant signature.", bullets: ["Montants minimum et maximum adaptés", "Délai de réflexion lorsque le cadre contractuel le prévoit", "Aucun langage assimilable à une garantie de rendement"] },
        { title: "Conditions de lancement", body: "Le passage d’un pilote technique à une commercialisation exige une validation formelle du périmètre par des conseils qualifiés et les autorités compétentes.", bullets: ["Avis juridique par pays et par instrument", "Échanges AMF‑UMOA et BCEAO/BCSF selon le périmètre", "Contrats PSP, séquestre/cantonnement, assurance et procédures de réclamation", "Tests de sécurité, continuité et audit financier avant fonds réels"] },
      ] as Section[],
    },
    sources: "Sources officielles",
    sourceNote: "Ces liens permettent de consulter les textes et travaux des institutions. Ils ne constituent pas une validation de la plateforme.",
  },
  en: {
    back: "Back to the platform",
    nav: { terms: "Terms", privacy: "Privacy", compliance: "Regulatory framework" },
    updated: "Version dated 24 September 2026",
    notice: "Pre-launch working document",
    noticeText: "The platform does not claim to be licensed. Opening a live offer remains subject to legal classification, required regulatory clearances and contracts with authorized providers.",
    terms: {
      kicker: "Contractual relationship",
      title: "Clear rules, visible before every commitment.",
      intro: "These terms describe the intended service. Each offer’s specific terms, subscription form and corporate documents prevail for that transaction.",
      sections: [
        { title: "1. Access and eligibility", body: "Investor access is limited to adults able to act on their own behalf. A company must be validly incorporated and represented, and provide accurate information.", bullets: ["Personal, non-transferable account", "Identity verification before investing or receiving payouts", "Enhanced checks based on risk"] },
        { title: "2. Application selection", body: "Review reduces information asymmetry but is not a guarantee, personalized advice or a promise of return.", bullets: ["Review of the company, management and financing", "Final terms frozen in a published version", "Rejection or additional information request possible before publication"] },
        { title: "3. Subscription and payment", body: "An intention becomes a confirmed investment only after document acceptance, signature, irrevocable payment receipt and applicable checks.", bullets: ["XOF settlement by card or Mobile Money through an authorized provider", "The platform never stores card numbers", "Cancellations, failures and refunds appear in the portfolio"] },
        { title: "4. Debt, equity and rights", body: "Debt grants contractual payment rights subject to repayment capacity. Equity grants rights defined by the articles, shareholders’ agreement and relevant corporate resolution.", bullets: ["No guaranteed liquidity, quick resale or dividend distribution", "Each dividend requires a corporate resolution, a record date and applicable reviews", "Net amounts are allocated from registered holdings and the declared withholding", "Securities are administered under the applicable corporate instruments"] },
        { title: "5. Portfolio and payouts", body: "The portfolio is a record of claims and movements due to the user; it is not a bank account. Funds must remain with authorized financial partners until allocated.", bullets: ["Double-entry ledger and reconciliation", "Payouts only to verified beneficiaries", "Holds permitted for anomalies, fraud or regulatory duties"] },
        { title: "6. Complaints and liability", body: "Users must promptly report errors. The platform remains responsible for its service obligations, but does not cover the financed company’s economic losses or events beyond reasonable control.", bullets: ["Documented complaint to contact@nexora.capital", "Preservation of evidence and transaction logs", "Governing law stated in final contractual documents"] },
      ] as Section[],
    },
    privacy: {
      kicker: "Data protection",
      title: "Only useful data, protected by design.",
      intro: "This policy describes intended processing. It must be completed with applicable national filings and final controller details before commercial launch.",
      sections: [
        { title: "1. Data collected", body: "Identity, contact, country, professional and KYC information, company applications, contracts, payments and security logs.", bullets: ["The full identity number is not kept in clear text in the application database", "Documents remain in private storage", "Card data is processed by the payment provider"] },
        { title: "2. Purposes", body: "Account creation, verification, offer review, contract performance, financial records, fraud prevention, legal compliance and support.", bullets: ["No sale of personal data", "Marketing only with separate consent", "Internal access limited to need-to-know"] },
        { title: "3. Sharing and processors", body: "Data may be shared with authorized payment, verification, signature, hosting, audit and advisory providers, and authorities where legally required.", bullets: ["Confidentiality and processing contracts", "No public KYC document", "Sensitive access is logged"] },
        { title: "4. Security", body: "Encryption in transit, script-inaccessible session cookies, role controls, audit logs, four-eyes approval and controlled backups.", bullets: ["Least privilege", "Document integrity checks", "No payment secret stored in the browser"] },
        { title: "5. Retention", body: "Retention periods will follow the contract, limitation periods, know-your-customer, accounting and anti-money-laundering requirements.", bullets: ["Deletion or anonymization after applicable periods", "Legal holds for disputes or authority requests", "Replaced document versions become inactive"] },
        { title: "6. Your rights", body: "Under applicable national law, you may request access, correction, restriction, objection or deletion where this does not conflict with legal duties.", bullets: ["Request via contact@nexora.capital", "Identity verification of the requester", "Right to contact the national data-protection authority"] },
      ] as Section[],
    },
    compliance: {
      kicker: "Regulatory perimeter",
      title: "Innovate without bypassing saver protection.",
      intro: "An unlisted or private label does not automatically remove a transaction from financial-market rules. Every structure must be classified before publication.",
      sections: [
        { title: "AMF‑UMOA · securities and public offerings", body: "AMF‑UMOA organizes and supervises public offerings and regional financial-market participants. Broad securities distribution may fall under its oversight even outside the BRVM.", bullets: ["Legal classification and distribution thresholds per offer", "Approval, authorization, controlled placement or access restrictions as applicable", "Fair, complete and non-misleading investor information"] },
        { title: "OHADA · company law", body: "AUSCGIE governs incorporation, capital increases, securities, governance and shareholder rights. The legal form must fit the transaction.", bullets: ["Valid resolutions and formalities", "Articles and agreements consistent with displayed rights", "A SAS must not be used to circumvent the ban on public offerings"] },
        { title: "BCEAO · payments", body: "Collection, safeguarding and payouts must be entrusted to authorized providers. The platform must not issue e-money or hold funds as a financial institution without authorization.", bullets: ["Card and Mobile Money through a licensed partner", "Reconciliation and idempotent payment notifications", "Segregated collection and verified beneficiaries"] },
        { title: "AML/CFT · customer due diligence", body: "The framework covers identification, source of funds, politically exposed persons, transaction monitoring and escalation.", bullets: ["Risk-based approach", "Enhanced review and four-eyes decisions", "Evidence retention and reporting under the applicable framework"] },
        { title: "Investor protection", body: "Projected performance is not guaranteed. Fees, conflicts, risks, rights, dilution, liquidity and default scenarios must be disclosed before signature.", bullets: ["Appropriate minimum and maximum amounts", "Reflection period where provided contractually", "No language implying guaranteed returns"] },
        { title: "Launch conditions", body: "Moving from a technical pilot to commercialization requires formal perimeter validation by qualified counsel and competent authorities.", bullets: ["Country- and instrument-specific legal opinions", "AMF‑UMOA and BCEAO/BCSF engagement according to scope", "PSP, safeguarding, insurance and complaint-handling contracts", "Security, continuity and financial audits before real funds"] },
      ] as Section[],
    },
    sources: "Official sources",
    sourceNote: "These links provide access to institutional texts and studies. They are not an endorsement of the platform.",
  },
} as const;

const SECTION_ICONS = [UserCheck, FileCheck2, WalletCards, Handshake, Database, ShieldAlert];

export function LegalDocument({ document }: { document: LegalDocumentKind }) {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const hydratePreferences = useAppStore((state) => state.hydratePreferences);
  useEffect(() => hydratePreferences(), [hydratePreferences]);
  const copy = COPY[locale];
  const content = copy[document];
  const version = document === "terms" ? LEGAL_VERSIONS.terms : document === "privacy" ? LEGAL_VERSIONS.privacy : LEGAL_VERSIONS.risk;

  useEffect(() => {
    window.document.documentElement.lang = locale;
    window.document.title = `${content.title} — NEXORA Capital`;
  }, [content.title, locale]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(84,18,73,.08),transparent_34%),#FCFBFC] text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#541249]/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7B286D]/18">
            <Image src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
            <span><span className="block text-sm font-black tracking-tight">NEXORA</span><span className="block text-[9px] font-bold uppercase tracking-[.18em] text-[#6C195E]">{locale === "fr" ? "Capital privé" : "Private capital"}</span></span>
          </Link>
          <button type="button" onClick={() => setLocale(locale === "fr" ? "en" : "fr")} className="rounded-xl border border-[#541249]/15 bg-white px-3 py-2 text-xs font-bold text-[#541249] shadow-sm hover:bg-[#F7EAF5]">
            {locale === "fr" ? "English" : "Français"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#541249] hover:underline"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>

        <nav className="mt-6 flex snap-x gap-2 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={locale === "fr" ? "Documents légaux" : "Legal documents"}>
          {(["terms", "privacy", "compliance"] as LegalDocumentKind[]).map((kind) => (
            <Button key={kind} asChild variant={document === kind ? "default" : "outline"} size="sm" className="snap-start">
              <Link href={`/legal/${kind}`}>{copy.nav[kind]}</Link>
            </Button>
          ))}
        </nav>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#541249]/15 bg-[linear-gradient(135deg,#541249_0%,#2F0929_60%,#130410_100%)] px-5 py-8 text-white shadow-[0_28px_70px_rgba(56,12,49,.20)] sm:px-10 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#E6BEDF]">{content.kicker}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-.045em] sm:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">{content.intro}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/70"><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">{copy.updated}</span><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">v{version}</span></div>
        </section>

        <section className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div><h2 className="text-sm font-extrabold">{copy.notice}</h2><p className="mt-1 text-sm leading-6 text-amber-900/85">{copy.noticeText}</p></div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {content.sections.map((section, index) => {
            const Icon = SECTION_ICONS[index] ?? Scale;
            return (
              <article key={section.title} className="rounded-2xl border border-border/80 bg-white/85 p-5 shadow-[0_12px_35px_rgba(56,12,49,.055)] sm:p-6">
                <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5EAF3] text-[#541249]"><Icon className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold tracking-tight">{section.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p></div></div>
                {section.bullets ? <ul className="mt-4 space-y-2 border-t border-border/70 pt-4">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-sm leading-6 text-foreground/80"><span aria-hidden className="mt-[.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B286D]" /><span>{bullet}</span></li>)}</ul> : null}
              </article>
            );
          })}
        </div>

        {document === "compliance" ? <OfficialSources locale={locale} /> : null}
      </main>

      <footer className="border-t border-[#541249]/10 bg-white/75 px-4 py-7 text-center text-xs text-muted-foreground">
        © 2026 NEXORA Capital · {copy.updated}
      </footer>
    </div>
  );
}

function OfficialSources({ locale }: { locale: "fr" | "en" }) {
  const copy = COPY[locale];
  const sources = [
    { icon: ScrollText, label: "AMF‑UMOA", detail: locale === "fr" ? "Convention et règlement du marché" : "Market convention and regulation", href: REGULATORY_SOURCES.amfFramework },
    { icon: Globe2, label: "AMF‑UMOA", detail: locale === "fr" ? "Note sectorielle sur le financement participatif" : "Sector note on crowdfunding", href: REGULATORY_SOURCES.amfCrowdfunding },
    { icon: Banknote, label: "BCEAO", detail: locale === "fr" ? "FinTech et cadre de supervision" : "FinTech and supervisory framework", href: REGULATORY_SOURCES.bceaoFintech },
    { icon: WalletCards, label: "BCEAO", detail: locale === "fr" ? "Instruction relative aux services de paiement" : "Payment services instruction", href: REGULATORY_SOURCES.bceaoPayments },
    { icon: Scale, label: "OHADA", detail: locale === "fr" ? "Droit des sociétés commerciales" : "Company law", href: REGULATORY_SOURCES.ohadaCompanies },
    { icon: Fingerprint, label: "AMF‑UMOA", detail: locale === "fr" ? "Instruction LCB‑FT révisée" : "Revised AML/CFT instruction", href: REGULATORY_SOURCES.amfAml },
  ];
  return (
    <section className="mt-10 border-t border-[#541249]/12 pt-8">
      <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-[#541249]" /><h2 className="text-xl font-black tracking-tight">{copy.sources}</h2></div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.sourceNote}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map(({ icon: Icon, label, detail, href }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#541249]/35 hover:shadow-[0_12px_28px_rgba(56,12,49,.08)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5EAF3] text-[#541249]"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span></span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#541249]" />
          </a>
        ))}
      </div>
    </section>
  );
}
