"use client";

import { useCallback, useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { simulateDebtFinancing } from "@/lib/finance";
import { formatDisplayMoney } from "@/lib/display-money";
import { SECTORS, COUNTRIES, getCountryLabel, getSectorLabel } from "@/lib/countries";
import { toast } from "@/hooks/use-toast";
import { CompanyOnboarding } from "@/components/company/company-onboarding";
import {
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  FileText,
  Target,
  UsersRound,
  ChartNoAxesCombined,
  HandCoins,
  ClipboardCheck,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  CalendarDays,
  WalletCards,
  ImagePlus,
  FileUp,
  FileCheck2,
  Eye,
  FolderUp,
  Images,
  Files,
  Globe2,
} from "lucide-react";

interface Membership {
  id: string;
  role: string;
  mandate: string;
  company: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    legalForm: string;
    country: string;
    activity: string;
    verificationStatus: string;
  };
}

interface MeResponse {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  memberships: Membership[];
}

interface TeamMemberState {
  id: string;
  fullName: string;
  role: string;
  experience: string;
}

interface FundItemState {
  id: string;
  label: string;
  amount: string;
}

interface MilestoneState {
  id: string;
  title: string;
  targetDate: string;
  outcome: string;
}

interface DocumentChecklistState {
  registrationDocument: boolean;
  financialStatements: boolean;
  bankStatements: boolean;
  businessPlan: boolean;
  taxDocument: boolean;
}

type InstrumentType = "debt" | "equity";
type RatePeriod = "total" | "annual";
type RepaymentType = "bullet" | "amortized";

interface FormState {
  companyId: string;
  title: string;
  description: string;
  longDescription: string;
  sector: string;
  country: string;
  city: string;
  imageUrl: string;
  businessModel: string;
  marketOverview: string;
  competitiveAdvantage: string;
  traction: string;
  managementTeam: TeamMemberState[];
  employeeCount: string;
  financialYear: string;
  annualRevenue: string;
  previousRevenue: string;
  netIncome: string;
  cashBalance: string;
  existingDebt: string;
  annualOperatingExpenses: string;
  instrumentType: InstrumentType;
  fundingGoal: string;
  companyContribution: string;
  annualRate: string;
  ratePeriod: RatePeriod;
  durationMonths: string;
  repaymentType: RepaymentType;
  minInvestment: string;
  maxInvestment: string;
  equityOfferedPct: string;
  valuationPre: string;
  fundingPurpose: string;
  useOfFunds: FundItemState[];
  milestones: MilestoneState[];
  repaymentSource: string;
  guaranteeDescription: string;
  shareholderStructure: string;
  risksIdentified: string;
  impactObjectives: string;
  documentChecklist: DocumentChecklistState;
  declarationAccepted: boolean;
}

interface ProjectRecord extends Partial<Omit<FormState, "managementTeam" | "useOfFunds" | "milestones" | "documentChecklist">> {
  id: string;
  status: string;
  updatedAt: string;
  companyId: string;
  managementTeam?: Array<Omit<TeamMemberState, "id">>;
  useOfFunds?: Array<{ label: string; amount: number }>;
  milestones?: Array<Omit<MilestoneState, "id">>;
  documentChecklist?: Partial<DocumentChecklistState>;
}

interface ProjectDocumentRecord {
  id: string;
  projectId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  contentType: string | null;
  size: number | null;
  isPublic: boolean;
  uploadedAt: string;
}

const STEPS = [
  { id: 1, label: ["Entreprise", "Company"], icon: BadgeCheck },
  { id: 2, label: ["Projet", "Project"], icon: FileText },
  { id: 3, label: ["Marché", "Market"], icon: Target },
  { id: 4, label: ["Équipe & chiffres", "Team & figures"], icon: UsersRound },
  { id: 5, label: ["Financement", "Funding"], icon: ChartNoAxesCombined },
  { id: 6, label: ["Plan d’exécution", "Execution plan"], icon: HandCoins },
  { id: 7, label: ["Dossier & envoi", "Files & submission"], icon: ClipboardCheck },
] as const;

