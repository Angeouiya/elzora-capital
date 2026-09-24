"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Landmark,
  Wallet,
  Briefcase,
  LogIn,
  IdCard,
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
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  memberships: Membership[];
}

const STEPS = [
  { id: 1, label: ["Entreprise", "Company"], icon: BadgeCheck },
  { id: 2, label: ["Projet", "Project"], icon: Briefcase },
  { id: 3, label: ["Conditions", "Terms"], icon: Landmark },
  { id: 4, label: ["Budget", "Budget"], icon: Wallet },
  { id: 5, label: ["Récapitulatif", "Review"], icon: CheckCircle2 },
] as const;

const COPY = {
  fr: {
    signInTitle: "Connectez-vous pour soumettre un dossier", signIn: "Se connecter", title: "Soumettre un dossier", back: "Retour", step: "Étape",
    descriptions: ["Sélectionnez la société pour laquelle vous soumettez ce dossier.", "Décrivez le projet financé et son contexte géographique.", "Définissez l’instrument financier et les conditions proposées.", "Précisez le budget, la source de remboursement et les risques identifiés.", "Vérifiez l’ensemble avant soumission. Notre équipe analysera le dossier."],
    role: "Votre rôle", mandate: "mandat", projectTitle: "Titre du projet", short: "Description courte", detailed: "Description détaillée", sector: "Secteur", country: "Pays", city: "Ville", image: "Image (URL, optionnel)", select: "Sélectionner", imageNote: "Si vide, une image par défaut sera utilisée.",
    projectPlaceholder: "Extension du réseau de distribution — Dakar", shortPlaceholder: "Une phrase résumant le projet.", detailedPlaceholder: "Contexte, objectif, utilisation des fonds et source de remboursement…",
    instrument: "Type de financement", debt: "Avec remboursement", debtDesc: "L’entreprise rembourse le montant et les intérêts", equity: "Au capital", equityDesc: "Les investisseurs deviennent actionnaires", rateWarning: "Bien comprendre le gain proposé", rateExplanation: "8 % sur 6 mois et 8 % par an ne donnent pas le même résultat. Indiquez clairement si le taux couvre toute la durée ou une année.", rateExample: "Exemple : sur 1 000 000 F CFA, 8 % sur 6 mois représente 80 000 F CFA ; 8 % par an sur 6 mois représente 40 000 F CFA.",
    goal: "Montant recherché en F CFA", minimum: "Investissement minimum en F CFA", contribution: "Apport de l’entreprise en F CFA", rate: "Taux proposé (%)", ratePeriod: "Comment appliquer le taux ?", totalPeriod: "Une seule fois sur toute la durée", annual: "Chaque année", totalHelp: "Le taux s’applique une seule fois sur toute la durée du financement.", annualHelp: "Le taux est calculé selon la durée réelle du financement.", duration: "Durée en mois", repayment: "Rythme de remboursement", bullet: "Un seul paiement à la fin", amortized: "Paiements réguliers", maximum: "Investissement maximum en F CFA (optionnel)", equityOffered: "Part de l’entreprise proposée (%)", valuation: "Valeur estimée avant investissement en F CFA", equityNotice: "Pour un investissement au capital, aucun remboursement à date fixe n’est promis. Une revente future reste possible, mais n’est pas garantie.",
    budget: "Détail du budget", repaymentSource: "Source de remboursement", risks: "Risques identifiés", budgetPlaceholder: "Stock : 600 000 ; aménagement : 250 000 ; fonds de roulement : 150 000…", sourcePlaceholder: "Marge sur ventes, contrats signés et encaissements récurrents…", risksPlaceholder: "Concentration géographique, dépendance fournisseurs, saisonnalité…", company: "Société", project: "Projet", proposed: "Conditions proposées", goalReview: "Montant recherché", durationReview: "Durée", months: "mois", repaymentReview: "Type de remboursement", minimumReview: "Souscription min.", simulation: "Simulation financière", indicative: "À titre indicatif — commissions plateforme de 6 % à l’origine et 2 % par an de suivi.", upfront: "Commission initiale (6 %)", net: "Net versé à l’entreprise", totalCompany: "Total à régler par l’entreprise", platformRevenue: "Revenus plateforme (initial + suivi)", reviewNotice: "Ces conditions sont proposées par votre entreprise. Notre équipe les analysera et pourra demander des révisions. Vous ne publiez jamais directement.",
    previous: "Précédent", save: "Sauvegarder le brouillon", saving: "Sauvegarde…", next: "Suivant", submit: "Soumettre le dossier", submitting: "Soumission…",
    companyRequired: "Société requise", companyRequiredText: "Sélectionnez d’abord votre société.", draftFailed: "Brouillon non enregistré", retry: "Réessayez ultérieurement.", draftSaved: "Brouillon enregistré", draftSavedText: "Vous pourrez reprendre votre dossier plus tard.", network: "Erreur réseau", submitFailed: "Soumission échouée", submitted: "Dossier soumis", submittedText: "Notre équipe analyse votre dossier. Vous serez notifié.",
  },
  en: {
    signInTitle: "Sign in to submit an application", signIn: "Sign in", title: "Submit an application", back: "Back", step: "Step",
    descriptions: ["Select the company submitting this application.", "Describe the funded project and its location.", "Define the financing instrument and proposed terms.", "Provide the budget, repayment source and identified risks.", "Review everything before submission. Our team will assess the application."],
    role: "Your role", mandate: "mandate", projectTitle: "Project title", short: "Short description", detailed: "Detailed description", sector: "Sector", country: "Country", city: "City", image: "Image (optional URL)", select: "Select", imageNote: "A default image will be used if left blank.",
    projectPlaceholder: "Distribution network expansion — Dakar", shortPlaceholder: "One sentence summarizing the project.", detailedPlaceholder: "Context, objective, use of funds and repayment source…",
    instrument: "Funding type", debt: "With repayment", debtDesc: "The company repays the amount plus interest", equity: "Company ownership", equityDesc: "Investors become shareholders", rateWarning: "Understand the proposed return", rateExplanation: "8% over 6 months and 8% per year do not produce the same result. Clearly indicate whether the rate covers the full term or one year.", rateExample: "Example: on 1,000,000 CFA francs, 8% over 6 months is 80,000 CFA francs; 8% per year over 6 months is 40,000 CFA francs.",
    goal: "Amount sought in CFA francs", minimum: "Minimum investment in CFA francs", contribution: "Company contribution in CFA francs", rate: "Proposed rate (%)", ratePeriod: "How should the rate apply?", totalPeriod: "Once over the full term", annual: "Each year", totalHelp: "The rate applies once over the full financing term.", annualHelp: "The rate is calculated according to the actual financing term.", duration: "Duration in months", repayment: "Repayment schedule", bullet: "One payment at the end", amortized: "Regular payments", maximum: "Maximum investment in CFA francs (optional)", equityOffered: "Company ownership offered (%)", valuation: "Estimated value before investment in CFA francs", equityNotice: "A company ownership investment has no promised repayment date. A future resale may be possible, but is not guaranteed.",
    budget: "Budget breakdown", repaymentSource: "Repayment source", risks: "Identified risks", budgetPlaceholder: "Inventory: 600,000; fit-out: 250,000; working capital: 150,000…", sourcePlaceholder: "Sales margin, signed contracts and recurring collections…", risksPlaceholder: "Geographic concentration, supplier dependency, seasonality…", company: "Company", project: "Project", proposed: "Proposed terms", goalReview: "Amount sought", durationReview: "Term", months: "months", repaymentReview: "Repayment type", minimumReview: "Minimum investment", simulation: "Financial simulation", indicative: "Indicative only — platform fees of 6% upfront and 2% annual monitoring.", upfront: "Upfront fee (6%)", net: "Net amount paid to the company", totalCompany: "Total payable by the company", platformRevenue: "Platform revenue (upfront + monitoring)", reviewNotice: "These terms are proposed by your company. Our team will assess them and may request changes. You never publish an offer directly.",
    previous: "Previous", save: "Save draft", saving: "Saving…", next: "Next", submit: "Submit application", submitting: "Submitting…",
    companyRequired: "Company required", companyRequiredText: "Select your company first.", draftFailed: "Draft not saved", retry: "Try again later.", draftSaved: "Draft saved", draftSavedText: "You can resume your application later.", network: "Network error", submitFailed: "Submission failed", submitted: "Application submitted", submittedText: "Our team is reviewing your application. You will be notified.",
  },
} as const;

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
  instrumentType: InstrumentType;
  // Debt
  fundingGoal: string;
  companyContribution: string;
  annualRate: string;
  ratePeriod: RatePeriod;
  durationMonths: string;
  repaymentType: RepaymentType;
  minInvestment: string;
  maxInvestment: string;
  // Equity
  equityOfferedPct: string;
  valuationPre: string;
  // Budget
  budgetDetail: string;
  repaymentSource: string;
  risksIdentified: string;
}

