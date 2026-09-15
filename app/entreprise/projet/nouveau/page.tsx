"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Building,
  ChartPie,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  FileUp,
  FolderOpen,
  Landmark,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Plus,
  Save,
  Send,
  SquarePen,
  Trash,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import {
  calculateNetReceived,
  calculateTotalCostForEnterprise,
  formatFCFA,
} from "@/lib/calculations";

/* ============================== Config ============================== */

const STEPS = [
  { id: "entreprise", label: "Entreprise", icon: Building },
  { id: "projet", label: "Projet", icon: FolderOpen },
  { id: "conditions", label: "Conditions", icon: BadgePercent },
  { id: "budget", label: "Budget", icon: ClipboardList },
  { id: "previsions", label: "Prévisions", icon: TrendingUp },
  { id: "documents", label: "Documents", icon: FileUp },
  { id: "recapitulatif", label: "Récapitulatif", icon: ListChecks },
] as const;

const SECTORS = [
  "Agriculture & Agro-industrie",
  "Commerce & Distribution",
  "Transport & Logistique",
  "Industrie & Manufacture",
  "Services & BTP",
  "Technologies & Digital",
  "Énergie & Environnement",
  "Santé",
  "Éducation",
  "Immobilier",
  "Tourisme & Hôtellerie",
];

const LEGAL_FORMS = ["SARL", "SA", "SAS", "SNC", "GIE", "Entreprise individuelle", "Coopérative"];

const COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Bénin",
  "Togo",
  "Burkina Faso",
  "Mali",
  "Guinée",
  "Ghana",
  "Cameroun",
];

const DURATIONS = [
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
  { value: "9", label: "9 mois" },
  { value: "12", label: "12 mois" },
  { value: "18", label: "18 mois" },
  { value: "24", label: "24 mois" },
  { value: "36", label: "36 mois" },
];

const REPAYMENT_SOURCES = [
  "Revenus d'exploitation",
  "Encaissements clients (contrats signés)",
  "Ventes de stock / campagne",
  "Cession d'actifs",
  "Subvention ou apport associé",
  "Refinancement bancaire",
  "Autre",
];

const DOC_SLOTS = [
  { id: "rccm", label: "Statuts & RCCM", desc: "Registre du commerce et des sociétés" },
  { id: "financiers", label: "États financiers", desc: "Bilans des 2 derniers exercices" },
  { id: "businessPlan", label: "Business plan", desc: "Présentation du projet et projections" },
  { id: "identite", label: "Pièce d'identité du dirigeant", desc: "CNI ou passeport du représentant légal" },
  { id: "proforma", label: "Devis / factures proforma", desc: "Justificatifs des dépenses prévues" },
];

/* ============================== Types ============================== */

interface BudgetLine {
  label: string;
  amount: string;
}

interface FormState {
  companyName: string;
  companySector: string;
  legalForm: string;
  country: string;
  title: string;
  description: string;
  projectSector: string;
  city: string;
  fundingType: "DEBT" | "EQUITY";
  rate: string;
  ratePeriod: "TOTAL" | "ANNUAL";
  duration: string;
  requestedAmount: string;
  ownContribution: string;
  budgetLines: BudgetLine[];
  expectedRevenue: string;
  repaymentSource: string;
  revenueDetails: string;
  documents: Record<string, string | null>;
}

const INITIAL_FORM: FormState = {
  companyName: "",
  companySector: "",
  legalForm: "SARL",
  country: "Côte d'Ivoire",
  title: "",
  description: "",
  projectSector: "",
  city: "",
  fundingType: "DEBT",
  rate: "",
  ratePeriod: "TOTAL",
  duration: "6",
  requestedAmount: "",
  ownContribution: "",
  budgetLines: [{ label: "", amount: "" }],
  expectedRevenue: "",
  repaymentSource: REPAYMENT_SOURCES[0],
  revenueDetails: "",
  documents: {},
};

/* ============================== Helpers ============================== */