const COPY = {
  fr: {
    signInTitle: "Connectez-vous pour présenter votre projet",
    signIn: "Se connecter",
    title: "Présenter un projet",
    eyebrow: "Dossier de financement",
    subtitle: "Un dossier clair, complet et prêt pour l’analyse.",
    back: "Retour au tableau de bord",
    step: "Étape",
    descriptions: [
      "Choisissez l’entreprise porteuse et reprenez un brouillon si nécessaire.",
      "Présentez le projet, son objectif et son implantation.",
      "Expliquez l’activité, le marché, les clients et les résultats déjà obtenus.",
      "Présentez les responsables clés et les chiffres du dernier exercice.",
      "Définissez le montant recherché et les conditions proposées.",
      "Ventilez les fonds, fixez les étapes et présentez les risques.",
      "Vérifiez le dossier et confirmez les pièces disponibles.",
    ],
    role: "Votre rôle",
    mandate: "Autorisation",
    drafts: "Brouillons à reprendre",
    resume: "Reprendre",
    edited: "Mis à jour",
    noTitle: "Projet sans titre",
    projectTitle: "Nom du projet",
    short: "Résumé en une phrase",
    detailed: "Présentation détaillée",
    sector: "Secteur d’activité",
    country: "Pays",
    city: "Ville",
    select: "Sélectionner",
    projectPlaceholder: "Extension du réseau de distribution à Dakar",
    shortPlaceholder: "Ce que le financement permettra de réaliser.",
    detailedPlaceholder: "Contexte, problème à résoudre, solution proposée, bénéficiaires et résultat attendu.",
    coverPhoto: "Photo de couverture",
    coverHelp: "Une image horizontale nette qui représentera le projet auprès des investisseurs. JPG, PNG ou WebP, 5 Mo maximum.",
    choosePhoto: "Choisir une photo",
    replacePhoto: "Remplacer la photo",
    gallery: "Galerie du projet",
    galleryHelp: "Ajoutez jusqu’à 8 photos concrètes : activité, équipe, site, produits ou réalisations.",
    addPhotos: "Ajouter des photos",
    galleryLimit: "8 photos maximum",
    businessModel: "Comment l’entreprise gagne-t-elle de l’argent ?",
    market: "Marché visé et clients",
    advantage: "Ce qui vous distingue",
    traction: "Résultats déjà obtenus",
    businessPlaceholder: "Produits ou services vendus, prix, fréquence d’achat et canaux de vente.",
    marketPlaceholder: "Profil des clients, taille de la demande, zone couverte et évolution du marché.",
    advantagePlaceholder: "Savoir-faire, réseau, contrats, prix, qualité, rapidité ou technologie.",
    tractionPlaceholder: "Clients actifs, contrats, commandes, croissance, points de vente ou partenariats.",
    team: "Équipe dirigeante",
    addLeader: "Ajouter un responsable",
    fullName: "Nom complet",
    function: "Rôle dans l’entreprise",
    experience: "Expérience utile au projet",
    employees: "Nombre de collaborateurs",
    financialYear: "Dernier exercice clôturé",
    latestRevenue: "Chiffre d’affaires du dernier exercice",
    previousRevenue: "Chiffre d’affaires de l’exercice précédent",
    netIncome: "Résultat net du dernier exercice",
    operatingExpenses: "Dépenses annuelles d’exploitation",
    cash: "Trésorerie disponible",
    debtOutstanding: "Dettes financières en cours",
    figuresNote: "Saisissez 0 lorsqu’un montant est nul. Le résultat net peut être négatif.",
    instrument: "Mode de financement",
    debt: "Financement remboursable",
    debtDesc: "Le capital et la rémunération sont remboursés selon un calendrier.",
    equity: "Ouverture du capital",
    equityDesc: "Les investisseurs deviennent associés de l’entreprise.",
    goal: "Montant recherché",
    minimum: "Souscription minimum",
    contribution: "Apport de l’entreprise",
    rate: "Rémunération proposée (%)",
    ratePeriod: "Application de la rémunération",
    totalPeriod: "Une fois sur toute la durée",
    annual: "Chaque année",
    duration: "Durée en mois",
    repayment: "Rythme de remboursement",
    bullet: "Un paiement à la fin",
    amortized: "Paiements réguliers",
    maximum: "Souscription maximum (facultatif)",
    equityOffered: "Part du capital proposée (%)",
    valuation: "Valeur de l’entreprise avant investissement",
    rateWarning: "Vérifiez la période de rémunération",
    rateExplanation: "Un taux sur toute la durée et un taux annuel ne produisent pas le même montant.",
    purpose: "Objectif précis du financement",
    purposePlaceholder: "Expliquez ce qui sera financé et le changement attendu pour l’entreprise.",
    useTitle: "Utilisation des fonds",
    addUse: "Ajouter un poste",
    expense: "Poste de dépense",
    amount: "Montant",
    allocated: "Réparti",
    remaining: "Reste à répartir",
    exactAllocation: "La somme des postes doit être égale au montant recherché.",
    milestones: "Étapes de réalisation",
    addMilestone: "Ajouter une étape",
    milestone: "Étape",
    targetDate: "Date cible",
    expectedOutcome: "Résultat mesurable attendu",
    repaymentSource: "Source de remboursement",
    guarantee: "Garanties proposées",
    guaranteeHelp: "Décrivez les garanties. S’il n’y en a pas, indiquez-le clairement.",
    shareholders: "Répartition actuelle du capital",
    shareholdersHelp: "Indiquez les principaux associés et leur pourcentage.",
    risks: "Risques et mesures prévues",
    impact: "Retombées attendues (facultatif)",
    risksPlaceholder: "Présentez les risques commerciaux, financiers ou opérationnels, puis les mesures prévues.",
    documents: "Pièces prêtes pour l’analyse",
    documentsIntro: "Déposez les pièces qui permettront à l’équipe d’analyser et de vérifier le projet. PDF, DOCX, XLSX, JPG, PNG ou WebP, 10 Mo maximum par fichier.",
    publicDocuments: "Documents visibles par les visiteurs",
    publicDocumentsHelp: "Après validation, la présentation du projet, les prévisions financières, les agréments et les preuves d’impact pourront être consultés et téléchargés sans compte. Les pièces juridiques, bancaires et fiscales restent privées.",
    registrationDocument: "Document d’immatriculation à jour",
    financialStatements: "États financiers du dernier exercice",
    bankStatements: "Relevés bancaires récents",
    businessPlan: "Plan d’affaires ou prévisions",
    taxDocument: "Justificatif fiscal disponible",
    otherDocument: "Autre justificatif",
    contractDocument: "Contrat ou bon de commande",
    guaranteeDocument: "Justificatif de garantie",
    pitchDeckDocument: "Présentation du projet",
    forecastDocument: "Prévisions financières",
    permitDocument: "Agrément, licence ou autorisation",
    impactDocument: "Preuve d’impact ou certification",
    bulkTitle: "Importer un dossier complet",
    bulkHelp: "Ajoutez plusieurs fichiers en une fois ou sélectionnez un dossier entier. Les sous-dossiers sont conservés dans les noms des fichiers importés.",
    bulkCategory: "Classer ces fichiers dans",
    chooseFiles: "Choisir plusieurs fichiers",
    chooseFolder: "Choisir un dossier",
    importingFiles: "Import en cours",
    importedFiles: "fichiers importés",
    essentialFiles: "pièces indispensables",
    totalFiles: "fichiers au total",
    uploadFile: "Importer",
    replaceFile: "Remplacer",
    viewFile: "Voir",
    fileUploaded: "Pièce ajoutée",
    uploadFailed: "Import impossible",
    deleteFailed: "Suppression impossible",
    preparingDraft: "Préparation du dossier…",
    declaration: "Je confirme que les informations fournies sont exactes, complètes et peuvent être vérifiées.",
    company: "Entreprise porteuse",
    project: "Projet",
    activity: "Activité et marché",
    keyFigures: "Chiffres clés",
    terms: "Conditions proposées",
    plan: "Plan d’utilisation",
    ready: "Dossier prêt à transmettre",
    readyText: "Notre équipe vérifiera les informations et pourra demander des compléments avant toute publication.",
    verificationRequired: "La vérification de l’entreprise doit être terminée avant l’envoi. Le brouillon reste disponible.",
    previous: "Précédent",
    save: "Enregistrer le brouillon",
    saving: "Enregistrement…",
    next: "Continuer",
    submit: "Transmettre pour analyse",
    submitting: "Transmission…",
    incomplete: "Complétez les champs indiqués pour continuer.",
    companyRequired: "Entreprise requise",
    draftFailed: "Brouillon non enregistré",
    draftSaved: "Brouillon enregistré",
    draftSavedText: "Vous pourrez reprendre exactement là où vous vous êtes arrêté.",
    network: "Connexion interrompue",
    submitFailed: "Dossier non transmis",
    submitted: "Dossier transmis",
    submittedText: "Votre dossier complet est maintenant entre les mains de notre équipe.",
    retry: "Veuillez réessayer.",
    months: "mois",
    documentsCount: "pièces confirmées",
    remove: "Supprimer",
  },
  en: {
    signInTitle: "Sign in to present your project",
    signIn: "Sign in",
    title: "Present a project",
    eyebrow: "Funding application",
    subtitle: "A clear, complete application ready for review.",
    back: "Back to dashboard",
    step: "Step",
    descriptions: [
      "Choose the applying company and resume a draft if needed.",
      "Present the project, its purpose and location.",
      "Explain the business, market, customers and results achieved so far.",
      "Present key leaders and figures from the latest financial year.",
      "Set the amount sought and the proposed terms.",
      "Allocate the funds, set milestones and present the risks.",
      "Review the application and confirm the available documents.",
    ],
    role: "Your role",
    mandate: "Permission",
    drafts: "Drafts to resume",
    resume: "Resume",
    edited: "Updated",
    noTitle: "Untitled project",
    projectTitle: "Project name",
    short: "One-sentence summary",
    detailed: "Detailed presentation",
    sector: "Business sector",
    country: "Country",
    city: "City",
    select: "Select",
    projectPlaceholder: "Distribution network expansion in Dakar",
    shortPlaceholder: "What the funding will make possible.",
    detailedPlaceholder: "Context, problem, proposed solution, beneficiaries and expected result.",
    coverPhoto: "Cover photo",
    coverHelp: "A clear horizontal image that will represent the project to investors. JPG, PNG or WebP, up to 5 MB.",
    choosePhoto: "Choose a photo",
    replacePhoto: "Replace photo",
    gallery: "Project gallery",
    galleryHelp: "Add up to 8 real photos showing the activity, team, site, products or achievements.",
    addPhotos: "Add photos",
    galleryLimit: "Up to 8 photos",
    businessModel: "How does the company make money?",
    market: "Target market and customers",
    advantage: "What sets you apart",
    traction: "Results achieved so far",
    businessPlaceholder: "Products or services, pricing, purchase frequency and sales channels.",
    marketPlaceholder: "Customer profile, demand, coverage area and market trends.",
    advantagePlaceholder: "Know-how, network, contracts, pricing, quality, speed or technology.",
    tractionPlaceholder: "Active customers, contracts, orders, growth, outlets or partnerships.",
    team: "Leadership team",
    addLeader: "Add a leader",
    fullName: "Full name",
    function: "Role in the company",
    experience: "Relevant experience",
    employees: "Number of team members",
    financialYear: "Latest closed financial year",
    latestRevenue: "Revenue for the latest year",
    previousRevenue: "Revenue for the previous year",
    netIncome: "Net income for the latest year",
    operatingExpenses: "Annual operating expenses",
    cash: "Available cash",
    debtOutstanding: "Outstanding financial debt",
    figuresNote: "Enter 0 when an amount is zero. Net income may be negative.",
    instrument: "Funding method",
    debt: "Repayable funding",
    debtDesc: "Principal and return are repaid on a schedule.",
    equity: "Company ownership",
    equityDesc: "Investors become company shareholders.",
    goal: "Amount sought",
    minimum: "Minimum investment",
    contribution: "Company contribution",
    rate: "Proposed return (%)",
    ratePeriod: "How the return applies",
    totalPeriod: "Once over the full term",
    annual: "Each year",
    duration: "Duration in months",
    repayment: "Repayment schedule",
    bullet: "One payment at the end",
    amortized: "Regular payments",
    maximum: "Maximum investment (optional)",
    equityOffered: "Company ownership offered (%)",
    valuation: "Company value before investment",
    rateWarning: "Check the return period",
    rateExplanation: "A full-term rate and an annual rate do not produce the same amount.",
    purpose: "Precise funding purpose",
    purposePlaceholder: "Explain what will be funded and the expected change for the company.",
    useTitle: "Use of funds",
    addUse: "Add an item",
    expense: "Expense item",
    amount: "Amount",
    allocated: "Allocated",
    remaining: "Remaining",
    exactAllocation: "The item total must equal the amount sought.",
    milestones: "Delivery milestones",
    addMilestone: "Add a milestone",
    milestone: "Milestone",
    targetDate: "Target date",
    expectedOutcome: "Expected measurable result",
    repaymentSource: "Repayment source",
    guarantee: "Proposed security",
    guaranteeHelp: "Describe the security. If there is none, state this clearly.",
    shareholders: "Current ownership structure",
    shareholdersHelp: "List the main shareholders and their percentages.",
    risks: "Risks and planned measures",
    impact: "Expected impact (optional)",
    risksPlaceholder: "Present commercial, financial or operating risks and the planned measures.",
    documents: "Documents ready for review",
    documentsIntro: "Upload the documents the team needs to review and verify the project. PDF, DOCX, XLSX, JPG, PNG or WebP, up to 10 MB per file.",
    publicDocuments: "Documents visible to visitors",
    publicDocumentsHelp: "Once approved, the project presentation, financial forecasts, permits and impact evidence can be viewed and downloaded without an account. Legal, banking and tax documents remain private.",
    registrationDocument: "Current registration document",
    financialStatements: "Latest financial statements",
    bankStatements: "Recent bank statements",
    businessPlan: "Business plan or forecasts",
    taxDocument: "Tax document available",
    otherDocument: "Other supporting document",
    contractDocument: "Contract or purchase order",
    guaranteeDocument: "Security evidence",
    pitchDeckDocument: "Project presentation",
    forecastDocument: "Financial forecasts",
    permitDocument: "Permit, licence or authorisation",
    impactDocument: "Impact evidence or certification",
    bulkTitle: "Upload a complete folder",
    bulkHelp: "Add several files at once or select a whole folder. Subfolder paths are retained in the uploaded file names.",
    bulkCategory: "File these documents under",
    chooseFiles: "Choose several files",
    chooseFolder: "Choose a folder",
    importingFiles: "Uploading",
    importedFiles: "files uploaded",
    essentialFiles: "essential documents",
    totalFiles: "total files",
    uploadFile: "Upload",
    replaceFile: "Replace",
    viewFile: "View",
    fileUploaded: "Document added",
    uploadFailed: "Upload failed",
    deleteFailed: "Could not remove document",
    preparingDraft: "Preparing application…",
    declaration: "I confirm that the information provided is accurate, complete and may be verified.",
    company: "Applying company",
    project: "Project",
    activity: "Business and market",
    keyFigures: "Key figures",
    terms: "Proposed terms",
    plan: "Use plan",
    ready: "Application ready to submit",
    readyText: "Our team will verify the information and may request additions before publication.",
    verificationRequired: "Company verification must be completed before submission. Your draft remains available.",
    previous: "Previous",
    save: "Save draft",
    saving: "Saving…",
    next: "Continue",
    submit: "Submit for review",
    submitting: "Submitting…",
    incomplete: "Complete the highlighted fields to continue.",
    companyRequired: "Company required",
    draftFailed: "Draft not saved",
    draftSaved: "Draft saved",
    draftSavedText: "You can resume exactly where you stopped.",
    network: "Connection interrupted",
    submitFailed: "Application not submitted",
    submitted: "Application submitted",
    submittedText: "Your complete application is now with our review team.",
    retry: "Please try again.",
    months: "months",
    documentsCount: "documents confirmed",
    remove: "Remove",
  },
} as const;