const INITIAL_FORM: FormState = {
  companyId: "",
  title: "",
  description: "",
  longDescription: "",
  sector: "",
  country: "SN",
  city: "",
  imageUrl: "",
  instrumentType: "debt",
  fundingGoal: "",
  companyContribution: "",
  annualRate: "",
  ratePeriod: "total",
  durationMonths: "",
  repaymentType: "bullet",
  minInvestment: "",
  maxInvestment: "",
  equityOfferedPct: "",
  valuationPre: "",
  budgetDetail: "",
  repaymentSource: "",
  risksIdentified: "",
};

export function CompanySubmit() {
  const setView = useAppStore((s) => s.setView);
  const userEmail = useAppStore((s) => s.userEmail);
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const copy = COPY[locale];
  const money = (value: bigint | number) =>
    formatDisplayMoney(value, displayCurrency, locale);
  const stepLabel = (index: number) => STEPS[index].label[locale === "fr" ? 0 : 1];
  const roleLabel = (role: string) => {
    const labels: Record<string, [string, string]> = {
      owner: ["Propriétaire", "Owner"], administrator: ["Gestionnaire", "Manager"], finance: ["Responsable financier", "Finance manager"], member: ["Membre", "Member"],
    };
    return labels[role]?.[locale === "fr" ? 0 : 1] ?? (locale === "fr" ? "Représentant" : "Representative");
  };
  const mandateLabel = (mandate: string) => {
    const labels: Record<string, [string, string]> = {
      manage: ["Gestion complète", "Full management"], sign: ["Signature autorisée", "Authorized signer"], submit: ["Dépôt de dossier", "Application submission"], view: ["Consultation", "Read only"],
    };
    return labels[mandate]?.[locale === "fr" ? 0 : 1] ?? (locale === "fr" ? "Accès autorisé" : "Authorized access");
  };

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const fetchMe = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json() as Promise<MeResponse>)
      .then((data: MeResponse) => {
        setMe(data);
        if (data.memberships?.length > 0 && !form.companyId) {
          setForm((f) => ({
            ...f,
            companyId: data.memberships[0].company.id,
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [form.companyId]);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    void fetchMe();
  }, [userEmail, fetchMe]);

  const memberships = me?.memberships ?? [];

  // Simulation (for recap)
  const debtSim = useMemo(() => {
    if (form.instrumentType !== "debt") return null;
    const goal = Number(form.fundingGoal);
    const rate = Number(form.annualRate);
    const months = Number(form.durationMonths);
    if (!Number.isFinite(goal) || goal <= 0) return null;
    if (!Number.isFinite(rate)) return null;
    if (!Number.isFinite(months) || months <= 0) return null;
    return simulateDebtFinancing({
      principal: BigInt(Math.trunc(goal)),
      annualRate: rate,
      ratePeriod: form.ratePeriod,
      durationMonths: Math.trunc(months),
      repaymentType: form.repaymentType,
      upfrontCommissionPct: 6,
      annualFollowUpPct: 2,
    });
  }, [form]);

  if (!userEmail) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-8">
          <LogIn className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">
            {copy.signInTitle}
          </h1>
          <Button
            className="btn-nexora mt-4"
            onClick={() => setView("login")}
          >
            {copy.signIn}
          </Button>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-shell max-w-3xl">
        <Skeleton className="mb-6 h-10 w-72" />
        <Skeleton className="mb-4 h-2" />
        <Skeleton className="h-96" />
      </section>
    );
  }

  if (memberships.length === 0) {
    return (
      <section className="page-shell py-10">
        <CompanyOnboarding onCreated={fetchMe} />
      </section>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (key === "companyId" && value !== form.companyId) setDraftProjectId(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Validation per step
  const stepValid = (): boolean => {
    if (step === 1) return !!form.companyId;
    if (step === 2)
      return (
        !!form.title &&
        !!form.description &&
        !!form.longDescription &&
        !!form.sector &&
        !!form.country &&
        !!form.city
      );
    if (step === 3) {
      const goal = Number(form.fundingGoal);
      const min = Number(form.minInvestment);
      if (!Number.isFinite(goal) || goal <= 0) return false;
      if (!Number.isFinite(min) || min <= 0) return false;
      if (form.instrumentType === "debt") {
        if (!Number.isFinite(Number(form.annualRate))) return false;
        if (!Number.isFinite(Number(form.durationMonths)) || Number(form.durationMonths) <= 0)
          return false;
        return true;
      }
      // equity
      const eq = Number(form.equityOfferedPct);
      const val = Number(form.valuationPre);
      if (!Number.isFinite(eq) || eq <= 0 || eq > 100) return false;
      if (!Number.isFinite(val) || val <= 0) return false;
      return true;
    }
    if (step === 4)
      return !!form.budgetDetail && !!form.repaymentSource && !!form.risksIdentified;
    return true;
  };

  const buildPayload = (asDraft: boolean) => {
    const goal = Number(form.fundingGoal);
    const min = Number(form.minInvestment);
    const max = form.maxInvestment ? Number(form.maxInvestment) : null;
    const valuationPre =
      form.instrumentType === "equity" && form.valuationPre
        ? Number(form.valuationPre)
        : null;
    return {
      projectId: draftProjectId,
      companyId: form.companyId,
      title: form.title,
      description: form.description,
      longDescription: form.longDescription,
      sector: form.sector,
      country: form.country,
      city: form.city,
      imageUrl: form.imageUrl || undefined,
      instrumentType: form.instrumentType,
      fundingGoal: Number.isFinite(goal) ? Math.trunc(goal) : 0,
      companyContribution: form.companyContribution
        ? Number(form.companyContribution)
        : 0,
      annualRate:
        form.instrumentType === "debt" && form.annualRate
          ? Number(form.annualRate)
          : null,
      ratePeriod: form.instrumentType === "debt" ? form.ratePeriod : null,
      durationMonths:
        form.instrumentType === "debt" && form.durationMonths
          ? Number(form.durationMonths)
          : null,
      repaymentType:
        form.instrumentType === "debt" ? form.repaymentType : null,
      equityOfferedPct:
        form.instrumentType === "equity" && form.equityOfferedPct
          ? Number(form.equityOfferedPct)
          : null,
      valuationPre,
      minInvestment: Number.isFinite(min) ? Math.trunc(min) : 0,
      maxInvestment: max,
      budgetDetail: form.budgetDetail,
      repaymentSource: form.repaymentSource,
      risksIdentified: form.risksIdentified,
      // Draft endpoint uses these same fields; the server sets status="draft"
      ...(asDraft ? {} : {}),
    };
  };

  const handleSaveDraft = async () => {
    if (!form.companyId) {
      toast({
        title: copy.companyRequired,
        description: copy.companyRequiredText,
        variant: "destructive",
      });
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch("/api/projects/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(true)),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: { id?: string };
      };
      if (!res.ok) {
        toast({
          title: copy.draftFailed,
          description: body?.error || copy.retry,
          variant: "destructive",
        });
        return;
      }
      if (body.project?.id) setDraftProjectId(body.project.id);
      toast({
        title: copy.draftSaved,
        description: copy.draftSavedText,
      });
    } catch {
      toast({
        title: copy.network,
        description: copy.retry,
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(false)),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: copy.submitFailed,
          description: body?.error || copy.retry,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: copy.submitted,
        description: copy.submittedText,
      });
      setView("company_dashboard");
    } catch {
      toast({
        title: copy.network,
        description: copy.retry,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCompany = memberships.find(
    (m) => m.company.id === form.companyId
  )?.company;

  const progressPct = (step / STEPS.length) * 100;

  return (
    <section className="page-shell max-w-3xl reveal-in">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setView("company_dashboard")}
          className="h-9 w-9 text-muted-foreground"
          aria-label={copy.back}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {copy.title}
        </h1>
      </div>

      {/* Progress bar + steps */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <ol className="flex flex-1 items-center gap-1 overflow-x-auto">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-1"
                  aria-current={isActive ? "step" : undefined}
                >
                  <button
                    data-control="chip"
                    type="button"
                    onClick={() => {
                      if (s.id < step || stepValid()) setStep(s.id);
                    }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-nexora-lime text-nexora-black"
                        : isDone
                        ? "bg-nexora-pale text-positive"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label[locale === "fr" ? 0 : 1]}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {copy.step} {step} / {STEPS.length} — {stepLabel(step - 1)}
          </CardTitle>
          <CardDescription className="text-xs">
            {copy.descriptions[step - 1]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* STEP 1 — Entreprise */}
          {step === 1 && (
            <div className="space-y-3">
              {memberships.map((m) => {
                const c = m.company;
                const isSelected = form.companyId === c.id;
                return (
                  <button
                    data-control="choice"
                    key={c.id}
                    type="button"
                    onClick={() => set("companyId", c.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-[0_4px_16px_rgba(56,12,49,.035)] transition-all hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(56,12,49,.08)] ${
                      isSelected
                        ? "border-[#541249]/55 bg-[linear-gradient(145deg,#FAF4F9,#F1DFEE)] ring-2 ring-[#541249]/12"
                        : "border-[#541249]/10 bg-white/90 hover:border-[#541249]/30"
                    }`}
                  >
                    <IdCard
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        isSelected ? "text-positive" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {c.tradeName || c.legalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.legalForm} · {getCountryLabel(c.country, locale)} · {c.activity}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {copy.role} : {roleLabel(m.role)} ({copy.mandate} : {mandateLabel(m.mandate)})
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-positive" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2 — Projet */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-xs">
                  {copy.projectTitle} *
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder={copy.projectPlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">
                  {copy.short} *
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  placeholder={copy.shortPlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="longDescription" className="text-xs">
                  {copy.detailed} *
                </Label>
                <Textarea
                  id="longDescription"
                  value={form.longDescription}
                  onChange={(e) => set("longDescription", e.target.value)}
                  rows={5}
                  placeholder={copy.detailedPlaceholder}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sector" className="text-xs">
                    {copy.sector} *
                  </Label>
                  <Select
                    value={form.sector}
                    onValueChange={(v) => set("sector", v)}
                  >
                    <SelectTrigger id="sector">
                      <SelectValue placeholder={copy.select} />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {getSectorLabel(s, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="country" className="text-xs">
                    {copy.country} *
                  </Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => set("country", v)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder={copy.select} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {getCountryLabel(c.code, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="city" className="text-xs">
                  {copy.city} *
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Dakar"
                  required
                />
              </div>
              <div>
                <Label htmlFor="imageUrl" className="text-xs">
                  {copy.image}
                </Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {copy.imageNote}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — Conditions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">{copy.instrument} *</Label>
                <RadioGroup
                  value={form.instrumentType}
                  onValueChange={(v) => set("instrumentType", v as InstrumentType)}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="debt"
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-colors ${
                      form.instrumentType === "debt"
                        ? "border-nexora-lime bg-nexora-pale/60"
                        : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <RadioGroupItem id="debt" value="debt" />
                    <div>
                      <p className="text-sm font-semibold">{copy.debt}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {copy.debtDesc}
                      </p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="equity"
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-colors ${
                      form.instrumentType === "equity"
                        ? "border-nexora-lime bg-nexora-pale/60"
                        : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <RadioGroupItem id="equity" value="equity" />
                    <div>
                      <p className="text-sm font-semibold">{copy.equity}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {copy.equityDesc}
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              {/* Critical: 8% total ≠ 8%/an explanation */}
              {form.instrumentType === "debt" && (
                <div className="rounded-md border border-border bg-secondary/40 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    <div className="text-[11px] leading-relaxed text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        {copy.rateWarning}
                      </p>
                      <p className="mt-1">
                        {copy.rateExplanation}
                      </p>
                      <p className="mt-1">
                        {copy.rateExample}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Common: fundingGoal + minInvestment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fundingGoal" className="text-xs">
                    {copy.goal} *
                  </Label>
                  <Input
                    id="fundingGoal"
                    type="number"
                    inputMode="numeric"
                    value={form.fundingGoal}
                    onChange={(e) => set("fundingGoal", e.target.value)}
                    placeholder="1000000"
                    required
                    className="tnum"
                  />
                </div>
                <div>
                  <Label htmlFor="minInvestment" className="text-xs">
                    {copy.minimum} *
                  </Label>
                  <Input
                    id="minInvestment"
                    type="number"
                    inputMode="numeric"
                    value={form.minInvestment}
                    onChange={(e) => set("minInvestment", e.target.value)}
                    placeholder="10000"
                    required
                    className="tnum"
                  />
                </div>
              </div>

              {/* Debt-specific */}
              {form.instrumentType === "debt" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="companyContribution" className="text-xs">
                        {copy.contribution}
                      </Label>
                      <Input
                        id="companyContribution"
                        type="number"
                        inputMode="numeric"
                        value={form.companyContribution}
                        onChange={(e) =>
                          set("companyContribution", e.target.value)
                        }
                        placeholder="100000"
                        className="tnum"
                      />
                    </div>
                    <div>
                      <Label htmlFor="annualRate" className="text-xs">
                        {copy.rate} *
                      </Label>
                      <Input
                        id="annualRate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={form.annualRate}
                        onChange={(e) => set("annualRate", e.target.value)}
                        placeholder="8"
                        required
                        className="tnum"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ratePeriod" className="text-xs">
                      {copy.ratePeriod} *
                    </Label>
                    <Select
                      value={form.ratePeriod}
                      onValueChange={(v) => set("ratePeriod", v as RatePeriod)}
                    >
                      <SelectTrigger id="ratePeriod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">
                          {copy.totalPeriod}
                        </SelectItem>
                        <SelectItem value="annual">{copy.annual}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {form.ratePeriod === "total"
                        ? copy.totalHelp
                        : copy.annualHelp}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="durationMonths" className="text-xs">
                        {copy.duration} *
                      </Label>
                      <Input
                        id="durationMonths"
                        type="number"
                        inputMode="numeric"
                        value={form.durationMonths}
                        onChange={(e) =>
                          set("durationMonths", e.target.value)
                        }
                        placeholder="6"
                        required
                        className="tnum"
                      />
                    </div>
                    <div>
                      <Label htmlFor="repaymentType" className="text-xs">
                        {copy.repayment} *
                      </Label>
                      <Select
                        value={form.repaymentType}
                        onValueChange={(v) =>
                          set("repaymentType", v as RepaymentType)
                        }
                      >
                        <SelectTrigger id="repaymentType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bullet">
                            {copy.bullet}
                          </SelectItem>
                          <SelectItem value="amortized">
                            {copy.amortized}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maxInvestment" className="text-xs">
                      {copy.maximum}
                    </Label>
                    <Input
                      id="maxInvestment"
                      type="number"
                      inputMode="numeric"
                      value={form.maxInvestment}
                      onChange={(e) =>
                        set("maxInvestment", e.target.value)
                      }
                      placeholder="100000"
                      className="tnum"
                    />
                  </div>
                </>
              )}

              {/* Equity-specific */}
              {form.instrumentType === "equity" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="equityOfferedPct" className="text-xs">
                        {copy.equityOffered} *
                      </Label>
                      <Input
                        id="equityOfferedPct"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={form.equityOfferedPct}
                        onChange={(e) =>
                          set("equityOfferedPct", e.target.value)
                        }
                        placeholder="15"
                        required
                        className="tnum"
                      />
                    </div>
                    <div>
                      <Label htmlFor="valuationPre" className="text-xs">
                        {copy.valuation} *
                      </Label>
                      <Input
                        id="valuationPre"
                        type="number"
                        inputMode="numeric"
                        value={form.valuationPre}
                        onChange={(e) =>
                          set("valuationPre", e.target.value)
                        }
                        placeholder="500000000"
                        required
                        className="tnum"
                      />
                    </div>
                  </div>
                  <div className="rounded-md bg-nexora-pale p-3">
                    <p className="text-[11px] leading-relaxed text-positive">
                      {copy.equityNotice}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4 — Budget & prévisions */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="budgetDetail" className="text-xs">
                  {copy.budget} *
                </Label>
                <Textarea
                  id="budgetDetail"
                  value={form.budgetDetail}
                  onChange={(e) => set("budgetDetail", e.target.value)}
                  rows={4}
                  placeholder={copy.budgetPlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="repaymentSource" className="text-xs">
                  {copy.repaymentSource} *
                </Label>
                <Textarea
                  id="repaymentSource"
                  value={form.repaymentSource}
                  onChange={(e) => set("repaymentSource", e.target.value)}
                  rows={3}
                  placeholder={copy.sourcePlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="risksIdentified" className="text-xs">
                  {copy.risks} *
                </Label>
                <Textarea
                  id="risksIdentified"
                  value={form.risksIdentified}
                  onChange={(e) => set("risksIdentified", e.target.value)}
                  rows={3}
                  placeholder={copy.risksPlaceholder}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 5 — Récapitulatif */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold text-foreground">
                  {copy.company}
                </p>
                <p className="mt-1 text-sm">
                  {selectedCompany?.tradeName || selectedCompany?.legalName} ·{" "}
                  {selectedCompany?.legalForm} · {getCountryLabel(selectedCompany?.country || "", locale)}
                </p>
              </div>

              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-semibold text-foreground">{copy.project}</p>
                <p className="mt-1 text-sm font-medium">{form.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                  {form.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{getSectorLabel(form.sector, locale)}</Badge>
                  <Badge variant="outline">{form.city}, {getCountryLabel(form.country, locale)}</Badge>
                  <Badge className="bg-nexora-lime text-nexora-black">
                    {form.instrumentType === "debt" ? "Dette" : "Capital"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-semibold text-foreground">
                  {copy.proposed}
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{copy.goalReview}</dt>
                    <dd className="tnum font-medium text-foreground">
                      {money(Number(form.fundingGoal) || 0)}
                    </dd>
                  </div>
                  {form.instrumentType === "debt" && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{copy.rate}</dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.annualRate} %{" "}
                          {form.ratePeriod === "total"
                            ? `(${copy.totalPeriod.toLocaleLowerCase()})`
                            : `(${copy.annual.toLocaleLowerCase()})`}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{copy.durationReview}</dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.durationMonths} {copy.months}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {copy.repaymentReview}
                        </dt>
                        <dd className="font-medium text-foreground">
                          {form.repaymentType === "bullet"
                            ? copy.bullet
                            : copy.amortized}
                        </dd>
                      </div>
                    </>
                  )}
                  {form.instrumentType === "equity" && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {copy.equityOffered}
                        </dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.equityOfferedPct} %
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {copy.valuation}
                        </dt>
                        <dd className="tnum font-medium text-foreground">
                          {money(Number(form.valuationPre) || 0)}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{copy.minimumReview}</dt>
                    <dd className="tnum font-medium text-foreground">
                      {money(Number(form.minInvestment) || 0)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Simulation (debt only) */}
              {form.instrumentType === "debt" && debtSim && (
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs font-semibold text-foreground">
                    {copy.simulation}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {copy.indicative}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        {copy.upfront}
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {money(debtSim.upfrontCommission)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        {copy.net}
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {money(debtSim.netToCompany)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        {copy.totalCompany}
                      </dt>
                      <dd className="tnum font-semibold text-foreground">
                        {money(debtSim.totalCompanyPayment)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-border pt-1">
                      <dt className="text-muted-foreground">
                        {copy.platformRevenue}
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {money(debtSim.platformRevenue)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Notice */}
              <div className="rounded-md bg-nexora-pale p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                  <p className="text-[11px] leading-relaxed text-positive">
                    {copy.reviewNotice}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer — navigation */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || submitting}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {copy.previous}
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft || submitting}
              >
                {savingDraft ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {copy.saving}
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {copy.save}
                  </>
                )}
              </Button>

              {step < STEPS.length ? (
                <Button
                  type="button"
                  size="sm"
                  className="btn-nexora"
                  onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
                  disabled={!stepValid()}
                >
                  {copy.next}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="btn-nexora"
                  onClick={handleSubmit}
                  disabled={submitting || !stepValid()}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {copy.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {copy.submit}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
