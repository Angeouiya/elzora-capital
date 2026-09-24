"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { simulateDebtFinancing } from "@/lib/finance";
import { formatDisplayMoney } from "@/lib/display-money";
import { CompanyOnboarding } from "@/components/company/company-onboarding";
import { getCountryLabel, getSectorLabel } from "@/lib/countries";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Wallet,
  CalendarClock,
  Briefcase,
  ArrowRight,
  Plus,
  HandCoins,
  Info,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Lock,
  BadgeDollarSign,
} from "lucide-react";

// 15 statuts du modèle Project (prisma/schema.prisma)
const STATUS_META: Record<
  string,
  { label: [string, string]; className: string }
> = {
  draft: { label: ["Brouillon", "Draft"], className: "bg-secondary text-muted-foreground" },
  submitted: {
    label: ["Soumis", "Submitted"],
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  under_review: {
    label: ["En analyse", "Under review"],
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  complement_requested: {
    label: ["Complément demandé", "Additional information required"],
    className: "bg-[#FFF8E1] text-[#8a6d00]",
  },
  rejected: { label: ["Rejeté", "Rejected"], className: "bg-[#FFF5F5] text-nexora-danger" },
  approved: { label: ["Approuvé", "Approved"], className: "bg-nexora-pale text-positive" },
  offer_prepared: { label: ["Offre préparée", "Offer prepared"], className: "bg-nexora-pale text-positive" },
  offer_confirmed: { label: ["Offre confirmée", "Offer confirmed"], className: "bg-nexora-pale text-positive" },
  published: { label: ["Publié", "Published"], className: "bg-nexora-pale text-positive" },
  funding: { label: ["En collecte", "Fundraising"], className: "bg-nexora-pale text-positive" },
  funded: { label: ["Financé", "Funded"], className: "bg-nexora-lime text-nexora-black" },
  repaying: { label: ["Remboursement", "Repaying"], className: "bg-nexora-lime text-nexora-black" },
  completed: { label: ["Terminé", "Completed"], className: "bg-nexora-pale text-positive" },
  defaulted: { label: ["Défaut", "Default"], className: "bg-[#FFF5F5] text-nexora-danger" },
  closed: { label: ["Clôturé", "Closed"], className: "bg-secondary text-muted-foreground" },
};

const COPY = {
  fr: {
    workspace: "Espace entreprise", signInIntro: "Connectez-vous pour accéder à l’espace entreprise : vos dossiers, vos financements et le règlement de vos échéances.", signIn: "Se connecter", create: "Créer un compte entreprise", loadError: "Impossible de charger votre espace entreprise", retry: "Réessayer", select: "Sélectionnez une société", personal: "Compte personnel",
    nextDue: "Prochaine échéance", due: "Échéance", noDue: "Aucune échéance", afterFunding: "Sera créée après financement complet", activeFiles: "Dossiers actifs", totalFiles: "dossier(s) au total", fundedCapital: "Capital financé", raised: "Collecté auprès des investisseurs", newFile: "Nouveau dossier", myFiles: "Mes dossiers", noFiles: "Aucun dossier pour cette société", firstFile: "Soumettez un premier dossier de financement.", submitFile: "Soumettre un dossier", debt: "Dette", equity: "Capital", target: "Objectif", submitted: "Soumis le", fundraising: "Collecte", investors: "souscripteurs", investor: "souscripteur", closing: "Clôture",
    financing: "Mes financements", privacy: "Vous n’avez pas accès aux données personnelles des investisseurs. Les remboursements sont collectés globalement (capital + intérêts + suivi) par carte ou Mobile Money via un prestataire agréé.", noFinancing: "Aucun financement actif. Vos échéances apparaîtront ici une fois votre offre financée.", bullet: "Remboursement in fine", amortized: "Remboursement amortissable", months: "mois", principal: "Capital", interest: "Intérêts", followUp: "Suivi plateforme", totalDue: "Total à régler", bulletNote: "Échéance unique — paiement global à effectuer à la fin de la période de", paid: "Échéance réglée", verifying: "Paiement en cours de vérification", pay: "Régler l’échéance", paying: "Ouverture du paiement…", paymentError: "Paiement indisponible", soon: "Paiement bientôt disponible", provider: "Paiement par carte et Mobile Money en cours d’activation avec un prestataire agréé.", paymentAfterFunding: "L’échéance sera créée après financement complet de l’offre.", noPayment: "Aucune échéance déclarée pour ce dossier.", offerNotFunded: "L’offre n’est pas encore financée. L’échéance sera créée automatiquement une fois le financement complet.", paymentUnavailable: "L’échéance n’est pas encore disponible. Contactez notre équipe.",
  },
  en: {
    workspace: "Company workspace", signInIntro: "Sign in to manage your applications, financing and repayments.", signIn: "Sign in", create: "Create a company account", loadError: "Unable to load your company workspace", retry: "Try again", select: "Select a company", personal: "Personal account",
    nextDue: "Next payment", due: "Payment", noDue: "No payment due", afterFunding: "Created once funding is complete", activeFiles: "Active applications", totalFiles: "application(s) in total", fundedCapital: "Capital funded", raised: "Raised from investors", newFile: "New application", myFiles: "My applications", noFiles: "No application for this company", firstFile: "Submit your first financing application.", submitFile: "Submit an application", debt: "Debt", equity: "Equity", target: "Target", submitted: "Submitted on", fundraising: "Fundraising", investors: "investors", investor: "investor", closing: "Closes",
    financing: "My financing", privacy: "You cannot access investors’ personal data. Repayments are collected globally (principal + interest + monitoring fee) by card or Mobile Money through an authorized provider.", noFinancing: "No active financing. Repayments will appear here once your offer is funded.", bullet: "Bullet repayment", amortized: "Amortizing repayment", months: "months", principal: "Principal", interest: "Interest", followUp: "Platform monitoring", totalDue: "Total payable", bulletNote: "Single payment — the full amount is payable at the end of the", paid: "Payment completed", verifying: "Payment verification in progress", pay: "Make payment", paying: "Opening payment…", paymentError: "Payment unavailable", soon: "Payment coming soon", provider: "Card and Mobile Money payments are being activated with an authorized provider.", paymentAfterFunding: "The payment will be created once the offer is fully funded.", noPayment: "No payment has been scheduled for this application.", offerNotFunded: "The offer is not funded yet. The payment will be created automatically once funding is complete.", paymentUnavailable: "The payment is not available yet. Contact our team.",
  },
} as const;

const DIVIDEND_COPY = {
  fr: {
    title: "Distribuer un dividende",
    intro: "Déclarez une décision sociale. NEXORA contrôle les pièces et les montants avant tout règlement aux associés.",
    empty: "Aucune participation émise n’est encore disponible pour une distribution.",
    total: "Dividende total décidé pour la société (FCFA)",
    withholding: "Retenue totale sur la part des investisseurs NEXORA (FCFA)",
    resolution: "Référence de la décision sociale",
    resolutionDate: "Date de la décision",
    recordDate: "Date de référence des associés",
    taxRef: "Référence fiscale, si retenue",
    submit: "Transmettre pour contrôle",
    submitting: "Transmission…",
    submitted: "Contrôle juridique en attente",
    reviewed: "Validation financière en attente",
    approved: "Prête au règlement",
    verifying: "Paiement en vérification",
    paid: "Dividende distribué",
    rejected: "Correction demandée",
    cancelled: "Annulée",
    companyTotal: "Décision totale",
    investorGross: "Part brute investisseurs",
    net: "Net à régler",
    pay: "Régler le dividende",
    paying: "Ouverture du paiement…",
    declared: "Déclaration transmise",
    declaredText: "La décision a été enregistrée et sera contrôlée par deux responsables distincts.",
    declarationError: "Déclaration indisponible",
    paymentError: "Paiement indisponible",
    provider: "Le règlement est effectué par carte ou Mobile Money via un prestataire autorisé.",
    legalNotice: "Le montant dû aux investisseurs est calculé automatiquement selon les participations inscrites à la date de référence. La retenue renseignée doit provenir du traitement fiscal validé par votre conseil.",
  },
  en: {
    title: "Distribute a dividend",
    intro: "Submit a corporate resolution. NEXORA reviews the evidence and amounts before any shareholder payment.",
    empty: "No issued equity position is currently available for a distribution.",
    total: "Total dividend resolved for the company (XOF)",
    withholding: "Total withholding on the NEXORA investors’ share (XOF)",
    resolution: "Corporate resolution reference",
    resolutionDate: "Resolution date",
    recordDate: "Shareholder record date",
    taxRef: "Tax reference, when withholding applies",
    submit: "Submit for review",
    submitting: "Submitting…",
    submitted: "Legal review pending",
    reviewed: "Financial approval pending",
    approved: "Ready for payment",
    verifying: "Payment verification",
    paid: "Dividend distributed",
    rejected: "Correction requested",
    cancelled: "Cancelled",
    companyTotal: "Company resolution",
    investorGross: "Investors’ gross share",
    net: "Net amount payable",
    pay: "Pay the dividend",
    paying: "Opening payment…",
    declared: "Declaration submitted",
    declaredText: "The resolution has been recorded and will be reviewed by two separate officers.",
    declarationError: "Declaration unavailable",
    paymentError: "Payment unavailable",
    provider: "Payment is completed by card or Mobile Money through an authorized provider.",
    legalNotice: "The investors’ entitlement is calculated automatically from the issued holdings on the record date. Any withholding entered must follow tax treatment validated by your adviser.",
  },
} as const;

function NotLoggedIn({ locale }: { locale: "fr" | "en" }) {
  const setView = useAppStore((s) => s.setView);
  const copy = COPY[locale];
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nexora-pale">
          <Building2 className="h-7 w-7 text-positive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{copy.workspace}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.signInIntro}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => setView("login")} className="btn-nexora w-full">
            {copy.signIn}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView("register")}
            className="w-full"
          >
            {copy.create}
          </Button>
        </div>
      </div>
    </section>
  );
}