const EMPTY_DOCUMENTS: DocumentChecklistState = {
  registrationDocument: false,
  financialStatements: false,
  bankStatements: false,
  businessPlan: false,
  taxDocument: false,
};

const DOCUMENT_SLOTS: Array<{
  kind: string;
  checklistKey?: keyof DocumentChecklistState;
  labelKey:
    | "registrationDocument"
    | "financialStatements"
    | "bankStatements"
    | "businessPlan"
    | "taxDocument"
    | "contractDocument"
    | "guaranteeDocument"
    | "pitchDeckDocument"
    | "forecastDocument"
    | "permitDocument"
    | "impactDocument"
    | "otherDocument";
  required?: boolean;
}> = [
  { kind: "registration_document", checklistKey: "registrationDocument", labelKey: "registrationDocument", required: true },
  { kind: "financial_statements", checklistKey: "financialStatements", labelKey: "financialStatements", required: true },
  { kind: "bank_statements", checklistKey: "bankStatements", labelKey: "bankStatements", required: true },
  { kind: "business_plan", checklistKey: "businessPlan", labelKey: "businessPlan", required: true },
  { kind: "tax_document", checklistKey: "taxDocument", labelKey: "taxDocument" },
  { kind: "contract", labelKey: "contractDocument" },
  { kind: "guarantee", labelKey: "guaranteeDocument" },
  { kind: "pitch_deck", labelKey: "pitchDeckDocument" },
  { kind: "financial_forecast", labelKey: "forecastDocument" },
  { kind: "permit_license", labelKey: "permitDocument" },
  { kind: "impact_evidence", labelKey: "impactDocument" },
];

const BULK_DOCUMENT_CATEGORIES = [
  { value: "other", labelKey: "otherDocument" },
  { value: "contract", labelKey: "contractDocument" },
  { value: "guarantee", labelKey: "guaranteeDocument" },
  { value: "pitch_deck", labelKey: "pitchDeckDocument" },
  { value: "financial_forecast", labelKey: "forecastDocument" },
  { value: "permit_license", labelKey: "permitDocument" },
  { value: "impact_evidence", labelKey: "impactDocument" },
] as const;

const DIRECTORY_INPUT_PROPS = {
  webkitdirectory: "",
  directory: "",
} as InputHTMLAttributes<HTMLInputElement>;