function parseAmount(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

function parseRate(value: string): number {
  return Math.round((parseFloat(value.replace(",", ".")) || 0) * 100);
}

function formatAmountInput(value: string): string {
  const n = parseAmount(value);
  if (!n) return "";
  return n.toLocaleString("fr-FR").replace(/\u202f/g, " ");
}

/* ============================== Page ============================== */

export default function NouveauProjetPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  /* Pré-remplissage : société + éventuel brouillon existant (?draft=id) */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const draftParam = new URLSearchParams(window.location.search).get("draft");

        const companiesRes = await fetch("/api/companies");
        if (companiesRes.ok) {
          const companies = await companiesRes.json();
          const company = Array.isArray(companies) ? companies[0] : null;
          if (company && !cancelled) {
            setForm((f) => ({
              ...f,
              companyName: company.name ?? "",
              companySector: company.sector ?? "",
              legalForm: company.legalForm ?? "SARL",
              country: company.country ?? "Côte d'Ivoire",
            }));
          }
        }

        if (draftParam) {
          const res = await fetch(`/api/projects/${draftParam}`);
          if (res.ok) {
            const project = await res.json();
            if (cancelled) return;
            setDraftId(project.id);
            setOriginalStatus(project.status ?? null);

            let budgetLines: BudgetLine[] = [{ label: "", amount: "" }];
            let conditions: Partial<FormState> = {};
            let forecasts: Partial<FormState> = {};
            let documents: Record<string, string | null> = {};
            try {
              const raw = project.budget ? JSON.parse(project.budget) : null;
              if (raw) {
                if (Array.isArray(raw.lines)) {
                  budgetLines = raw.lines.length ? raw.lines : budgetLines;
                } else {
                  // Ancien format { poste: montant }
                  budgetLines = Object.entries(raw).map(([label, amount]) => ({
                    label,
                    amount: String(amount ?? ""),
                  }));
                }
                if (raw.conditions) {
                  conditions = {
                    fundingType: raw.conditions.type === "EQUITY" ? "EQUITY" : "DEBT",
                    rate: raw.conditions.rate ? String(raw.conditions.rate) : "",
                    ratePeriod: raw.conditions.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL",
                    duration: raw.conditions.duration ? String(raw.conditions.duration) : "6",
                  };
                }
                if (raw.forecasts) {
                  forecasts = {
                    expectedRevenue: raw.forecasts.expectedRevenue
                      ? String(raw.forecasts.expectedRevenue)
                      : "",
                    repaymentSource: raw.forecasts.repaymentSource ?? REPAYMENT_SOURCES[0],
                    revenueDetails: raw.forecasts.revenueDetails ?? "",
                  };
                }
                if (raw.documents && typeof raw.documents === "object") {
                  documents = raw.documents;
                }
              }
            } catch {
              /* budget illisible : on repart d'un budget vierge */
            }

            setForm((f) => ({
              ...f,
              title: project.title ?? "",
              description: project.description ?? "",
              projectSector: project.sector ?? "",
              city: project.city ?? "",
              requestedAmount: project.requestedAmount ? String(project.requestedAmount) : "",
              ownContribution: project.ownContribution ? String(project.ownContribution) : "",
              budgetLines,
              documents,
              ...conditions,
              ...forecasts,
            }));
            setDraftSaved(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Simulation financière (étape Conditions) */
  const simulation = useMemo(() => {
    const requested = parseAmount(form.requestedAmount);
    if (requested <= 0) return null;
    const net = calculateNetReceived(requested);
    if (form.fundingType === "EQUITY") {
      return {
        investorInterest: null,
        annualFee: null,
        initialCommission: net.commission,
        totalCost: net.commission,
        netReceived: net.netReceived,
        totalPayment: null as number | null,
      };
    }
    const rateBps = parseRate(form.rate);
    const duration = parseInt(form.duration, 10) || 0;
    if (rateBps <= 0 || duration <= 0) return null;
    const cost = calculateTotalCostForEnterprise(
      requested,
      rateBps,
      form.ratePeriod,
      duration
    );
    return { ...cost, netReceived: net.netReceived };
  }, [form.requestedAmount, form.rate, form.ratePeriod, form.duration, form.fundingType]);

  /* Budget */
  const budgetTotal = form.budgetLines.reduce((s, l) => s + parseAmount(l.amount), 0);
  const contribution = parseAmount(form.ownContribution);
  const financing = parseAmount(form.requestedAmount);
  const budgetBalanced = budgetTotal > 0 && budgetTotal === financing + contribution;

  const updateLine = (index: number, field: keyof BudgetLine, value: string) => {
    setForm((f) => ({
      ...f,
      budgetLines: f.budgetLines.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));
  };
  const addLine = () =>
    setForm((f) => ({ ...f, budgetLines: [...f.budgetLines, { label: "", amount: "" }] }));
  const removeLine = (index: number) =>
    setForm((f) => ({
      ...f,
      budgetLines: f.budgetLines.filter((_, i) => i !== index),
    }));

  /* Validation par étape */
  const validateStep = (target: number): boolean => {
    const nextErrors: Record<string, string> = {};
    if (target > 0 && !form.companyName.trim()) nextErrors.companyName = "Nom de l'entreprise requis";
    if (target > 1) {
      if (!form.title.trim()) nextErrors.title = "Titre du projet requis";
      if (!form.description.trim()) nextErrors.description = "Description requise";
    }
    if (target > 2) {
      if (financing <= 0) nextErrors.requestedAmount = "Indiquez le montant recherché";
      if (form.fundingType === "DEBT") {
        if (parseRate(form.rate) <= 0) nextErrors.rate = "Indiquez le taux proposé";
      } else if (parseRate(form.rate) <= 0) {
        nextErrors.rate = "Indiquez la part de capital cédée";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step + 1)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (target: number) => {
    if (target < step) setStep(target);
  };

  /* Construction du payload API */
  const buildPayload = () => {
    const requested = financing;
    const own = contribution;
    const lines = form.budgetLines
      .map((l) => ({ label: l.label.trim(), amount: parseAmount(l.amount) }))
      .filter((l) => l.label && l.amount > 0);
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      sector: form.projectSector || form.companySector,
      country: form.country,
      city: form.city,
      totalAmount: requested + own,
      ownContribution: own,
      requestedAmount: requested,
      budget: JSON.stringify({
        lines,
        conditions: {
          type: form.fundingType,
          rate: parseRate(form.rate),
          ratePeriod: form.ratePeriod,
          duration: parseInt(form.duration, 10) || 0,
        },
        forecasts: {
          expectedRevenue: parseAmount(form.expectedRevenue),
          repaymentSource: form.repaymentSource,
          revenueDetails: form.revenueDetails,
        },
        documents: form.documents,
      }),
      usageDescription: form.revenueDetails.trim() || `Source de remboursement : ${form.repaymentSource}`,
    };
  };

  /* Sauvegarde brouillon (sans quitter le formulaire) */
  const saveDraft = async () => {
    if (!form.title.trim()) {
      setErrors((e) => ({ ...e, title: "Donnez un titre à votre projet pour enregistrer le brouillon" }));
      setStep(1);
      return;
    }
    setSavingDraft(true);
    setSubmitError(null);
    try {
      const payload = buildPayload();
      if (draftId) {
        const res = await fetch(`/api/projects/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save failed");
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save failed");
        const project = await res.json();
        setDraftId(project.id);
      }
      setDraftSaved(true);
    } catch {
      setSubmitError("Impossible d'enregistrer le brouillon. Réessayez.");
    } finally {
      setSavingDraft(false);
    }
  };

  /* Dépôt final : POST (ou PATCH si brouillon existant) puis soumission */
  const submitProject = async () => {
    for (let s = 0; s <= step; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildPayload();
      let projectId = draftId;
      if (projectId) {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save failed");
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("save failed");
        const project = await res.json();
        projectId = project.id;
      }

      // Un dossier renvoyé après complément repart directement en analyse
      const nextStatus = originalStatus === "COMPLEMENT_REQUESTED" ? "UNDER_REVIEW" : "SUBMITTED";
      const patchRes = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, submittedAt: new Date().toISOString() }),
      });
      if (!patchRes.ok) throw new Error("submit failed");

      router.push(`/entreprise/projet/${projectId}`);
    } catch {
      setSubmitError("Le dépôt a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <EntrepriseShell
      title="Dépôt de projet"
      subtitle="Constituez votre dossier en 7 étapes. La qualité de vos réponses accélère l'analyse."
      actions={
        draftId ? (
          <Link href={`/entreprise/projet/${draftId}`}>
            <Button variant="secondary" size="sm" icon={<FolderOpen className="h-4 w-4" />}>
              Voir le dossier
            </Button>
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#101010]/40">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ===== Progression ===== */}
          <Card padding="sm">
            <div className="px-2 pt-2">
              <ProgressBar
                value={step + 1}
                max={STEPS.length}
                label={`Étape ${step + 1} sur ${STEPS.length} — ${currentStep.label}`}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto px-2 pb-2 pt-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    disabled={i >= step}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[#101010] text-white"
                        : done
                          ? "bg-[#EFFBDD] text-[#101010] hover:bg-[#B6FF00]/40"
                          : "text-[#101010]/40"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {draftSaved && draftId && (
            <div className="flex items-center gap-2 rounded-xl border border-[#166534]/20 bg-[#EFFBDD] px-4 py-3 text-sm text-[#166534]">
              <CircleCheck className="h-4 w-4 shrink-0" />
              <p>
                Brouillon enregistré.{" "}
                <Link href={`/entreprise/projet/${draftId}`} className="font-semibold underline">
                  Voir le dossier
                </Link>
              </p>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#C62828]/30 bg-[#C62828]/5 px-4 py-3 text-sm text-[#C62828]">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          {/* ===== Contenu de l'étape ===== */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-[#EFFBDD] flex items-center justify-center">
                <currentStep.icon className="h-5 w-5 text-[#101010]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#101010]/40 font-semibold">
                  Étape {step + 1}
                </p>
                <h2 className="text-lg font-bold text-[#101010]">{currentStep.label}</h2>
              </div>
            </div>

            {step === 0 && (
              <div className="space-y-5">
                <Input
                  label="Nom de l'entreprise"
                  placeholder="Ex. Agro-Alliance SARL"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  error={errors.companyName}
                />
                <Select
                  label="Secteur d'activité"
                  placeholder="Choisir un secteur"
                  options={SECTORS.map((s) => ({ value: s, label: s }))}
                  value={form.companySector}
                  onChange={(e) => set("companySector", e.target.value)}
                />
                <Select
                  label="Forme juridique"
                  options={LEGAL_FORMS.map((f) => ({ value: f, label: f }))}
                  value={form.legalForm}
                  onChange={(e) => set("legalForm", e.target.value)}
                />
                <Select
                  label="Pays"
                  options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                />
                <p className="text-xs text-[#101010]/50">
                  Ces informations sont pré-remplies depuis votre profil société.{" "}
                  <Link href="/entreprise" className="underline">
                    Mettre à jour ma société
                  </Link>
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <Input
                  label="Titre du projet"
                  placeholder="Ex. Financement campagne anacarde 2026"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  error={errors.title}
                  hint="C'est le titre que verront les investisseurs."
                />
                <Textarea
                  label="Description du projet"
                  placeholder="Décrivez le besoin, l'usage des fonds et l'impact attendu…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  error={errors.description}
                />
                <Select
                  label="Secteur du projet"
                  placeholder="Choisir un secteur"
                  options={SECTORS.map((s) => ({ value: s, label: s }))}
                  value={form.projectSector}
                  onChange={(e) => set("projectSector", e.target.value)}
                />
                <Input
                  label="Ville d'implantation"
                  placeholder="Ex. Abidjan"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Dette vs Équité */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set("fundingType", "DEBT")}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      form.fundingType === "DEBT"
                        ? "border-[#B6FF00] bg-[#EFFBDD]"
                        : "border-[#101010]/10 hover:border-[#101010]/25"
                    }`}
                  >
                    <Landmark className="h-5 w-5 text-[#101010]" />
                    <p className="font-bold text-[#101010] mt-2">Dette</p>
                    <p className="text-xs text-[#101010]/60 mt-1">
                      Vous empruntez et remboursez selon un échéancier fixe : capital + intérêts. Le
                      taux et la durée sont contractuels.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("fundingType", "EQUITY")}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      form.fundingType === "EQUITY"
                        ? "border-[#B6FF00] bg-[#EFFBDD]"
                        : "border-[#101010]/10 hover:border-[#101010]/25"
                    }`}
                  >
                    <ChartPie className="h-5 w-5 text-[#101010]" />
                    <p className="font-bold text-[#101010] mt-2">Équité</p>
                    <p className="text-xs text-[#101010]/60 mt-1">
                      Les investisseurs deviennent associés : pas d&apos;échéancier, partage des
                      résultats et des risques selon la performance réelle.
                    </p>
                  </button>
                </div>

                {form.fundingType === "DEBT" ? (
                  <>
                    {/* Période de référence du taux */}
                    <div>
                      <p className="text-sm font-medium text-[#101010] mb-2">
                        Période de référence du taux
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => set("ratePeriod", "TOTAL")}
                          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                            form.ratePeriod === "TOTAL"
                              ? "bg-[#101010] text-white"
                              : "bg-[#F5F5F3] text-[#101010]/60 hover:text-[#101010]"
                          }`}
                        >
                          Au total (toute la durée)
                        </button>
                        <button
                          type="button"
                          onClick={() => set("ratePeriod", "ANNUAL")}
                          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                            form.ratePeriod === "ANNUAL"
                              ? "bg-[#101010] text-white"
                              : "bg-[#F5F5F3] text-[#101010]/60 hover:text-[#101010]"
                          }`}
                        >
                          Par an
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Taux proposé aux investisseurs (%)"
                        placeholder="Ex. 8"
                        inputMode="decimal"
                        value={form.rate}
                        onChange={(e) => set("rate", e.target.value)}
                        error={errors.rate}
                      />
                      <Select
                        label="Durée du financement"
                        options={DURATIONS}
                        value={form.duration}
                        onChange={(e) => set("duration", e.target.value)}
                      />
                      <Input
                        label="Montant recherché (FCFA)"
                        placeholder="Ex. 35 000 000"
                        inputMode="numeric"
                        value={form.requestedAmount}
                        onChange={(e) => set("requestedAmount", e.target.value)}
                        onBlur={(e) => set("requestedAmount", formatAmountInput(e.target.value))}
                        error={errors.requestedAmount}
                      />
                    </div>

                    {/* Explication cruciale : total ≠ annuel */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-bold">
                            &laquo; 8 % au total sur 6 mois &raquo; &ne; &laquo; 8 % par an &raquo;
                          </p>
                          <ul className="mt-2 space-y-1 text-xs leading-relaxed list-disc pl-4">
                            <li>
                              <strong>Taux au total :</strong> un investisseur qui place 100 000 FCFA
                              reçoit 8 000 FCFA d&apos;intérêts pour <strong>toute</strong> la
                              durée, soit l&apos;équivalent de ~16 % par an sur 6 mois.
                            </li>
                            <li>
                              <strong>Taux par an :</strong> 100 000 FCFA sur 6 mois rapportent
                              8 % &times; 6/12 = <strong>4 000 FCFA au total</strong>.
                            </li>
                          </ul>
                          <p className="text-xs mt-2">
                            La période choisie sera affichée en clair aux investisseurs — restez
                            cohérent pour éviter toute contestation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Part de capital cédée aux investisseurs (%)"
                      placeholder="Ex. 12"
                      inputMode="decimal"
                      value={form.rate}
                      onChange={(e) => set("rate", e.target.value)}
                      error={errors.rate}
                      hint="En équité, il n'y a pas de remboursement fixe : les investisseurs sont rémunérés selon les résultats distribués."
                    />
                    <Select
                      label="Horizon de sortie (mois)"
                      options={DURATIONS}
                      value={form.duration}
                      onChange={(e) => set("duration", e.target.value)}
                    />
                    <Input
                      label="Montant recherché (FCFA)"
                      placeholder="Ex. 35 000 000"
                      inputMode="numeric"
                      value={form.requestedAmount}
                      onChange={(e) => set("requestedAmount", e.target.value)}
                      onBlur={(e) => set("requestedAmount", formatAmountInput(e.target.value))}
                      error={errors.requestedAmount}
                    />
                  </div>
                )}

                {/* Simulation financière */}
                {simulation && (
                  <div className="rounded-xl bg-[#EFFBDD] border border-[#B6FF00]/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#101010]/60">
                      Modélisation prévisionnelle
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <Row
                        label={form.fundingType === "DEBT" ? "Intérêts versés aux investisseurs" : "Rémunération selon résultats"}
                        value={simulation.investorInterest !== null ? formatFCFA(simulation.investorInterest) : "Variable"}
                      />
                      {simulation.annualFee !== null && (
                        <Row label="Frais de suivi Nexora (2 %/an, prorata durée)" value={formatFCFA(simulation.annualFee)} />
                      )}
                      <Row
                        label="Commission initiale Nexora (6 %, déduite au décaissement)"
                        value={`- ${formatFCFA(simulation.initialCommission)}`}
                      />
                      <div className="border-t border-[#101010]/10 pt-2">
                        <Row
                          label="Net reçu au décaissement"
                          value={formatFCFA(simulation.netReceived)}
                          strong
                        />
                      </div>
                      {simulation.totalPayment !== null && (
                        <Row
                          label="Total à rembourser sur la durée (capital + intérêts + frais)"
                          value={formatFCFA(simulation.totalPayment)}
                          strong
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-[#101010]/50 mt-3">
                      Chiffres indicatifs, soumis à validation par le comité Nexora.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm text-[#101010]/60">
                  Répartissez le montant total du projet (financement + apport) en postes
                  budgétaires. Un budget détaillé renforce la confiance des investisseurs.
                </p>

                <div className="space-y-3">
                  {form.budgetLines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Input
                        placeholder={`Poste ${i + 1} — ex. Achat de matières`}
                        value={line.label}
                        onChange={(e) => updateLine(i, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Montant (FCFA)"
                        inputMode="numeric"
                        value={line.amount}
                        onChange={(e) => updateLine(i, "amount", e.target.value)}
                        onBlur={(e) => updateLine(i, "amount", formatAmountInput(e.target.value))}
                        className="w-40"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={form.budgetLines.length === 1}
                        aria-label="Supprimer la ligne"
                        className="p-2.5 mt-0.5 rounded-lg text-[#101010]/40 hover:text-[#C62828] hover:bg-[#C62828]/5 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addLine}>
                  Ajouter un poste
                </Button>

                <Input
                  label="Apport propre de l'entreprise (FCFA)"
                  placeholder="Ex. 10 000 000"
                  inputMode="numeric"
                  value={form.ownContribution}
                  onChange={(e) => set("ownContribution", e.target.value)}
                  onBlur={(e) => set("ownContribution", formatAmountInput(e.target.value))}
                  hint="Les investisseurs apprécient un apport significatif : il montre votre engagement."
                />

                <div
                  className={`rounded-xl border p-4 text-sm ${
                    budgetBalanced
                      ? "border-[#166534]/20 bg-[#EFFBDD] text-[#166534]"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Total budgété</span>
                    <span className="font-bold">{formatFCFA(budgetTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span>Financement ({formatFCFA(financing)}) + apport ({formatFCFA(contribution)})</span>
                    <span className="font-semibold">{formatFCFA(financing + contribution)}</span>
                  </div>
                  <p className="text-xs mt-2">
                    {budgetBalanced
                      ? "Budget équilibré : le total des postes couvre exactement le projet."
                      : "Ajustez vos postes pour que le total corresponde au financement + l'apport."}
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <Input
                  label="Revenus mensuels attendus grâce au projet (FCFA)"
                  placeholder="Ex. 12 500 000"
                  inputMode="numeric"
                  value={form.expectedRevenue}
                  onChange={(e) => set("expectedRevenue", e.target.value)}
                  onBlur={(e) => set("expectedRevenue", formatAmountInput(e.target.value))}
                />
                <Select
                  label="Source principale de remboursement"
                  options={REPAYMENT_SOURCES.map((s) => ({ value: s, label: s }))}
                  value={form.repaymentSource}
                  onChange={(e) => set("repaymentSource", e.target.value)}
                />
                <Textarea
                  label="Détaillez vos prévisions"
                  placeholder="Ex. Contrats déjà signés avec 3 acheteurs pour un volume de 400 t, encaissements étalés de juin à octobre…"
                  value={form.revenueDetails}
                  onChange={(e) => set("revenueDetails", e.target.value)}
                  hint="Ces éléments seront vérifiés par l'équipe d'analyse lors de l'instruction du dossier."
                />
                <div className="flex items-start gap-2 text-xs text-[#101010]/60">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-[#B6FF00]" />
                  <p>
                    Une prévision crédible et documentée est le premier critère d&apos;acceptation
                    des dossiers par le comité des risques.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-[#101010]/60">
                  Ajoutez les pièces justificatives. La vérification documentaire fait partie du
                  protocole d&apos;analyse en 4 yeux.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DOC_SLOTS.map((slot) => {
                    const fileName = form.documents[slot.id] ?? null;
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                          fileName
                            ? "border-[#166534]/30 bg-[#EFFBDD]"
                            : "border-[#101010]/15 hover:border-[#B6FF00] bg-[#F5F5F3]/50"
                        }`}
                      >
                        <input
                          type="file"
                          id={`doc-${slot.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const name = e.target.files?.[0]?.name;
                            if (name) {
                              setForm((f) => ({
                                ...f,
                                documents: { ...f.documents, [slot.id]: name },
                              }));
                            }
                          }}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#101010]">{slot.label}</p>
                            <p className="text-xs text-[#101010]/50 mt-0.5">{slot.desc}</p>
                          </div>
                          {fileName ? (
                            <CircleCheck className="h-5 w-5 text-[#166534] shrink-0" />
                          ) : (
                            <FileUp className="h-5 w-5 text-[#101010]/30 shrink-0" />
                          )}
                        </div>
                        {fileName ? (
                          <div className="flex items-center justify-between gap-2 mt-3">
                            <span className="text-xs font-medium text-[#101010] truncate">{fileName}</span>
                            <button
                              type="button"
                              aria-label="Retirer le fichier"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  documents: { ...f.documents, [slot.id]: null },
                                }))
                              }
                              className="p-1 rounded text-[#101010]/40 hover:text-[#C62828]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`doc-${slot.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101010]/60 hover:text-[#101010] mt-3 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Joindre un fichier
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#101010]/40">
                  Upload simulé : aucun fichier n&apos;est réellement transmis à ce stade. Les
                  pièces originales vous seront demandées par l&apos;analyste en charge.
                </p>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <RecapSection
                  title="Entreprise"
                  onEdit={() => goTo(0)}
                  rows={[
                    ["Nom", form.companyName || "—"],
                    ["Secteur", form.companySector || "—"],
                    ["Forme juridique", form.legalForm],
                    ["Pays", form.country],
                  ]}
                />
                <RecapSection
                  title="Projet"
                  onEdit={() => goTo(1)}
                  rows={[
                    ["Titre", form.title || "—"],
                    ["Secteur", form.projectSector || form.companySector || "—"],
                    ["Ville", form.city || "—"],
                    ["Description", form.description || "—"],
                  ]}
                />
                <RecapSection
                  title="Conditions"
                  onEdit={() => goTo(2)}
                  rows={[
                    [
                      "Type",
                      form.fundingType === "DEBT" ? "Dette (échéancier fixe)" : "Équité (participation au capital)",
                    ],
                    form.fundingType === "DEBT"
                      ? [
                          "Taux",
                          `${form.rate || "—"} % ${form.ratePeriod === "TOTAL" ? "au total" : "par an"} sur ${form.duration} mois`,
                        ]
                      : ["Part de capital cédée", `${form.rate || "—"} %`],
                    ["Montant recherché", financing > 0 ? formatFCFA(financing) : "—"],
                    ["Apport propre", contribution > 0 ? formatFCFA(contribution) : "Aucun"],
                  ]}
                />
                <RecapSection
                  title="Budget"
                  onEdit={() => goTo(3)}
                  rows={[
                    ...form.budgetLines
                      .filter((l) => l.label && parseAmount(l.amount) > 0)
                      .map((l) => [l.label, formatFCFA(parseAmount(l.amount))] as [string, string]),
                    ["Total budgété", formatFCFA(budgetTotal)],
                  ]}
                />
                <RecapSection
                  title="Prévisions"
                  onEdit={() => goTo(4)}
                  rows={[
                    [
                      "Revenus mensuels attendus",
                      parseAmount(form.expectedRevenue) ? formatFCFA(parseAmount(form.expectedRevenue)) : "—",
                    ],
                    ["Source de remboursement", form.repaymentSource],
                  ]}
                />
                <RecapSection
                  title="Documents"
                  onEdit={() => goTo(5)}
                  rows={[
                    [
                      "Pièces jointes",
                      `${
                        Object.values(form.documents).filter(Boolean).length
                      } / ${DOC_SLOTS.length} documents`,
                    ],
                  ]}
                />

                <div className="rounded-xl bg-[#F5F5F3] p-4 text-xs text-[#101010]/60">
                  En déposant ce dossier, vous certifiez l&apos;exactitude des informations
                  fournies. L&apos;équipe d&apos;analyse reviendra vers vous sous 5 jours ouvrés —
                  un complément peut vous être demandé avant décision du comité.
                </div>
              </div>
            )}

            {/* ===== Navigation ===== */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-[#101010]/10">
              <Button
                variant="secondary"
                onClick={goPrev}
                disabled={step === 0}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Précédent
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={saveDraft}
                  loading={savingDraft}
                  icon={<Save className="h-4 w-4" />}
                >
                  Sauvegarder le brouillon
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button onClick={goNext} icon={<ArrowRight className="h-4 w-4" />}>
                    Suivant
                  </Button>
                ) : (
                  <Button onClick={submitProject} loading={submitting} icon={<Send className="h-4 w-4" />}>
                    Déposer le dossier pour analyse
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Aide contextuelle : que se passera-t-il ensuite ? */}
          <div className="flex items-start gap-3 rounded-xl bg-white border border-[#101010]/5 p-4">
            <ChevronRight className="h-4 w-4 text-[#B6FF00] shrink-0 mt-1" />
            <p className="text-xs text-[#101010]/60 leading-relaxed">
              <strong className="text-[#101010]">Et ensuite ?</strong> Une fois déposé, votre dossier
              passe par l&apos;analyse (sous 5 jours ouvrés), la décision du comité, puis la
              publication de l&apos;offre aux investisseurs. Vous suivez chaque étape depuis la page
              de suivi de votre dossier.
            </p>
          </div>
        </div>
      )}
    </EntrepriseShell>
  );
}

/* ============================== Sous-composants ============================== */

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#101010]/70">{label}</span>
      <span className={`text-right ${strong ? "font-bold text-[#101010]" : "font-medium text-[#101010]"}`}>
        {value}
      </span>
    </div>
  );
}

function RecapSection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<[string, string]>;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#101010]/10 overflow-hidden">
      <div className="flex items-center justify-between bg-[#F5F5F3] px-4 py-2.5">
        <p className="text-sm font-bold text-[#101010]">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#101010]/50 hover:text-[#101010]"
        >
          <SquarePen className="h-3.5 w-3.5" /> Modifier
        </button>
      </div>
      <dl className="px-4 py-3 space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-[#101010]/50 shrink-0">{label}</dt>
            <dd className="text-[#101010] font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#101010]">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className={`w-full px-4 py-3 rounded-lg border bg-white text-sm text-[#101010] placeholder:text-[#101010]/40 outline-none transition-all focus:ring-2 focus:ring-[#B6FF00]/40 focus:border-[#B6FF00] resize-y ${
          error ? "border-[#C62828]" : "border-[#101010]/10"
        }`}
      />
      {error && <p className="text-xs text-[#C62828]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#101010]/50">{hint}</p>}
    </div>
  );
}
