// ============================================================================
// CONFIGURATION PAR PAYS — Afrique de l'Ouest
// ============================================================================
// Ne pas traiter toute l'Afrique de l'Ouest comme un seul régime.
// Chaque pays a sa propre config : instruments, devises, paiements, limites.
// ============================================================================

export interface CountryConfig {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  nameEn: string;
  currency: string; // XOF, GHS, NGN
  currencyDisplay: string; // FCFA, GH₵, ₦
  phonePrefix: string; // +221
  // Instruments disponibles
  debtAllowed: boolean;
  equityAllowed: boolean;
  // Visibilité des offres
  visibilityMode: "public" | "restricted" | "whitelist";
  // Paiements
  mobileMoneyProviders: string[]; // vides si pas encore validé
  bankTransferAllowed: boolean;
  diasporaAccess: "pending" | "validated" | "blocked"; // nécessite validation spécifique
  // Justificatifs acceptés (différents par pays)
  acceptedIdDocuments: string[];
  companyRegistryName: string; // RCCM, RCC, etc.
  // Limites
  minInvestmentXOF: bigint;
  maxInvestmentPerOfferXOF: bigint | null; // null = pas de plafond
  // Fiscalité
  withholdingTaxOnInterestPct: number; // retenue à la source
  // Délais
  reflectionPeriodDays: number; // délai de rétractation
  // Contrats / mentions
  requiredMentions: string[];
  // Statut opérationnel
  operationalStatus: "active" | "demo" | "coming_soon";
  // Prestataire de paiement partenaire (validé contractuellement ou non)
  paymentPartner: string | null; // null si pas encore de partenaire validé
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "SN",
    name: "Sénégal",
    nameEn: "Senegal",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+221",
    debtAllowed: true,
    equityAllowed: true,
    visibilityMode: "public",
    mobileMoneyProviders: ["Wave", "Orange Money"], // à valider contractuellement
    bankTransferAllowed: true,
    diasporaAccess: "pending",
    acceptedIdDocuments: ["CNI", "Passeport", "Carte consulaire"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: 5_000_000n,
    withholdingTaxOnInterestPct: 0, // à valider
    reflectionPeriodDays: 14,
    requiredMentions: [
      "Risque de perte en capital",
      "Information BCEAO — PSI",
      "Délai de rétractation 14 jours",
    ],
    operationalStatus: "demo",
    paymentPartner: null, // ⚠️ Prestataire à contractualiser
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    nameEn: "Côte d'Ivoire",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+225",
    debtAllowed: true,
    equityAllowed: true,
    visibilityMode: "public",
    mobileMoneyProviders: ["Orange Money", "MTN Money", "Moov Money"],
    bankTransferAllowed: true,
    diasporaAccess: "pending",
    acceptedIdDocuments: ["CNI", "Passeport", "Attestation d'identité"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: 5_000_000n,
    withholdingTaxOnInterestPct: 18, // IRCM
    reflectionPeriodDays: 7,
    requiredMentions: [
      "Risque de perte en capital",
      "Conformité CRE/CRC",
    ],
    operationalStatus: "demo",
    paymentPartner: null,
  },
  {
    code: "ML",
    name: "Mali",
    nameEn: "Mali",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+223",
    debtAllowed: true,
    equityAllowed: false, // en attente de validation
    visibilityMode: "restricted",
    mobileMoneyProviders: ["Orange Money", "Moov Money"],
    bankTransferAllowed: true,
    diasporaAccess: "blocked",
    acceptedIdDocuments: ["CNI", "Passeport", "Nina"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "demo",
    paymentPartner: null,
  },
  {
    code: "BF",
    name: "Burkina Faso",
    nameEn: "Burkina Faso",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+226",
    debtAllowed: true,
    equityAllowed: false,
    visibilityMode: "public",
    mobileMoneyProviders: ["Orange Money", "Moov Money"],
    bankTransferAllowed: true,
    diasporaAccess: "pending",
    acceptedIdDocuments: ["CNI", "Passeport", "Biometrique"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "demo",
    paymentPartner: null,
  },
  {
    code: "TG",
    name: "Togo",
    nameEn: "Togo",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+228",
    debtAllowed: true,
    equityAllowed: false,
    visibilityMode: "public",
    mobileMoneyProviders: ["Moov Money", "TMoney"],
    bankTransferAllowed: true,
    diasporaAccess: "pending",
    acceptedIdDocuments: ["CNI", "Passeport", "Carte d'électeur"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "demo",
    paymentPartner: null,
  },
  {
    code: "BJ",
    name: "Bénin",
    nameEn: "Benin",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+229",
    debtAllowed: true,
    equityAllowed: false,
    visibilityMode: "public",
    mobileMoneyProviders: ["MTN Money", "Moov Money"],
    bankTransferAllowed: true,
    diasporaAccess: "pending",
    acceptedIdDocuments: ["CNI", "Passeport"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "demo",
    paymentPartner: null,
  },
  {
    code: "NE",
    name: "Niger",
    nameEn: "Niger",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+227",
    debtAllowed: false, // en attente
    equityAllowed: false,
    visibilityMode: "whitelist",
    mobileMoneyProviders: [],
    bankTransferAllowed: true,
    diasporaAccess: "blocked",
    acceptedIdDocuments: ["CNI", "Passeport"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "coming_soon",
    paymentPartner: null,
  },
  {
    code: "GW",
    name: "Guinée-Bissau",
    nameEn: "Guinea-Bissau",
    currency: "XOF",
    currencyDisplay: "FCFA",
    phonePrefix: "+245",
    debtAllowed: false,
    equityAllowed: false,
    visibilityMode: "whitelist",
    mobileMoneyProviders: [],
    bankTransferAllowed: true,
    diasporaAccess: "blocked",
    acceptedIdDocuments: ["BI", "Passeport"],
    companyRegistryName: "RCCM",
    minInvestmentXOF: 10_000n,
    maxInvestmentPerOfferXOF: null,
    withholdingTaxOnInterestPct: 0,
    reflectionPeriodDays: 14,
    requiredMentions: ["Risque de perte en capital"],
    operationalStatus: "coming_soon",
    paymentPartner: null,
  },
];

export function getCountry(code: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export const SECTORS = [
  "Immobilier",
  "Industrie",
  "Agriculture",
  "Commerce",
  "Transport",
  "Énergie",
  "Technologie",
  "Services",
] as const;

export type Sector = (typeof SECTORS)[number];

const SECTOR_LABELS_EN: Record<string, string> = {
  Immobilier: "Real estate",
  Industrie: "Industry",
  Agriculture: "Agriculture",
  Commerce: "Trade",
  Transport: "Transport",
  Énergie: "Energy",
  Technologie: "Technology",
  Services: "Services",
};

export function getSectorLabel(sector: string, locale: "fr" | "en"): string {
  return locale === "en" ? SECTOR_LABELS_EN[sector] ?? sector : sector;
}

export function getCountryLabel(code: string, locale: "fr" | "en"): string {
  const country = getCountry(code);
  if (!country) return code;
  return locale === "en" ? country.nameEn : country.name;
}