function rowId(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function emptyTeam(): TeamMemberState {
  return { id: rowId("team"), fullName: "", role: "", experience: "" };
}

function emptyFund(): FundItemState {
  return { id: rowId("fund"), label: "", amount: "" };
}

function emptyMilestone(): MilestoneState {
  return { id: rowId("milestone"), title: "", targetDate: "", outcome: "" };
}

function initialForm(): FormState {
  return {
    companyId: "",
    title: "",
    description: "",
    longDescription: "",
    sector: "",
    country: "CI",
    city: "",
    imageUrl: "",
    businessModel: "",
    marketOverview: "",
    competitiveAdvantage: "",
    traction: "",
    managementTeam: [emptyTeam()],
    employeeCount: "",
    financialYear: String(new Date().getUTCFullYear() - 1),
    annualRevenue: "",
    previousRevenue: "",
    netIncome: "",
    cashBalance: "",
    existingDebt: "",
    annualOperatingExpenses: "",
    instrumentType: "debt",
    fundingGoal: "",
    companyContribution: "",
    annualRate: "",
    ratePeriod: "annual",
    durationMonths: "",
    repaymentType: "amortized",
    minInvestment: "",
    maxInvestment: "",
    equityOfferedPct: "",
    valuationPre: "",
    fundingPurpose: "",
    useOfFunds: [emptyFund(), emptyFund()],
    milestones: [emptyMilestone(), emptyMilestone()],
    repaymentSource: "",
    guaranteeDescription: "",
    shareholderStructure: "",
    risksIdentified: "",
    impactObjectives: "",
    documentChecklist: { ...EMPTY_DOCUMENTS },
    declarationAccepted: false,
  };
}

function textValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export function CompanySubmit() {
  const setView = useAppStore((state) => state.setView);
  const userEmail = useAppStore((state) => state.userEmail);
  const locale = useAppStore((state) => state.locale);
  const displayCurrency = useAppStore((state) => state.displayCurrency);
  const copy = COPY[locale];
  const localeIndex = locale === "fr" ? 0 : 1;
  const money = (value: bigint | number) => formatDisplayMoney(value, displayCurrency, locale);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [drafts, setDrafts] = useState<ProjectRecord[]>([]);
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => initialForm());
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [removingDocument, setRemovingDocument] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState("other");
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [meResponse, projectResponse] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/projects?mine=true"),
      ]);
      const meData = (await meResponse.json()) as MeResponse;
      const projectData = (await projectResponse.json().catch(() => ({ projects: [] }))) as {
        projects?: ProjectRecord[];
      };
      setMe(meData);
      setDrafts(
        (projectData.projects ?? []).filter((project) =>
          ["draft", "complement_requested"].includes(project.status)
        )
      );
      if (meData.memberships?.length > 0) {
        setForm((current) =>
          current.companyId
            ? current
            : {
                ...current,
                companyId: meData.memberships[0].company.id,
                country: meData.memberships[0].company.country || current.country,
              }
        );
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    void loadWorkspace();
  }, [userEmail, loadWorkspace]);

  const memberships = me?.memberships ?? [];
  const selectedMembership = memberships.find((membership) => membership.company.id === form.companyId);
  const selectedCompany = selectedMembership?.company;
  const companyVerified = selectedCompany?.verificationStatus === "verified";

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (key === "companyId" && value !== form.companyId) {
      setDraftProjectId(null);
      setDocuments([]);
    }
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyDocuments = (items: ProjectDocumentRecord[]) => {
    setDocuments(items);
    const kinds = new Set(items.map((document) => document.type));
    setForm((current) => ({
      ...current,
      imageUrl: items.find((document) => document.type === "cover")?.fileUrl || current.imageUrl,
      documentChecklist: {
        registrationDocument: kinds.has("registration_document"),
        financialStatements: kinds.has("financial_statements"),
        bankStatements: kinds.has("bank_statements"),
        businessPlan: kinds.has("business_plan"),
        taxDocument: kinds.has("tax_document"),
      },
    }));
  };

  const allocatedAmount = useMemo(
    () =>
      form.useOfFunds.reduce((total, item) => {
        const amount = Number(item.amount);
        return total + (Number.isFinite(amount) && amount > 0 ? Math.trunc(amount) : 0);
      }, 0),
    [form.useOfFunds]
  );
  const fundingGoal = Number(form.fundingGoal) || 0;
  const allocationDifference = fundingGoal - allocatedAmount;
  const essentialDocumentsCount = [
    form.documentChecklist.registrationDocument,
    form.documentChecklist.financialStatements,
    form.documentChecklist.bankStatements,
    form.documentChecklist.businessPlan,
  ].filter(Boolean).length;
  const galleryDocuments = documents.filter((document) => document.type === "gallery");
  const primaryDocumentIds = new Set(
    DOCUMENT_SLOTS.map((slot) => documents.find((document) => document.type === slot.kind)?.id).filter(Boolean)
  );
  const additionalDocuments = documents.filter(
    (document) =>
      !["cover", "gallery"].includes(document.type) && !primaryDocumentIds.has(document.id)
  );

  const debtSimulation = useMemo(() => {
    if (form.instrumentType !== "debt") return null;
    const goal = Number(form.fundingGoal);
    const rate = Number(form.annualRate);
    const months = Number(form.durationMonths);
    if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(rate) || !Number.isFinite(months) || months <= 0) {
      return null;
    }
    return simulateDebtFinancing({
      principal: BigInt(Math.trunc(goal)),
      annualRate: rate,
      ratePeriod: form.ratePeriod,
      durationMonths: Math.trunc(months),
      repaymentType: form.repaymentType,
      upfrontCommissionPct: 6,
      annualFollowUpPct: 2,
    });
  }, [form.fundingGoal, form.annualRate, form.durationMonths, form.instrumentType, form.ratePeriod, form.repaymentType]);

  const isStepValid = (candidate: number) => {
    if (candidate === 1) return Boolean(form.companyId);
    if (candidate === 2) {
      return (
        form.title.trim().length >= 3 &&
        form.description.trim().length >= 20 &&
        form.longDescription.trim().length >= 80 &&
        Boolean(form.sector && form.country && form.city.trim())
        && Boolean(form.imageUrl && form.imageUrl !== "/images/project-placeholder.svg")
      );
    }
    if (candidate === 3) {
      return (
        form.businessModel.trim().length >= 40 &&
        form.marketOverview.trim().length >= 40 &&
        form.competitiveAdvantage.trim().length >= 20 &&
        form.traction.trim().length >= 20
      );
    }
    if (candidate === 4) {
      const teamComplete =
        form.managementTeam.length > 0 &&
        form.managementTeam.every(
          (member) =>
            member.fullName.trim().length >= 3 &&
            member.role.trim().length >= 2 &&
            member.experience.trim().length >= 10
        );
      const financialFields = [
        form.employeeCount,
        form.financialYear,
        form.annualRevenue,
        form.previousRevenue,
        form.netIncome,
        form.cashBalance,
        form.existingDebt,
        form.annualOperatingExpenses,
      ];
      return teamComplete && financialFields.every((value) => value !== "" && Number.isFinite(Number(value)));
    }
    if (candidate === 5) {
      const goal = Number(form.fundingGoal);
      const minimum = Number(form.minInvestment);
      const common =
        Number.isFinite(goal) &&
        goal > 0 &&
        Number.isFinite(minimum) &&
        minimum > 0 &&
        minimum <= goal;
      if (!common) return false;
      if (form.instrumentType === "debt") {
        return (
          form.annualRate !== "" &&
          Number(form.annualRate) >= 0 &&
          Number(form.durationMonths) > 0
        );
      }
      return Number(form.equityOfferedPct) > 0 && Number(form.valuationPre) > 0;
    }
    if (candidate === 6) {
      const planComplete =
        form.fundingPurpose.trim().length >= 30 &&
        form.useOfFunds.length >= 2 &&
        form.useOfFunds.every((item) => item.label.trim().length >= 2 && Number(item.amount) > 0) &&
        allocationDifference === 0 &&
        form.milestones.length >= 2 &&
        form.milestones.every(
          (item) => item.title.trim().length >= 3 && Boolean(item.targetDate) && item.outcome.trim().length >= 10
        ) &&
        form.risksIdentified.trim().length >= 30;
      if (!planComplete) return false;
      return form.instrumentType === "debt"
        ? form.repaymentSource.trim().length >= 30 && form.guaranteeDescription.trim().length >= 10
        : form.shareholderStructure.trim().length >= 30;
    }
    return (
      form.documentChecklist.registrationDocument &&
      form.documentChecklist.financialStatements &&
      form.documentChecklist.bankStatements &&
      form.documentChecklist.businessPlan &&
      form.declarationAccepted
    );
  };

  const buildPayload = () => ({
    projectId: draftProjectId,
    companyId: form.companyId,
    title: form.title,
    description: form.description,
    longDescription: form.longDescription,
    sector: form.sector,
    country: form.country,
    city: form.city,
    imageUrl: form.imageUrl || undefined,
    businessModel: form.businessModel,
    marketOverview: form.marketOverview,
    competitiveAdvantage: form.competitiveAdvantage,
    traction: form.traction,
    managementTeam: form.managementTeam.map(({ fullName, role, experience }) => ({ fullName, role, experience })),
    employeeCount: form.employeeCount === "" ? null : Number(form.employeeCount),
    financialYear: form.financialYear === "" ? null : Number(form.financialYear),
    annualRevenue: form.annualRevenue === "" ? null : Number(form.annualRevenue),
    previousRevenue: form.previousRevenue === "" ? null : Number(form.previousRevenue),
    netIncome: form.netIncome === "" ? null : Number(form.netIncome),
    cashBalance: form.cashBalance === "" ? null : Number(form.cashBalance),
    existingDebt: form.existingDebt === "" ? null : Number(form.existingDebt),
    annualOperatingExpenses:
      form.annualOperatingExpenses === "" ? null : Number(form.annualOperatingExpenses),
    instrumentType: form.instrumentType,
    fundingGoal: Math.trunc(Number(form.fundingGoal) || 0),
    companyContribution: Math.trunc(Number(form.companyContribution) || 0),
    annualRate: form.instrumentType === "debt" && form.annualRate !== "" ? Number(form.annualRate) : null,
    ratePeriod: form.instrumentType === "debt" ? form.ratePeriod : null,
    durationMonths: form.instrumentType === "debt" && form.durationMonths !== "" ? Number(form.durationMonths) : null,
    repaymentType: form.instrumentType === "debt" ? form.repaymentType : null,
    equityOfferedPct:
      form.instrumentType === "equity" && form.equityOfferedPct !== ""
        ? Number(form.equityOfferedPct)
        : null,
    valuationPre:
      form.instrumentType === "equity" && form.valuationPre !== "" ? Number(form.valuationPre) : null,
    minInvestment: Math.trunc(Number(form.minInvestment) || 0),
    maxInvestment: form.maxInvestment === "" ? null : Number(form.maxInvestment),
    fundingPurpose: form.fundingPurpose,
    useOfFunds: form.useOfFunds.map((item) => ({ label: item.label, amount: Number(item.amount) || 0 })),
    budgetDetail: form.useOfFunds
      .filter((item) => item.label || item.amount)
      .map((item) => item.label + " : " + (Number(item.amount) || 0))
      .join("\n"),
    milestones: form.milestones.map(({ title, targetDate, outcome }) => ({ title, targetDate, outcome })),
    repaymentSource: form.instrumentType === "debt" ? form.repaymentSource : null,
    guaranteeDescription: form.instrumentType === "debt" ? form.guaranteeDescription : null,
    shareholderStructure: form.instrumentType === "equity" ? form.shareholderStructure : null,
    risksIdentified: form.risksIdentified,
    impactObjectives: form.impactObjectives,
    documentChecklist: form.documentChecklist,
    declarationAccepted: form.declarationAccepted,
  });

  const loadDraft = async (project: ProjectRecord) => {
    const base = initialForm();
    setDraftProjectId(project.id);
    setDocuments([]);
    setForm({
      ...base,
      companyId: project.companyId || base.companyId,
      title: textValue(project.title),
      description: textValue(project.description),
      longDescription: textValue(project.longDescription),
      sector: textValue(project.sector),
      country: textValue(project.country) || base.country,
      city: textValue(project.city),
      imageUrl: textValue(project.imageUrl),
      businessModel: textValue(project.businessModel),
      marketOverview: textValue(project.marketOverview),
      competitiveAdvantage: textValue(project.competitiveAdvantage),
      traction: textValue(project.traction),
      managementTeam:
        project.managementTeam && project.managementTeam.length
          ? project.managementTeam.map((member) => ({ ...member, id: rowId("team") }))
          : [emptyTeam()],
      employeeCount: textValue(project.employeeCount),
      financialYear: textValue(project.financialYear) || base.financialYear,
      annualRevenue: textValue(project.annualRevenue),
      previousRevenue: textValue(project.previousRevenue),
      netIncome: textValue(project.netIncome),
      cashBalance: textValue(project.cashBalance),
      existingDebt: textValue(project.existingDebt),
      annualOperatingExpenses: textValue(project.annualOperatingExpenses),
      instrumentType: project.instrumentType === "equity" ? "equity" : "debt",
      fundingGoal: textValue(project.fundingGoal),
      companyContribution: textValue(project.companyContribution),
      annualRate: textValue(project.annualRate),
      ratePeriod: project.ratePeriod === "total" ? "total" : "annual",
      durationMonths: textValue(project.durationMonths),
      repaymentType: project.repaymentType === "bullet" ? "bullet" : "amortized",
      minInvestment: textValue(project.minInvestment),
      maxInvestment: textValue(project.maxInvestment),
      equityOfferedPct: textValue(project.equityOfferedPct),
      valuationPre: textValue(project.valuationPre),
      fundingPurpose: textValue(project.fundingPurpose),
      useOfFunds:
        project.useOfFunds && project.useOfFunds.length
          ? project.useOfFunds.map((item) => ({ ...item, amount: textValue(item.amount), id: rowId("fund") }))
          : [emptyFund(), emptyFund()],
      milestones:
        project.milestones && project.milestones.length
          ? project.milestones.map((item) => ({ ...item, id: rowId("milestone") }))
          : [emptyMilestone(), emptyMilestone()],
      repaymentSource: textValue(project.repaymentSource),
      guaranteeDescription: textValue(project.guaranteeDescription),
      shareholderStructure: textValue(project.shareholderStructure),
      risksIdentified: textValue(project.risksIdentified),
      impactObjectives: textValue(project.impactObjectives),
      documentChecklist: { ...EMPTY_DOCUMENTS, ...(project.documentChecklist ?? {}) },
      declarationAccepted: Boolean(project.declarationAccepted),
    });
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const response = await fetch("/api/projects/" + project.id + "/documents");
      const body = (await response.json().catch(() => ({ documents: [] }))) as {
        documents?: ProjectDocumentRecord[];
      };
      if (response.ok) applyDocuments(body.documents ?? []);
    } catch {
      // The form remains usable; the user can retry the upload action.
    }
  };

  const saveDraft = async (silent = false): Promise<string | null> => {
    if (!form.companyId) {
      toast({ title: copy.companyRequired, description: copy.incomplete, variant: "destructive" });
      return null;
    }
    setSavingDraft(true);
    try {
      const response = await fetch("/api/projects/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        project?: ProjectRecord;
      };
      if (!response.ok) {
        toast({ title: copy.draftFailed, description: body.error || copy.retry, variant: "destructive" });
        return null;
      }
      if (body.project?.id) {
        setDraftProjectId(body.project.id);
        setDrafts((current) => {
          const rest = current.filter((project) => project.id !== body.project!.id);
          return [body.project!, ...rest];
        });
      }
      if (!silent) toast({ title: copy.draftSaved, description: copy.draftSavedText });
      return body.project?.id ?? draftProjectId;
    } catch {
      toast({ title: copy.network, description: copy.retry, variant: "destructive" });
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft(false);
  };

  const sendProjectFile = async (projectId: string, kind: string, file: File, replace = true) => {
    const data = new FormData();
    data.set("kind", kind);
    data.set("replace", replace ? "1" : "0");
    data.set("file", file, file.webkitRelativePath || file.name);
    const response = await fetch("/api/projects/" + projectId + "/documents", {
      method: "POST",
      body: data,
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      document?: ProjectDocumentRecord;
      coverUrl?: string | null;
    };
    if (!response.ok || !body.document) throw new Error(body.error || copy.retry);
    return { document: body.document, coverUrl: body.coverUrl ?? null };
  };

  const refreshDocuments = async (projectId: string) => {
    const response = await fetch("/api/projects/" + projectId + "/documents");
    const body = (await response.json().catch(() => ({ documents: [] }))) as {
      documents?: ProjectDocumentRecord[];
    };
    if (response.ok) applyDocuments(body.documents ?? []);
  };

  const uploadDocument = async (kind: string, file: File) => {
    setUploadingKind(kind);
    try {
      const projectId = draftProjectId || (await saveDraft(true));
      if (!projectId) return;
      const body = await sendProjectFile(projectId, kind, file);
      const nextDocuments = [
        body.document,
        ...documents.filter(
          (document) => ["gallery", "other"].includes(kind) || document.type !== kind
        ),
      ];
      applyDocuments(nextDocuments);
      if (body.coverUrl) set("imageUrl", body.coverUrl);
      toast({ title: copy.fileUploaded, description: body.document.fileName });
    } catch (error) {
      toast({
        title: copy.uploadFailed,
        description: error instanceof Error ? error.message : copy.retry,
        variant: "destructive",
      });
    } finally {
      setUploadingKind(null);
    }
  };

  const uploadMultipleDocuments = async (kind: string, selectedFiles: FileList | File[]) => {
    const files = Array.from(selectedFiles);
    if (files.length === 0) return;
    setUploadingKind(kind);
    setBulkProgress({ done: 0, total: files.length });
    try {
      const projectId = draftProjectId || (await saveDraft(true));
      if (!projectId) return;
      let completed = 0;
      let lastError = "";
      for (const file of files) {
        try {
          await sendProjectFile(projectId, kind, file, false);
          completed += 1;
        } catch (error) {
          lastError = error instanceof Error ? error.message : copy.retry;
        }
        setBulkProgress({ done: completed, total: files.length });
      }
      await refreshDocuments(projectId);
      if (completed > 0) {
        toast({
          title: copy.fileUploaded,
          description: `${completed}/${files.length} ${copy.importedFiles}`,
        });
      }
      if (completed < files.length) {
        toast({
          title: copy.uploadFailed,
          description: lastError || copy.retry,
          variant: "destructive",
        });
      }
    } finally {
      setUploadingKind(null);
      setBulkProgress(null);
    }
  };

  const deleteDocument = async (document: ProjectDocumentRecord) => {
    setRemovingDocument(document.id);
    try {
      const response = await fetch("/api/projects/documents/" + document.id, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast({ title: copy.deleteFailed, description: body.error || copy.retry, variant: "destructive" });
        return;
      }
      applyDocuments(documents.filter((item) => item.id !== document.id));
      if (document.type === "cover") set("imageUrl", "");
    } catch {
      toast({ title: copy.deleteFailed, description: copy.retry, variant: "destructive" });
    } finally {
      setRemovingDocument(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        toast({
          title: copy.submitFailed,
          description: body.message || body.error || copy.retry,
          variant: "destructive",
        });
        return;
      }
      toast({ title: copy.submitted, description: copy.submittedText });
      setView("company_dashboard");
    } catch {
      toast({ title: copy.network, description: copy.retry, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!userEmail) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="border-[#541249]/10 p-8 shadow-[0_24px_70px_rgba(47,10,41,.1)]">
          <FileText className="mx-auto mb-4 h-10 w-10 text-[#541249]" />
          <h1 className="text-xl font-bold text-foreground">{copy.signInTitle}</h1>
          <Button className="btn-nexora mt-5" onClick={() => setView("login")}>
            {copy.signIn}
          </Button>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-shell max-w-6xl">
        <Skeleton className="mb-5 h-36 rounded-[28px]" />
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Skeleton className="hidden h-[520px] rounded-3xl lg:block" />
          <Skeleton className="h-[620px] rounded-3xl" />
        </div>
      </section>
    );
  }

  if (memberships.length === 0) {
    return (
      <section className="page-shell py-10">
        <CompanyOnboarding onCreated={loadWorkspace} />
      </section>
    );
  }

  const updateTeam = (id: string, field: keyof Omit<TeamMemberState, "id">, value: string) => {
    set("managementTeam", form.managementTeam.map((member) => (member.id === id ? { ...member, [field]: value } : member)));
  };
  const updateFund = (id: string, field: "label" | "amount", value: string) => {
    set("useOfFunds", form.useOfFunds.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };
  const updateMilestone = (id: string, field: keyof Omit<MilestoneState, "id">, value: string) => {
    set("milestones", form.milestones.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };
  const progress = (step / STEPS.length) * 100;
  const currentStep = STEPS[step - 1];
  const CurrentIcon = currentStep.icon;

  return (
    <section className="page-shell private-app-screen private-submit-page max-w-6xl reveal-in">
      <header className="relative mb-5 overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#541249_0%,#380c31_58%,#20081c_100%)] px-5 py-6 text-white shadow-[0_26px_70px_rgba(56,12,49,.24)] sm:px-7 sm:py-7">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/8 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setView("company_dashboard")}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            aria-label={copy.back}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/60">{copy.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{copy.subtitle}</p>
          </div>
          {draftProjectId && (
            <Badge className="hidden border-white/15 bg-white/10 text-white sm:inline-flex">
              {locale === "fr" ? "Brouillon actif" : "Active draft"}
            </Badge>
          )}
        </div>
      </header>

      <div className="mb-4 overflow-x-auto pb-1 xl:hidden">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const active = item.id === step;
            const done = item.id < step && isStepValid(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.id < step || isStepValid(step)) setStep(item.id);
                  }}
                  className={
                    "flex h-11 items-center gap-2 rounded-full border px-3.5 text-sm transition-all " +
                    (active
                      ? "border-[#541249] bg-[#541249] text-white shadow-[0_8px_24px_rgba(84,18,73,.2)]"
                      : done
                        ? "border-[#541249]/15 bg-[#f7edf5] text-[#541249]"
                        : "border-[#541249]/10 bg-white text-muted-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label[localeIndex]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-5 hidden rounded-3xl border border-[#541249]/10 bg-white p-3 shadow-[0_18px_50px_rgba(56,12,49,.07)] xl:block">
          <div className="px-3 pb-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{copy.step} {step}/{STEPS.length}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(progress)} %</span>
            </div>
            <Progress value={progress} className="mt-3 h-1.5" />
          </div>
          <ol className="space-y-1">
            {STEPS.map((item) => {
              const Icon = item.icon;
              const active = item.id === step;
              const done = item.id < step && isStepValid(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id < step || isStepValid(step)) setStep(item.id);
                    }}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all " +
                      (active
                        ? "bg-[#541249] text-white shadow-[0_10px_28px_rgba(84,18,73,.2)]"
                        : done
                          ? "bg-[#f8f0f6] text-[#541249]"
                          : "text-muted-foreground hover:bg-secondary/70")
                    }
                  >
                    <span className={"grid h-8 w-8 place-items-center rounded-xl " + (active ? "bg-white/12" : "bg-white")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{item.label[localeIndex]}</span>
                    {done && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <Card className="overflow-hidden rounded-[28px] border-[#541249]/10 bg-white shadow-[0_22px_65px_rgba(56,12,49,.08)]">
          <div className="border-b border-[#541249]/8 bg-[linear-gradient(180deg,#fff,#fcf9fb)] px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f4e7f1] text-[#541249]">
                <CurrentIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#6c195e]">
                  {copy.step} {step} / {STEPS.length}
                </p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-[-.025em] text-foreground">
                  {currentStep.label[localeIndex]}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.descriptions[step - 1]}</p>
              </div>
            </div>
          </div>

          <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {memberships.map((membership) => {
                    const company = membership.company;
                    const selected = form.companyId === company.id;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          set("companyId", company.id);
                          set("country", company.country || form.country);
                        }}
                        aria-pressed={selected}
                        className={
                          "flex min-h-32 w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all " +
                          (selected
                            ? "border-[#541249]/50 bg-[linear-gradient(145deg,#fbf5fa,#f2e4ef)] shadow-[0_12px_30px_rgba(84,18,73,.1)] ring-2 ring-[#541249]/8"
                            : "border-[#541249]/10 bg-white hover:-translate-y-0.5 hover:border-[#541249]/25 hover:shadow-[0_10px_26px_rgba(56,12,49,.07)]")
                        }
                      >
                        <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-2xl " + (selected ? "bg-[#541249] text-white" : "bg-[#f7eff5] text-[#541249]")}>
                          <BadgeCheck className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">
                            {company.tradeName || company.legalName}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {company.legalForm} · {getCountryLabel(company.country, locale)}
                          </span>
                          <span className="mt-2 block text-xs text-muted-foreground">
                            {copy.role}: {membership.role} · {copy.mandate}: {membership.mandate}
                          </span>
                        </span>
                        {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#541249]" />}
                      </button>
                    );
                  })}
                </div>

                {drafts.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-[#541249]" />
                      <h3 className="text-sm font-semibold text-foreground">{copy.drafts}</h3>
                    </div>
                    <div className="space-y-2">
                      {drafts.slice(0, 4).map((project) => (
                        <div key={project.id} className="flex flex-col gap-3 rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{project.title || copy.noTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {copy.edited} {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(project.updatedAt))}
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void loadDraft(project)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {copy.resume}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <TextField label={copy.projectTitle} value={form.title} onChange={(value) => set("title", value)} placeholder={copy.projectPlaceholder} />
                <TextAreaField label={copy.short} value={form.description} onChange={(value) => set("description", value)} placeholder={copy.shortPlaceholder} rows={2} />
                <TextAreaField label={copy.detailed} value={form.longDescription} onChange={(value) => set("longDescription", value)} placeholder={copy.detailedPlaceholder} rows={6} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{copy.sector}</FieldLabel>
                    <Select value={form.sector} onValueChange={(value) => set("sector", value)}>
                      <SelectTrigger><SelectValue placeholder={copy.select} /></SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((sector) => (
                          <SelectItem key={sector} value={sector}>{getSectorLabel(sector, locale)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>{copy.country}</FieldLabel>
                    <Select value={form.country} onValueChange={(value) => set("country", value)}>
                      <SelectTrigger><SelectValue placeholder={copy.select} /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>{getCountryLabel(country.code, locale)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <TextField label={copy.city} value={form.city} onChange={(value) => set("city", value)} placeholder="Abidjan" />
                <div>
                  <FieldLabel>{copy.coverPhoto}</FieldLabel>
                  <div className="overflow-hidden rounded-2xl border border-[#541249]/10 bg-[#fcfafb]">
                    <div className="relative aspect-[16/7] w-full bg-[linear-gradient(135deg,#f7edf5,#ead7e6)]">
                      {form.imageUrl && form.imageUrl !== "/images/project-placeholder.svg" ? (
                        <Image src={form.imageUrl} alt={form.title || copy.coverPhoto} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-[#541249]/55">
                          <ImagePlus className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{copy.coverHelp}</p>
                      <div className="flex shrink-0 gap-2">
                        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[#541249]/15 bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-[#f8f0f6]">
                          {uploadingKind === "cover" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                          {form.imageUrl && form.imageUrl !== "/images/project-placeholder.svg" ? copy.replacePhoto : copy.choosePhoto}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={uploadingKind !== null}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadDocument("cover", file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {documents.find((document) => document.type === "cover") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive"
                            aria-label={copy.remove}
                            disabled={removingDocument !== null}
                            onClick={() => {
                              const cover = documents.find((document) => document.type === "cover");
                              if (cover) void deleteDocument(cover);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f4e7f1] text-[#541249]">
                        <Images className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{copy.gallery}</h3>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                          {copy.galleryHelp}
                        </p>
                      </div>
                    </div>
                    <label
                      className={
                        "inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#541249]/15 bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-[#f8f0f6] " +
                        (galleryDocuments.length >= 8 || uploadingKind !== null ? "cursor-not-allowed opacity-55" : "cursor-pointer")
                      }
                    >
                      {uploadingKind === "gallery" ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-2 h-4 w-4" />
                      )}
                      {uploadingKind === "gallery" && bulkProgress
                        ? `${bulkProgress.done}/${bulkProgress.total}`
                        : copy.addPhotos}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={galleryDocuments.length >= 8 || uploadingKind !== null}
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []).slice(0, 8 - galleryDocuments.length);
                          if (files.length) void uploadMultipleDocuments("gallery", files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {galleryDocuments.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {galleryDocuments.map((document) => (
                        <div key={document.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#ead7e6]">
                          <Image src={document.fileUrl} alt={document.fileName} fill unoptimized className="object-cover" />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 text-[#541249] shadow-sm backdrop-blur hover:text-destructive"
                            aria-label={copy.remove}
                            disabled={removingDocument === document.id}
                            onClick={() => void deleteDocument(document)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#541249]/15 bg-white px-4 text-center text-sm text-muted-foreground">
                      {copy.galleryLimit}
                    </div>
                  )}
                  {galleryDocuments.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {galleryDocuments.length}/8 · {copy.galleryLimit}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <TextAreaField label={copy.businessModel} value={form.businessModel} onChange={(value) => set("businessModel", value)} placeholder={copy.businessPlaceholder} rows={4} />
                <TextAreaField label={copy.market} value={form.marketOverview} onChange={(value) => set("marketOverview", value)} placeholder={copy.marketPlaceholder} rows={4} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextAreaField label={copy.advantage} value={form.competitiveAdvantage} onChange={(value) => set("competitiveAdvantage", value)} placeholder={copy.advantagePlaceholder} rows={4} />
                  <TextAreaField label={copy.traction} value={form.traction} onChange={(value) => set("traction", value)} placeholder={copy.tractionPlaceholder} rows={4} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-7">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{copy.team}</h3>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => set("managementTeam", [...form.managementTeam, emptyTeam()])}>
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.addLeader}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.managementTeam.map((member, index) => (
                      <div key={member.id} className="rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#541249]">{index + 1}</span>
                          {form.managementTeam.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" aria-label={copy.remove} onClick={() => set("managementTeam", form.managementTeam.filter((item) => item.id !== member.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField label={copy.fullName} value={member.fullName} onChange={(value) => updateTeam(member.id, "fullName", value)} />
                          <TextField label={copy.function} value={member.role} onChange={(value) => updateTeam(member.id, "role", value)} />
                        </div>
                        <div className="mt-4">
                          <TextAreaField label={copy.experience} value={member.experience} onChange={(value) => updateTeam(member.id, "experience", value)} rows={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#541249]/8 pt-6">
                  <div className="mb-4 flex items-start gap-3 rounded-2xl bg-[#f8f1f6] p-4">
                    <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-[#541249]" />
                    <p className="text-sm leading-relaxed text-muted-foreground">{copy.figuresNote}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField label={copy.employees} value={form.employeeCount} onChange={(value) => set("employeeCount", value)} />
                    <NumberField label={copy.financialYear} value={form.financialYear} onChange={(value) => set("financialYear", value)} min="2000" max={String(new Date().getUTCFullYear())} />
                    <NumberField label={copy.latestRevenue} value={form.annualRevenue} onChange={(value) => set("annualRevenue", value)} />
                    <NumberField label={copy.previousRevenue} value={form.previousRevenue} onChange={(value) => set("previousRevenue", value)} />
                    <NumberField label={copy.netIncome} value={form.netIncome} onChange={(value) => set("netIncome", value)} allowNegative />
                    <NumberField label={copy.operatingExpenses} value={form.annualOperatingExpenses} onChange={(value) => set("annualOperatingExpenses", value)} />
                    <NumberField label={copy.cash} value={form.cashBalance} onChange={(value) => set("cashBalance", value)} />
                    <NumberField label={copy.debtOutstanding} value={form.existingDebt} onChange={(value) => set("existingDebt", value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <FieldLabel>{copy.instrument}</FieldLabel>
                  <RadioGroup value={form.instrumentType} onValueChange={(value) => set("instrumentType", value as InstrumentType)} className="mt-2 grid gap-3 sm:grid-cols-2">
                    <ChoiceCard id="debt" value="debt" selected={form.instrumentType === "debt"} title={copy.debt} description={copy.debtDesc} />
                    <ChoiceCard id="equity" value="equity" selected={form.instrumentType === "equity"} title={copy.equity} description={copy.equityDesc} />
                  </RadioGroup>
                </div>
                {form.instrumentType === "debt" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-[#541249]/10 bg-[#faf6f9] p-4">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#541249]" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{copy.rateWarning}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.rateExplanation}</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label={copy.goal} value={form.fundingGoal} onChange={(value) => set("fundingGoal", value)} />
                  <NumberField label={copy.minimum} value={form.minInvestment} onChange={(value) => set("minInvestment", value)} />
                  <NumberField label={copy.contribution} value={form.companyContribution} onChange={(value) => set("companyContribution", value)} />
                  <NumberField label={copy.maximum} value={form.maxInvestment} onChange={(value) => set("maxInvestment", value)} optional />
                </div>
                {form.instrumentType === "debt" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField label={copy.rate} value={form.annualRate} onChange={(value) => set("annualRate", value)} decimal />
                    <div>
                      <FieldLabel>{copy.ratePeriod}</FieldLabel>
                      <Select value={form.ratePeriod} onValueChange={(value) => set("ratePeriod", value as RatePeriod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total">{copy.totalPeriod}</SelectItem>
                          <SelectItem value="annual">{copy.annual}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <NumberField label={copy.duration} value={form.durationMonths} onChange={(value) => set("durationMonths", value)} />
                    <div>
                      <FieldLabel>{copy.repayment}</FieldLabel>
                      <Select value={form.repaymentType} onValueChange={(value) => set("repaymentType", value as RepaymentType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bullet">{copy.bullet}</SelectItem>
                          <SelectItem value="amortized">{copy.amortized}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField label={copy.equityOffered} value={form.equityOfferedPct} onChange={(value) => set("equityOfferedPct", value)} decimal />
                    <NumberField label={copy.valuation} value={form.valuationPre} onChange={(value) => set("valuationPre", value)} />
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-7">
                <TextAreaField label={copy.purpose} value={form.fundingPurpose} onChange={(value) => set("fundingPurpose", value)} placeholder={copy.purposePlaceholder} rows={4} />

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{copy.useTitle}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{copy.exactAllocation}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => set("useOfFunds", [...form.useOfFunds, emptyFund()])}>
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.addUse}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.useOfFunds.map((item) => (
                      <div key={item.id} className="grid gap-3 rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4 sm:grid-cols-[minmax(0,1fr)_210px_40px] sm:items-end">
                        <TextField label={copy.expense} value={item.label} onChange={(value) => updateFund(item.id, "label", value)} />
                        <NumberField label={copy.amount} value={item.amount} onChange={(value) => updateFund(item.id, "amount", value)} />
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive" aria-label={copy.remove} disabled={form.useOfFunds.length <= 2} onClick={() => set("useOfFunds", form.useOfFunds.filter((row) => row.id !== item.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className={"mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm " + (allocationDifference === 0 && fundingGoal > 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>
                    <span>{copy.allocated}: <strong>{money(allocatedAmount)}</strong></span>
                    <span>{copy.remaining}: <strong>{money(Math.abs(allocationDifference))}</strong></span>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{copy.milestones}</h3>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => set("milestones", [...form.milestones, emptyMilestone()])}>
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.addMilestone}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.milestones.map((item, index) => (
                      <div key={item.id} className="rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#541249]">
                            <CalendarDays className="h-4 w-4" />
                            {copy.milestone} {index + 1}
                          </span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" aria-label={copy.remove} disabled={form.milestones.length <= 2} onClick={() => set("milestones", form.milestones.filter((row) => row.id !== item.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField label={copy.milestone} value={item.title} onChange={(value) => updateMilestone(item.id, "title", value)} />
                          <div>
                            <FieldLabel>{copy.targetDate}</FieldLabel>
                            <Input type="date" value={item.targetDate} onChange={(event) => updateMilestone(item.id, "targetDate", event.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <TextAreaField label={copy.expectedOutcome} value={item.outcome} onChange={(value) => updateMilestone(item.id, "outcome", value)} rows={2} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {form.instrumentType === "debt" ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextAreaField label={copy.repaymentSource} value={form.repaymentSource} onChange={(value) => set("repaymentSource", value)} rows={4} />
                    <TextAreaField label={copy.guarantee} value={form.guaranteeDescription} onChange={(value) => set("guaranteeDescription", value)} placeholder={copy.guaranteeHelp} rows={4} />
                  </div>
                ) : (
                  <TextAreaField label={copy.shareholders} value={form.shareholderStructure} onChange={(value) => set("shareholderStructure", value)} placeholder={copy.shareholdersHelp} rows={4} />
                )}
                <TextAreaField label={copy.risks} value={form.risksIdentified} onChange={(value) => set("risksIdentified", value)} placeholder={copy.risksPlaceholder} rows={4} />
                <TextAreaField label={copy.impact} value={form.impactObjectives} onChange={(value) => set("impactObjectives", value)} rows={3} optional />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewCard title={copy.company} lines={[
                    selectedCompany?.tradeName || selectedCompany?.legalName || "—",
                    selectedCompany ? selectedCompany.legalForm + " · " + getCountryLabel(selectedCompany.country, locale) : "—",
                  ]} />
                  <ReviewCard title={copy.project} lines={[
                    form.title || "—",
                    getSectorLabel(form.sector, locale) + " · " + form.city,
                  ]} />
                  <ReviewCard title={copy.activity} lines={[
                    form.businessModel,
                    form.traction,
                  ]} />
                  <ReviewCard title={copy.keyFigures} lines={[
                    copy.latestRevenue + ": " + money(Number(form.annualRevenue) || 0),
                    copy.netIncome + ": " + money(Number(form.netIncome) || 0),
                  ]} />
                  <ReviewCard title={copy.terms} lines={[
                    (form.instrumentType === "debt" ? copy.debt : copy.equity) + " · " + money(Number(form.fundingGoal) || 0),
                    form.instrumentType === "debt"
                      ? form.annualRate + "% · " + form.durationMonths + " " + copy.months
                      : form.equityOfferedPct + "% · " + money(Number(form.valuationPre) || 0),
                  ]} />
                  <ReviewCard title={copy.plan} lines={[
                    form.useOfFunds.length + " " + copy.useTitle.toLocaleLowerCase(locale),
                    form.milestones.length + " " + copy.milestones.toLocaleLowerCase(locale),
                  ]} />
                </div>

                {debtSimulation && (
                  <div className="rounded-2xl border border-[#541249]/10 bg-[#faf6f9] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{locale === "fr" ? "Montant net estimé pour l’entreprise" : "Estimated net amount for the company"}</span>
                      <strong className="text-base text-[#541249]">{money(debtSimulation.netToCompany)}</strong>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#541249]/10 p-5">
                  <h3 className="text-base font-semibold text-foreground">{copy.documents}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.documentsIntro}</p>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#541249]/12 bg-[#faf6f9] p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#541249] shadow-sm">
                      <Globe2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{copy.publicDocuments}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.publicDocumentsHelp}</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl bg-[linear-gradient(145deg,#2f0a29,#541249)] p-4 text-white sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#efc9e8]">
                        <FolderUp className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold">{copy.bulkTitle}</h4>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/65">{copy.bulkHelp}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                      <div>
                        <Label className="mb-2 block text-xs font-medium text-white/70">{copy.bulkCategory}</Label>
                        <Select value={bulkCategory} onValueChange={setBulkCategory}>
                          <SelectTrigger className="h-11 rounded-xl border-white/15 bg-white/10 text-white data-[placeholder]:text-white/55">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BULK_DOCUMENT_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {copy[category.labelKey]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#380c31] shadow-sm transition-transform hover:-translate-y-0.5">
                        <Files className="mr-2 h-4 w-4" />
                        {copy.chooseFiles}
                        <input
                          type="file"
                          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel,image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          disabled={uploadingKind !== null}
                          onChange={(event) => {
                            if (event.target.files?.length) {
                              void uploadMultipleDocuments(bulkCategory, event.target.files);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15">
                        <FolderUp className="mr-2 h-4 w-4" />
                        {copy.chooseFolder}
                        <input
                          {...DIRECTORY_INPUT_PROPS}
                          type="file"
                          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel,image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          disabled={uploadingKind !== null}
                          onChange={(event) => {
                            if (event.target.files?.length) {
                              void uploadMultipleDocuments(bulkCategory, event.target.files);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {bulkProgress && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/70">
                          <span>{copy.importingFiles}</span>
                          <span>{bulkProgress.done}/{bulkProgress.total}</span>
                        </div>
                        <Progress
                          value={(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100}
                          className="h-1.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#e6b7dc]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {DOCUMENT_SLOTS.map((slot) => {
                      const document = documents.find((item) => item.type === slot.kind);
                      const busy = uploadingKind === slot.kind || removingDocument === document?.id;
                      return (
                        <div
                          key={slot.kind}
                          className={
                            "rounded-2xl border p-4 transition-colors " +
                            (document
                              ? "border-emerald-200 bg-emerald-50/60"
                              : slot.required
                                ? "border-[#541249]/12 bg-[#fcfafb]"
                                : "border-border bg-white")
                          }
                        >
                          <div className="flex items-start gap-3">
                            <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (document ? "bg-emerald-100 text-emerald-700" : "bg-[#f4e7f1] text-[#541249]")}>
                              {document ? <FileCheck2 className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {copy[slot.labelKey]}
                                {slot.required && <span className="ml-1 text-[#8a2d78]">*</span>}
                              </p>
                              {document && (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {document.fileName} · {formatFileSize(document.size)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-[#541249]/15 bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-[#f8f0f6]">
                              {uploadingKind === slot.kind ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileUp className="mr-1.5 h-3.5 w-3.5" />}
                              {document ? copy.replaceFile : copy.uploadFile}
                              <input
                                type="file"
                                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel,image/jpeg,image/png,image/webp"
                                className="sr-only"
                                disabled={uploadingKind !== null || removingDocument !== null}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) void uploadDocument(slot.kind, file);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                            {document && (
                              <>
                                <a
                                  href={document.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 items-center rounded-full px-3 text-xs font-medium text-[#541249] hover:bg-[#f4e7f1]"
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  {copy.viewFile}
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
                                  aria-label={copy.remove}
                                  disabled={busy}
                                  onClick={() => void deleteDocument(document)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {additionalDocuments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {additionalDocuments.map((document) => (
                        <div key={document.id} className="flex items-center gap-3 rounded-xl border border-[#541249]/10 bg-white px-3 py-2.5">
                          <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-700" />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{document.fileName}</span>
                          <a href={document.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#541249] hover:underline">{copy.viewFile}</a>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" aria-label={copy.remove} disabled={removingDocument === document.id} onClick={() => void deleteDocument(document)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[#faf6f9] px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-medium text-[#541249]">{essentialDocumentsCount}/4 {copy.essentialFiles}</span>
                    <span>{documents.length} {copy.totalFiles}</span>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#541249]/15 bg-[#f8f0f6] p-5">
                  <Checkbox checked={form.declarationAccepted} onCheckedChange={(checked) => set("declarationAccepted", checked === true)} className="mt-0.5" />
                  <span className="text-sm font-medium leading-relaxed text-foreground">{copy.declaration}</span>
                </label>

                <div className="flex items-start gap-3 rounded-2xl bg-[#260820] p-5 text-white">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d6a5cd]" />
                  <div>
                    <p className="text-sm font-semibold">{copy.ready}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{copy.readyText}</p>
                  </div>
                </div>

                {!companyVerified && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="text-sm leading-relaxed">{copy.verificationRequired}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-[#541249]/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || submitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {copy.previous}
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="rounded-full" onClick={handleSaveDraft} disabled={savingDraft || submitting}>
                  {savingDraft ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {savingDraft ? copy.saving : copy.save}
                </Button>
                {step < STEPS.length ? (
                  <Button type="button" className="btn-nexora rounded-full px-6" onClick={() => setStep((current) => Math.min(STEPS.length, current + 1))} disabled={!isStepValid(step)}>
                    {copy.next}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" className="btn-nexora rounded-full px-6" onClick={handleSubmit} disabled={submitting || !isStepValid(7) || !companyVerified}>
                    {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {submitting ? copy.submitting : copy.submit}
                  </Button>
                )}
              </div>
            </div>
            {!isStepValid(step) && (
              <p className="mt-3 text-center text-sm text-amber-800 sm:text-right">{copy.incomplete}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <Label className="mb-2 block text-sm font-medium text-foreground">
      {children}
      {!optional && <span className="ml-1 text-[#8a2d78]">*</span>}
    </Label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-xl border-[#541249]/15 bg-white" />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  optional,
  decimal,
  allowNegative,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  decimal?: boolean;
  allowNegative?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <Input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        step={decimal ? "0.01" : "1"}
        min={min ?? (allowNegative ? undefined : "0")}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border-[#541249]/15 bg-white tabular-nums"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows: number;
  optional?: boolean;
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="rounded-xl border-[#541249]/15 bg-white leading-relaxed" />
    </div>
  );
}

function ChoiceCard({
  id,
  value,
  selected,
  title,
  description,
}: {
  id: string;
  value: string;
  selected: boolean;
  title: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={
        "flex min-h-28 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all " +
        (selected
          ? "border-[#541249]/55 bg-[#f7edf5] shadow-[0_10px_26px_rgba(84,18,73,.09)]"
          : "border-[#541249]/10 hover:border-[#541249]/25")
      }
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </Label>
  );
}

function ReviewCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="min-h-32 rounded-2xl border border-[#541249]/10 bg-[#fcfafb] p-4">
      <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#6c195e]">{title}</p>
      {lines.map((line, index) => (
        <p key={index} className={"mt-2 text-sm leading-relaxed " + (index === 0 ? "font-semibold text-foreground" : "line-clamp-2 text-muted-foreground")}>
          {line || "—"}
        </p>
      ))}
    </div>
  );
}

function formatFileSize(size: number | null) {
  if (!size || size < 1) return "—";
  if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " Ko";
  return (size / (1024 * 1024)).toFixed(1).replace(".0", "") + " Mo";
}