interface MembershipCompany {
  id: string;
  legalName: string;
  tradeName?: string | null;
  legalForm: string;
  country: string;
  activity: string;
  verificationStatus: string;
}
interface Membership {
  id: string;
  role: string;
  mandate: string;
  company: MembershipCompany;
}

interface CompanyProject {
  id: string;
  title: string;
  description: string;
  sector: string;
  country: string;
  city: string;
  instrumentType: string;
  fundingGoal: number;
  companyContribution: number;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  status: string;
  submittedAt: string | null;
  publishedAt: string | null;
  fundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: MembershipCompany;
  offer?: {
    id: string;
    fundingGoal: number;
    raisedAmount: number;
    committedAmount: number;
    backersCount: number;
    annualRate: number | null;
    ratePeriod: string | null;
    durationMonths: number | null;
    repaymentType: string | null;
    upfrontCommissionPct: number;
    annualFollowUpPct: number;
    status: string;
    closingDate: string;
    publishedAt: string;
  } | null;
}

interface CompanyPayment {
  id: string;
  projectId: string;
  installmentNo: number;
  dueDate: string;
  capitalDue: number;
  interestDue: number;
  followUpFeeDue: number;
  totalDue: number;
  status: string;
  paidAt: string | null;
  paidAmount: number;
  paymentRef: string | null;
}

interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    kycStatus: string;
  } | null;
  memberships: Membership[];
}

interface ProjectsResponse {
  projects: CompanyProject[];
}

interface PaymentsResponse {
  payments: CompanyPayment[];
  projects: { id: string; title: string; companyId: string }[];
  collectionsEnabled: boolean;
  providerName: string | null;
  collectionMethods: string[];
}

interface DividendIssuance {
  id: string;
  projectId: string;
  companyId: string;
  ownershipPct: number;
  shareClass: string;
  issuedAt: string;
  mandate: string;
  companyVerificationStatus: string;
  project: {
    title: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface CompanyDividend {
  id: string;
  issuanceId: string;
  projectId: string;
  companyId: string;
  totalDeclaredAmount: number;
  platformGrossAmount: number;
  withholdingAmount: number;
  netPayableAmount: number;
  recordDate: string;
  resolutionRef: string;
  resolutionDate: string;
  taxReference: string | null;
  rejectionReason: string | null;
  status: string;
  allocationCount: number;
  paidAt: string | null;
  project: {
    title: string;
    company: { legalName: string; tradeName?: string | null };
  };
}

interface DividendsResponse {
  issuances: DividendIssuance[];
  dividends: CompanyDividend[];
  collectionsEnabled: boolean;
  providerName: string | null;
  collectionMethods: string[];
}

interface DividendFormState {
  totalDeclaredAmount: string;
  withholdingAmount: string;
  resolutionRef: string;
  resolutionDate: string;
  recordDate: string;
  taxReference: string;
}

const EMPTY_DIVIDEND_FORM: DividendFormState = {
  totalDeclaredAmount: "",
  withholdingAmount: "0",
  resolutionRef: "",
  resolutionDate: "",
  recordDate: "",
  taxReference: "",
};

export function CompanyDashboard() {
  const userEmail = useAppStore((s) => s.userEmail);
  const setView = useAppStore((s) => s.setView);
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const copy = COPY[locale];
  const dividendCopy = DIVIDEND_COPY[locale];
  const { toast } = useToast();
  const money = (value: bigint | number, compact = false) =>
    formatDisplayMoney(value, displayCurrency, locale, compact);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";

  const [me, setMe] = useState<MeResponse | null>(null);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [payments, setPayments] = useState<CompanyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [collectionsEnabled, setCollectionsEnabled] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [dividendIssuances, setDividendIssuances] = useState<DividendIssuance[]>([]);
  const [dividends, setDividends] = useState<CompanyDividend[]>([]);
  const [dividendForms, setDividendForms] = useState<Record<string, DividendFormState>>({});
  const [dividendAction, setDividendAction] = useState<string | null>(null);

  const handlePayment = async (paymentId: string) => {
    setPayingId(paymentId);
    try {
      const response = await fetch("/api/company/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        payment?: { checkoutUrl?: string; status?: string };
      };
      if (!response.ok) throw new Error(payload.error || copy.paymentError);
      const checkoutUrl = payload.payment?.checkoutUrl;
      if (!checkoutUrl || payload.payment?.status !== "ready") {
        throw new Error(copy.paymentError);
      }
      const checkout = new URL(checkoutUrl);
      if (checkout.protocol !== "https:" || checkout.hostname !== "app.paydunya.com") {
        throw new Error(copy.paymentError);
      }
      window.location.assign(checkout.toString());
    } catch (paymentError) {
      toast({
        title: copy.paymentError,
        description:
          paymentError instanceof Error ? paymentError.message : copy.paymentError,
        variant: "destructive",
      });
      setPayingId(null);
    }
  };

  const updateDividendForm = (
    issuanceId: string,
    key: keyof DividendFormState,
    value: string
  ) => {
    setDividendForms((current) => ({
      ...current,
      [issuanceId]: {
        ...(current[issuanceId] ?? EMPTY_DIVIDEND_FORM),
        [key]: value,
      },
    }));
  };

  const submitDividend = async (issuance: DividendIssuance) => {
    const form = dividendForms[issuance.id] ?? EMPTY_DIVIDEND_FORM;
    setDividendAction(`declare:${issuance.id}`);
    try {
      const response = await fetch("/api/company/dividends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuanceId: issuance.id,
          totalDeclaredAmount: Number(form.totalDeclaredAmount),
          withholdingAmount: Number(form.withholdingAmount || 0),
          resolutionRef: form.resolutionRef,
          resolutionDate: form.resolutionDate,
          recordDate: form.recordDate,
          taxReference: form.taxReference,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || dividendCopy.declarationError);
      toast({ title: dividendCopy.declared, description: dividendCopy.declaredText });
      setDividendForms((current) => ({ ...current, [issuance.id]: EMPTY_DIVIDEND_FORM }));
      setReloadKey((value) => value + 1);
    } catch (submissionError) {
      toast({
        title: dividendCopy.declarationError,
        description:
          submissionError instanceof Error
            ? submissionError.message
            : dividendCopy.declarationError,
        variant: "destructive",
      });
    } finally {
      setDividendAction(null);
    }
  };

  const payDividend = async (dividendId: string) => {
    setDividendAction(`pay:${dividendId}`);
    try {
      const response = await fetch("/api/company/dividends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dividendId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        payment?: { checkoutUrl?: string; status?: string };
      };
      if (!response.ok) throw new Error(payload.error || dividendCopy.paymentError);
      const checkoutUrl = payload.payment?.checkoutUrl;
      if (!checkoutUrl || payload.payment?.status !== "ready") {
        throw new Error(dividendCopy.paymentError);
      }
      const checkout = new URL(checkoutUrl);
      if (checkout.protocol !== "https:" || checkout.hostname !== "app.paydunya.com") {
        throw new Error(dividendCopy.paymentError);
      }
      window.location.assign(checkout.toString());
    } catch (paymentError) {
      toast({
        title: dividendCopy.paymentError,
        description:
          paymentError instanceof Error ? paymentError.message : dividendCopy.paymentError,
        variant: "destructive",
      });
      setDividendAction(null);
    }
  };

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json() as Promise<MeResponse>),
      fetch("/api/projects?mine=true").then((r) =>
        r.ok ? (r.json() as Promise<ProjectsResponse>) : { projects: [] }
      ),
      fetch("/api/company/payments").then((r) =>
        r.ok
          ? (r.json() as Promise<PaymentsResponse>)
          : {
              payments: [],
              projects: [],
              collectionsEnabled: false,
              providerName: null,
              collectionMethods: [],
          }
      ),
      fetch("/api/company/dividends").then((r) =>
        r.ok
          ? (r.json() as Promise<DividendsResponse>)
          : {
              issuances: [],
              dividends: [],
              collectionsEnabled: false,
              providerName: null,
              collectionMethods: [],
            }
      ),
    ])
      .then(([
        meData,
        projData,
        payData,
        dividendData,
      ]: [MeResponse, ProjectsResponse, PaymentsResponse, DividendsResponse]) => {
        setMe(meData);
        setProjects(projData.projects || []);
        setPayments(payData.payments || []);
        setDividendIssuances(dividendData.issuances || []);
        setDividends(dividendData.dividends || []);
        setCollectionsEnabled(
          Boolean(payData.collectionsEnabled || dividendData.collectionsEnabled)
        );
        if (meData.memberships?.length > 0) {
          setSelectedCompanyId(
            (current) => current ?? meData.memberships[0].company.id
          );
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || (locale === "fr" ? "Erreur réseau" : "Network error"));
        setLoading(false);
      });
  }, [locale]);

  useEffect(() => {
    if (!userEmail) return;
    void fetchData();
  }, [userEmail, reloadKey, fetchData]);

  if (!userEmail) return <NotLoggedIn locale={locale} />;

  if (loading) {
    return (
      <div className="page-shell">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64" />
        <Skeleton className="mt-4 h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-xl border border-nexora-danger/30 bg-[#FFF5F5] p-6">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-nexora-danger" />
          <p className="text-sm font-semibold text-nexora-danger">
            {copy.loadError}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {copy.retry}
          </Button>
        </div>
      </section>
    );
  }

  const memberships = me?.memberships ?? [];

  if (memberships.length === 0) {
    return (
      <section className="page-shell py-10">
        <CompanyOnboarding
          onCreated={() => {
            setLoading(true);
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      </section>
    );
  }

  // Filtre les projets de la société sélectionnée
  const selectedMembership = memberships.find(
    (m) => m.company.id === selectedCompanyId
  );
  const selectedCompany = selectedMembership?.company;
  const companyProjects = selectedCompanyId
    ? projects.filter((p) => p.company?.id === selectedCompanyId)
    : projects;

  // 3 metrics max
  const activeProjects = companyProjects.filter(
    (p) => !["closed", "rejected", "defaulted"].includes(p.status)
  );
  const capitalFunded = companyProjects.reduce((sum, p) => {
    if (!p.offer) return sum;
    return sum + (p.offer.raisedAmount || 0);
  }, 0);

  // Prochaine échéance: among CompanyPayments for companyProjects, find earliest upcoming/due
  const companyProjectIds = new Set(companyProjects.map((p) => p.id));
  const companyPayments = payments.filter((p) => companyProjectIds.has(p.projectId));
  const companyDividendIssuances = dividendIssuances.filter(
    (issuance) => !selectedCompanyId || issuance.companyId === selectedCompanyId
  );
  const companyDividends = dividends.filter(
    (dividend) => !selectedCompanyId || dividend.companyId === selectedCompanyId
  );
  const upcomingPayments = companyPayments
    .filter((p) => ["upcoming", "due", "verifying"].includes(p.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextPayment = upcomingPayments[0] ?? null;

  return (
    <section className="page-shell reveal-in">
      {/* Header + context selector */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-nexora-black text-nexora-lime">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {copy.workspace}
            </h1>
            <p className="text-xs text-muted-foreground">
              {selectedCompany
                ? `${selectedCompany.tradeName || selectedCompany.legalName} · ${selectedCompany.legalForm} · ${getCountryLabel(selectedCompany.country, locale)}`
                : copy.select}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCompanyId ?? undefined}
            onValueChange={(v) => setSelectedCompanyId(v)}
          >
            <SelectTrigger size="sm" className="w-[220px]">
              <SelectValue placeholder={copy.personal} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">{copy.personal}</SelectItem>
              {memberships.map((m) => (
                <SelectItem key={m.company.id} value={m.company.id}>
                  {m.company.tradeName || m.company.legalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3 metrics max */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Prochaine échéance */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {copy.nextDue}
            </span>
            <CalendarClock className="h-4 w-4 text-foreground" />
          </div>
          {nextPayment ? (
            <>
              <p className="tnum mt-2 text-xl font-bold text-foreground">
                {money(nextPayment.totalDue)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {copy.due} n°{nextPayment.installmentNo} ·{" "}
                {new Date(nextPayment.dueDate).toLocaleDateString(dateLocale)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                {copy.noDue}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {copy.afterFunding}
              </p>
            </>
          )}
        </Card>

        {/* 2. Dossiers actifs */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {copy.activeFiles}
            </span>
            <Briefcase className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {activeProjects.length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {companyProjects.length} {copy.totalFiles}
          </p>
        </Card>

        {/* 3. Capital financé */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {copy.fundedCapital}
            </span>
            <Wallet className="h-4 w-4 text-foreground" />
          </div>
          <p className="tnum mt-2 text-2xl font-bold text-foreground">
            {money(capitalFunded, true)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {copy.raised}
          </p>
        </Card>
      </div>

      {/* Nouveau dossier */}
      <div className="mt-6 flex justify-end">
        <Button
          className="btn-nexora"
          onClick={() => setView("company_submit")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {copy.newFile}
        </Button>
      </div>

      {/* Mes dossiers */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Briefcase className="h-4 w-4" />
          {copy.myFiles}
        </h2>
        {companyProjects.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {copy.noFiles}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.firstFile}
            </p>
            <Button
              className="btn-nexora mt-4"
              size="sm"
              onClick={() => setView("company_submit")}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {copy.submitFile}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {companyProjects.map((p) => {
              const sm = STATUS_META[p.status] || {
                label: [p.status, p.status] as [string, string],
                className: "bg-secondary text-muted-foreground",
              };
              const hasOffer = !!p.offer;
              const fundingPct =
                hasOffer && p.offer!.fundingGoal > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (p.offer!.raisedAmount / p.offer!.fundingGoal) * 100
                      )
                    )
                  : 0;
              const isDebt = p.instrumentType === "debt";
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getSectorLabel(p.sector, locale)} · {p.city}, {getCountryLabel(p.country, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={sm.className}>{sm.label[locale === "fr" ? 0 : 1]}</Badge>
                        <Badge variant="outline">
                          {isDebt ? copy.debt : copy.equity}
                        </Badge>
                        <span className="tnum text-[11px] text-muted-foreground">
                          {copy.target} {money(p.fundingGoal, true)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">
                        {copy.submitted}
                      </p>
                      <p className="tnum text-xs font-medium text-foreground">
                        {p.submittedAt
                          ? new Date(p.submittedAt).toLocaleDateString(dateLocale)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Funding progress if published */}
                  {hasOffer && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {copy.fundraising}
                        </span>
                        <span className="tnum font-medium text-foreground">
                          {fundingPct}% · {money(p.offer!.raisedAmount, true)}
                        </span>
                      </div>
                      <Progress value={fundingPct} className="h-2" />
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {p.offer!.backersCount}{" "}
                          {p.offer!.backersCount > 1 ? copy.investors : copy.investor}
                        </span>
                        <span>
                          {copy.closing}{" "}
                          {new Date(p.offer!.closingDate).toLocaleDateString(
                            dateLocale
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mes financements — repayment schedule for funded/repaying projects */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <HandCoins className="h-4 w-4" />
          {copy.financing}
        </h2>

        {/* Notice: pas d'accès aux données investisseurs */}
        <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-secondary/60 p-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {copy.privacy}
          </p>
        </div>

        {companyProjects.filter(
          (p) => p.offer && p.instrumentType === "debt"
        ).length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {copy.noFinancing}
          </Card>
        ) : (
          <div className="space-y-4">
            {companyProjects
              .filter((p) => p.offer && p.instrumentType === "debt")
              .map((p) => {
                const sim = simulateDebtFinancing({
                  principal: BigInt(p.offer!.fundingGoal),
                  annualRate: p.offer!.annualRate ?? 0,
                  ratePeriod:
                    (p.offer!.ratePeriod as "total" | "annual") || "total",
                  durationMonths: p.offer!.durationMonths ?? 0,
                  repaymentType:
                    (p.offer!.repaymentType as "bullet" | "amortized") ||
                    "bullet",
                  upfrontCommissionPct: p.offer!.upfrontCommissionPct,
                  annualFollowUpPct: p.offer!.annualFollowUpPct,
                });
                // For each project, find associated CompanyPayments
                const projPayments = companyPayments.filter(
                  (cp) => cp.projectId === p.id
                );
                const isFunded = ["funded", "repaying", "completed"].includes(
                  p.status
                );
                const statusMeta = STATUS_META[p.status] || {
                  label: [p.status, p.status] as [string, string],
                  className: "bg-secondary text-muted-foreground",
                };
                return (
                  <Card key={p.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {p.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {(p.offer!.repaymentType || "bullet") === "bullet"
                            ? copy.bullet
                            : copy.amortized}{" "}
                          · {p.offer!.durationMonths} {copy.months}
                        </p>
                      </div>
                      <Badge className={statusMeta.className}>
                        {statusMeta.label[locale === "fr" ? 0 : 1]}
                      </Badge>
                    </div>

                    {/* Schedule CARD (mobile-friendly) */}
                    <div className="rounded-md border border-border/60 bg-secondary/40 p-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {copy.principal}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {money(sim.principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {copy.interest}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {money(sim.investorInterest)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {copy.followUp}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-semibold text-foreground">
                            {money(sim.followUpCommission)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {copy.totalDue}
                          </p>
                          <p className="tnum mt-0.5 text-sm font-bold text-foreground">
                            {money(sim.totalCompanyPayment)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 border-t border-border/60 pt-2">
                        <p className="text-[11px] text-muted-foreground">
                          {copy.bulletNote}{" "}{p.offer!.durationMonths} {copy.months}.
                        </p>
                      </div>
                    </div>

                    {/* Régler l'échéance — button only when there's an existing CompanyPayment */}
                    <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {projPayments.length > 0 ? (
                        <>
                          <div className="text-xs text-muted-foreground">
                            {projPayments[0].status === "paid" ? (
                              <span className="flex items-center gap-1 text-positive">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {copy.paid}
                              </span>
                            ) : projPayments[0].status === "verifying" ? (
                              <span className="flex items-center gap-1 text-[#8a6d00]">
                                <Info className="h-3.5 w-3.5" />
                                {copy.verifying}
                              </span>
                            ) : (
                              <span>
                                {copy.due} n°{projPayments[0].installmentNo} ·{" "}
                                {new Date(
                                  projPayments[0].dueDate
                                ).toLocaleDateString(dateLocale)}
                              </span>
                            )}
                          </div>
                          {projPayments[0].status !== "paid" &&
                            projPayments[0].status !== "verifying" && (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        className="btn-nexora"
                                        disabled={!collectionsEnabled || payingId === projPayments[0].id}
                                        onClick={() => void handlePayment(projPayments[0].id)}
                                      >
                                        <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                        {payingId === projPayments[0].id
                                          ? copy.paying
                                          : collectionsEnabled
                                          ? copy.pay
                                          : copy.soon}
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!collectionsEnabled && (
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">
                                        {copy.provider}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground">
                            {!isFunded
                              ? copy.paymentAfterFunding
                              : copy.noPayment}
                          </div>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    className="btn-nexora opacity-50"
                                    disabled
                                  >
                                    <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                    {copy.pay}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  {!isFunded
                                    ? copy.offerNotFunded
                                    : copy.paymentUnavailable}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Dividendes — equity only */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <BadgeDollarSign className="h-4 w-4" />
          {dividendCopy.title}
        </h2>
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#D9BFD4] bg-[#FCF8FB] p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#541249]" />
          <div>
            <p className="text-xs font-semibold text-[#541249]">{dividendCopy.intro}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {dividendCopy.legalNotice}
            </p>
          </div>
        </div>

        {companyDividends.length > 0 && (
          <div className="mb-4 space-y-3">
            {companyDividends.map((dividend) => {
              const statusLabel = dividendCopy[
                dividend.status as keyof typeof dividendCopy
              ] as string | undefined;
              const canPay = dividend.status === "approved";
              const paying = dividendAction === `pay:${dividend.id}`;
              return (
                <Card key={dividend.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {dividend.project.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dividend.resolutionRef} · {new Date(`${dividend.recordDate}T00:00:00Z`).toLocaleDateString(dateLocale)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        dividend.status === "paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : dividend.status === "rejected"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-[#D9BFD4] bg-[#FCF8FB] text-[#541249]"
                      }
                    >
                      {statusLabel || dividend.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {dividendCopy.companyTotal}
                      </p>
                      <p className="tnum mt-0.5 text-sm font-semibold">
                        {money(dividend.totalDeclaredAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {dividendCopy.investorGross}
                      </p>
                      <p className="tnum mt-0.5 text-sm font-semibold">
                        {money(dividend.platformGrossAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {dividendCopy.net}
                      </p>
                      <p className="tnum mt-0.5 text-sm font-bold text-[#541249]">
                        {money(dividend.netPayableAmount)}
                      </p>
                    </div>
                  </div>
                  {dividend.rejectionReason && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-900">
                      {dividend.rejectionReason}
                    </p>
                  )}
                  {canPay && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {dividendCopy.provider}
                      </p>
                      <Button
                        size="sm"
                        className="btn-nexora"
                        disabled={!collectionsEnabled || paying}
                        onClick={() => void payDividend(dividend.id)}
                      >
                        <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                        {paying ? dividendCopy.paying : dividendCopy.pay}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {companyDividendIssuances.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {dividendCopy.empty}
          </Card>
        ) : (
          <div className="space-y-4">
            {companyDividendIssuances.map((issuance) => {
              const form = dividendForms[issuance.id] ?? EMPTY_DIVIDEND_FORM;
              const totalDeclared = Number(form.totalDeclaredAmount || 0);
              const withholding = Number(form.withholdingAmount || 0);
              const previewGross = Number.isSafeInteger(totalDeclared)
                ? Math.round((totalDeclared * issuance.ownershipPct) / 100)
                : 0;
              const previewNet = Math.max(0, previewGross - withholding);
              const submitting = dividendAction === `declare:${issuance.id}`;
              const formReady =
                totalDeclared > 0 &&
                Number.isSafeInteger(totalDeclared) &&
                withholding >= 0 &&
                Number.isSafeInteger(withholding) &&
                withholding < previewGross &&
                form.resolutionRef.trim().length > 0 &&
                form.resolutionDate.length === 10 &&
                form.recordDate.length === 10 &&
                (withholding === 0 || form.taxReference.trim().length > 0);
              return (
                <Card key={issuance.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {issuance.project.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {issuance.project.company.tradeName || issuance.project.company.legalName}
                        {" · "}{issuance.ownershipPct.toLocaleString(dateLocale, { maximumFractionDigits: 6 })} %
                      </p>
                    </div>
                    <Badge variant="outline">{issuance.shareClass}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label htmlFor={`div-total-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.total}
                      </Label>
                      <Input
                        id={`div-total-${issuance.id}`}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={form.totalDeclaredAmount}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "totalDeclaredAmount", event.target.value)
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`div-withholding-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.withholding}
                      </Label>
                      <Input
                        id={`div-withholding-${issuance.id}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={form.withholdingAmount}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "withholdingAmount", event.target.value)
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`div-resolution-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.resolution}
                      </Label>
                      <Input
                        id={`div-resolution-${issuance.id}`}
                        value={form.resolutionRef}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "resolutionRef", event.target.value)
                        }
                        className="mt-1 h-9"
                        placeholder="PV-AGO-2026-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`div-resolution-date-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.resolutionDate}
                      </Label>
                      <Input
                        id={`div-resolution-date-${issuance.id}`}
                        type="date"
                        value={form.resolutionDate}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "resolutionDate", event.target.value)
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`div-record-date-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.recordDate}
                      </Label>
                      <Input
                        id={`div-record-date-${issuance.id}`}
                        type="date"
                        value={form.recordDate}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "recordDate", event.target.value)
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`div-tax-${issuance.id}`} className="text-[11px]">
                        {dividendCopy.taxRef}
                      </Label>
                      <Input
                        id={`div-tax-${issuance.id}`}
                        value={form.taxReference}
                        onChange={(event) =>
                          updateDividendForm(issuance.id, "taxReference", event.target.value)
                        }
                        className="mt-1 h-9"
                        placeholder="RET-DIV-2026-001"
                      />
                    </div>
                  </div>

                  {totalDeclared > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#D9BFD4] bg-[#FCF8FB] p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {dividendCopy.companyTotal}
                        </p>
                        <p className="tnum mt-0.5 text-sm font-semibold">{money(totalDeclared)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {dividendCopy.investorGross}
                        </p>
                        <p className="tnum mt-0.5 text-sm font-semibold">{money(previewGross)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {dividendCopy.net}
                        </p>
                        <p className="tnum mt-0.5 text-sm font-bold text-[#541249]">{money(previewNet)}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      className="btn-nexora"
                      disabled={!formReady || submitting}
                      onClick={() => void submitDividend(issuance)}
                    >
                      <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />
                      {submitting ? dividendCopy.submitting : dividendCopy.submit}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
