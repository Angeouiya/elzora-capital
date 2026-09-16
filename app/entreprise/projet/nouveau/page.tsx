"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Building2,
  Check,
  CheckCircle2,
  FileUp,
  FolderOpen,
  Landmark,
  ListChecks,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { EntrepriseShell } from "@/components/entreprise/EntrepriseShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import {
  calculateAdvancedEnterpriseCost,
  calculateOwnContributionRatio,
  formatFCFA,
} from "@/lib/calculations";

const STEPS = [
  { label: "Entreprise", icon: Building2 },
  { label: "Projet", icon: FolderOpen },
  { label: "Conditions", icon: BadgePercent },
  { label: "Budget", icon: WalletCards },
  { label: "Prévisions", icon: TrendingUp },
  { label: "Pièces", icon: FileUp },
  { label: "Récapitulatif", icon: ListChecks },
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

const COUNTRIES = ["Côte d'Ivoire", "Sénégal", "Bénin", "Togo", "Burkina Faso", "Mali", "Guinée", "Ghana"];
const DURATIONS = [3, 6, 9, 12, 18, 24, 36, 48, 60].map((value) => ({ value: String(value), label: `${value} mois` }));
const SOURCES = [
  "Revenus d'exploitation",
  "Encaissements de contrats signés",
  "Ventes de stock / campagne",
  "Cession d'actifs",
  "Apport associé / subvention",
  "Refinancement autorisé",
  "Autre",
];
const DOCUMENTS = [
  ["registration", "RCCM / immatriculation"],
  ["financials", "États financiers disponibles"],
  ["businessPlan", "Business plan / projections"],
  ["tax", "Situation fiscale"],
  ["bank", "Justificatifs bancaires"],
  ["contracts", "Contrats commerciaux utiles"],
  ["guarantees", "Justificatifs de garanties"],
] as const;

type BudgetLine = { label: string; amount: string };
type FormState = {
  companyName: string;
  companySector: string;
  legalForm: string;
  country: string;
  title: string;
  description: string;
  projectSector: string;
  city: string;
  fundingType: "DEBT" | "EQUITY";
  requestedAmount: string;
  ownContribution: string;
  rate: string;
  ratePeriod: "TOTAL" | "ANNUAL";
  duration: string;
  minTicket: string;
  maxTicket: string;
  minimumGoal: string;
  paymentFrequency: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "AT_MATURITY";
  repaymentMode: "BULLET" | "AMORTIZING";
  graceMonths: string;
  interestBase: "ORIGINAL_PRINCIPAL" | "OUTSTANDING_PRINCIPAL";
  earlyRepayment: "ALLOWED" | "WITH_CONDITIONS" | "NOT_ALLOWED";
  guaranteeSummary: string;
  guaranteeRank: string;
  equityPercent: string;
  preMoneyValuation: string;
  exitHorizon: string;
  budgetLines: BudgetLine[];
  expectedRevenue: string;
  repaymentSource: string;
  forecastDetails: string;
  documents: Record<string, string | null>;
};

const INITIAL: FormState = {
  companyName: "",
  companySector: "",
  legalForm: "SARL",
  country: "Côte d'Ivoire",
  title: "",
  description: "",
  projectSector: "",
  city: "",
  fundingType: "DEBT",
  requestedAmount: "",
  ownContribution: "",
  rate: "",
  ratePeriod: "TOTAL",
  duration: "12",
  minTicket: "10 000",
  maxTicket: "5 000 000",
  minimumGoal: "",
  paymentFrequency: "MONTHLY",
  repaymentMode: "BULLET",
  graceMonths: "0",
  interestBase: "ORIGINAL_PRINCIPAL",
  earlyRepayment: "ALLOWED",
  guaranteeSummary: "",
  guaranteeRank: "",
  equityPercent: "",
  preMoneyValuation: "",
  exitHorizon: "36",
  budgetLines: [{ label: "", amount: "" }],
  expectedRevenue: "",
  repaymentSource: SOURCES[0],
  forecastDetails: "",
  documents: {},
};

function parseAmount(value: string) {
  return Number.parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

function parsePercent(value: string) {
  return Math.round((Number.parseFloat(value.replace(",", ".")) || 0) * 100);
}

function formatAmountInput(value: string) {
  const number = parseAmount(value);
  return number ? number.toLocaleString("fr-FR").replace(/\u202f/g, " ") : "";
}

function formatPercentBps(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
}

export default function NouveauProjetPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const companyResponse = await fetch("/api/companies");
        if (companyResponse.ok) {
          const companies = (await companyResponse.json()) as Array<{
            name?: string;
            sector?: string;
            legalForm?: string;
            country?: string;
          }>;
          const company = companies[0];
          if (company && !cancelled) {
            setForm((current) => ({
              ...current,
              companyName: company.name ?? "",
              companySector: company.sector ?? "",
              legalForm: company.legalForm ?? "SARL",
              country: company.country ?? "Côte d'Ivoire",
            }));
          }
        }

        const draft = new URLSearchParams(window.location.search).get("draft");
        if (!draft) return;

        const response = await fetch(`/api/projects/${draft}`);
        if (!response.ok) return;
        const project = await response.json();
        if (cancelled) return;

        let budget: Record<string, unknown> = {};
        try {
          budget = JSON.parse(project.budget || "{}");
        } catch {
          budget = {};
        }
        const conditions = (budget.conditions && typeof budget.conditions === "object" ? budget.conditions : {}) as Record<string, unknown>;
        const forecasts = (budget.forecasts && typeof budget.forecasts === "object" ? budget.forecasts : {}) as Record<string, unknown>;
        const docs = (budget.documents && typeof budget.documents === "object" ? budget.documents : {}) as Record<string, string | null>;
        const lines = Array.isArray(budget.lines)
          ? (budget.lines as Array<{ label?: string; amount?: number }>).map((line) => ({
              label: line.label ?? "",
              amount: formatAmountInput(String(line.amount ?? "")),
            }))
          : [{ label: "", amount: "" }];
        const type: "DEBT" | "EQUITY" = conditions.type === "EQUITY" ? "EQUITY" : "DEBT";

        setDraftId(project.id);
        setForm((current) => ({
          ...current,
          title: project.title ?? "",
          description: project.description ?? "",
          projectSector: project.sector ?? "",
          city: project.city ?? "",
          requestedAmount: formatAmountInput(String(project.requestedAmount ?? "")),
          ownContribution: formatAmountInput(String(project.ownContribution ?? "")),
          fundingType: type,
          rate: type === "DEBT" ? formatPercentBps(Number(conditions.rateBps ?? conditions.rate ?? 0)) : "",
          ratePeriod: conditions.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL",
          duration: String(conditions.durationMonths ?? conditions.duration ?? 12),
          minTicket: formatAmountInput(String(conditions.minTicket ?? 10000)),
          maxTicket: formatAmountInput(String(conditions.maxTicket ?? 5000000)),
          minimumGoal: formatAmountInput(String(conditions.minimumGoal ?? project.requestedAmount ?? "")),
          paymentFrequency: (["MONTHLY", "QUARTERLY", "SEMIANNUAL", "AT_MATURITY"].includes(String(conditions.paymentFrequency))
            ? conditions.paymentFrequency
            : "MONTHLY") as FormState["paymentFrequency"],
          repaymentMode: conditions.repaymentMode === "AMORTIZING" ? "AMORTIZING" : "BULLET",
          graceMonths: String(conditions.graceMonths ?? 0),
          interestBase: conditions.interestBase === "OUTSTANDING_PRINCIPAL" ? "OUTSTANDING_PRINCIPAL" : "ORIGINAL_PRINCIPAL",
          earlyRepayment: (["ALLOWED", "WITH_CONDITIONS", "NOT_ALLOWED"].includes(String(conditions.earlyRepayment))
            ? conditions.earlyRepayment
            : "ALLOWED") as FormState["earlyRepayment"],
          guaranteeSummary: String(conditions.guaranteeSummary ?? ""),
          guaranteeRank: String(conditions.guaranteeRank ?? ""),
          equityPercent: type === "EQUITY" ? formatPercentBps(Number(conditions.equityPercentBps ?? conditions.rate ?? 0)) : "",
          preMoneyValuation: formatAmountInput(String(conditions.preMoneyValuation ?? "")),
          exitHorizon: String(conditions.exitHorizonMonths ?? conditions.duration ?? 36),
          budgetLines: lines.length ? lines : [{ label: "", amount: "" }],
          expectedRevenue: formatAmountInput(String(forecasts.expectedRevenue ?? "")),
          repaymentSource: String(forecasts.repaymentSource ?? SOURCES[0]),
          forecastDetails: String(forecasts.revenueDetails ?? ""),
          documents: docs,
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const requested = parseAmount(form.requestedAmount);
  const ownContribution = parseAmount(form.ownContribution);
  const totalProject = requested + ownContribution;
  const minimumGoal = parseAmount(form.minimumGoal) || requested;
  const budgetTotal = form.budgetLines.reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const ownContributionRatio = calculateOwnContributionRatio(ownContribution, totalProject);

  const debtCost = useMemo(() => {
    if (form.fundingType !== "DEBT" || requested <= 0 || parsePercent(form.rate) <= 0) return null;
    return calculateAdvancedEnterpriseCost({
      principal: requested,
      rateBps: parsePercent(form.rate),
      ratePeriod: form.ratePeriod,
      durationMonths: Number(form.duration) || 1,
      paymentFrequency: form.paymentFrequency,
      repaymentMode: form.repaymentMode,
      graceMonths: Number(form.graceMonths) || 0,
      interestBase: form.interestBase,
    });
  }, [
    form.fundingType,
    form.rate,
    form.ratePeriod,
    form.duration,
    form.paymentFrequency,
    form.repaymentMode,
    form.graceMonths,
    form.interestBase,
    requested,
  ]);

  const validate = (target = step) => {
    const nextErrors: Record<string, string> = {};
    if (target >= 1) {
      if (!form.title.trim()) nextErrors.title = "Titre requis";
      if (!form.description.trim()) nextErrors.description = "Description requise";
      if (!form.projectSector) nextErrors.projectSector = "Secteur requis";
    }
    if (target >= 2) {
      if (requested <= 0) nextErrors.requestedAmount = "Montant recherché requis";
      if (parseAmount(form.minTicket) <= 0) nextErrors.minTicket = "Ticket minimum requis";
      if (parseAmount(form.maxTicket) < parseAmount(form.minTicket)) nextErrors.maxTicket = "Le maximum doit être supérieur au minimum";
      if (minimumGoal <= 0 || minimumGoal > requested) nextErrors.minimumGoal = "Le seuil doit être compris dans le montant recherché";
      if (form.fundingType === "DEBT") {
        if (parsePercent(form.rate) <= 0) nextErrors.rate = "Rémunération proposée requise";
        if (Number(form.graceMonths) >= Number(form.duration)) nextErrors.graceMonths = "Le différé doit être inférieur à la durée";
      } else {
        if (parsePercent(form.equityPercent) <= 0 || parsePercent(form.equityPercent) >= 10000) nextErrors.equityPercent = "Part de capital entre 0 et 100 %";
        if (parseAmount(form.preMoneyValuation) <= 0) nextErrors.preMoneyValuation = "Valorisation pré-money requise";
      }
    }
    if (target >= 3 && budgetTotal !== totalProject) nextErrors.budget = "Le budget doit égaler l'apport propre + le financement recherché";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    sector: form.projectSector || form.companySector,
    country: form.country,
    city: form.city.trim(),
    totalAmount: totalProject,
    ownContribution,
    requestedAmount: requested,
    usageDescription: form.forecastDetails.trim() || `Source de remboursement : ${form.repaymentSource}`,
    budget: JSON.stringify({
      lines: form.budgetLines
        .map((line) => ({ label: line.label.trim(), amount: parseAmount(line.amount) }))
        .filter((line) => line.label && line.amount > 0),
      conditions: {
        type: form.fundingType,
        rate: parsePercent(form.fundingType === "DEBT" ? form.rate : form.equityPercent),
        rateBps: parsePercent(form.rate),
        ratePeriod: form.ratePeriod,
        duration: Number(form.duration) || 1,
        durationMonths: Number(form.duration) || 1,
        minTicket: parseAmount(form.minTicket),
        maxTicket: parseAmount(form.maxTicket),
        minimumGoal,
        paymentFrequency: form.paymentFrequency,
        repaymentMode: form.repaymentMode,
        graceMonths: Number(form.graceMonths) || 0,
        interestBase: form.interestBase,
        earlyRepayment: form.earlyRepayment,
        guaranteeSummary: form.guaranteeSummary.trim(),
        guaranteeRank: form.guaranteeRank.trim(),
        equityPercentBps: parsePercent(form.equityPercent),
        preMoneyValuation: parseAmount(form.preMoneyValuation),
        exitHorizonMonths: Number(form.exitHorizon) || 36,
      },
      forecasts: {
        expectedRevenue: parseAmount(form.expectedRevenue),
        repaymentSource: form.repaymentSource,
        revenueDetails: form.forecastDetails,
      },
      documents: form.documents,
    }),
  });

  const saveDraft = async () => {
    if (!validate(Math.min(step, 3))) return null;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(draftId ? `/api/projects/${draftId}` : "/api/projects", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Enregistrement impossible");
      const id = draftId ?? payload.id;
      if (!draftId) {
        setDraftId(id);
        router.replace(`/entreprise/projet/nouveau?draft=${id}`);
      }
      setMessage("Brouillon enregistré.");
      return id as string;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    for (let target = 1; target <= 3; target += 1) {
      if (!validate(target)) {
        setStep(target);
        return;
      }
    }
    const id = await saveDraft();
    if (!id) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${id}/submit`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(payload.details) ? payload.details.join(" ") : payload.error;
        throw new Error(detail || "Soumission impossible");
      }
      router.push(`/entreprise/projet/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Soumission impossible");
    } finally {
      setSubmitting(false);
    }
  };

  const updateLine = (index: number, key: keyof BudgetLine, value: string) => {
    setField(
      "budgetLines",
      form.budgetLines.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [key]: value } : line
      )
    );
  };

  const setDocument = (key: string, event: ChangeEvent<HTMLInputElement>) => {
    setField("documents", { ...form.documents, [key]: event.target.files?.[0]?.name ?? null });
  };

  if (loading) {
    return (
      <EntrepriseShell title="Demande de financement" subtitle="Chargement de votre dossier…">
        <div className="nx-skeleton h-80" />
      </EntrepriseShell>
    );
  }

  return (
    <EntrepriseShell
      title="Demande de financement"
      subtitle="Présentez vos conditions économiques. Notre équipe analyse le dossier puis structure une offre finale distincte."
      actions={
        draftId ? (
          <Link href={`/entreprise/projet/${draftId}`}>
            <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Voir le dossier
            </Button>
          </Link>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <Card padding="sm">
          <ProgressBar value={step + 1} max={STEPS.length} label={`Étape ${step + 1}/${STEPS.length} · ${STEPS[step].label}`} />
          <div className="nx-scroll-strip mt-3 pb-1">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={index > step}
                  onClick={() => index <= step && setStep(index)}
                  className={`nx-chip ${index === step ? "!border-[#101010] !bg-[#101010] !text-white" : index < step ? "!bg-[#EFFBDD]" : ""}`}
                >
                  {index < step ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </Card>

        {message && (
          <div className="rounded-[14px] border border-[#101010]/8 bg-white px-4 py-3 text-sm text-[#101010]/65">
            {message}
          </div>
        )}

        <Card padding="lg">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[#EFFBDD] text-sm font-bold">{step + 1}</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#101010]/40">Constitution du dossier</p>
              <h2 className="text-xl font-bold">{STEPS[step].label}</h2>
            </div>
          </div>

          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Entreprise" value={form.companyName} readOnly />
              <Input label="Secteur" value={form.companySector} readOnly />
              <Input label="Forme juridique" value={form.legalForm} readOnly />
              <Select label="Pays du projet" options={COUNTRIES.map((country) => ({ value: country, label: country }))} value={form.country} onChange={(event) => setField("country", event.target.value)} />
              <div className="md:col-span-2 rounded-[14px] bg-[#F5F5F3] p-4 text-sm text-[#101010]/60">
                L'identité de l'entreprise et l'approbation du financement sont deux contrôles distincts. <Link className="font-semibold underline" href="/entreprise">Mettre à jour la société</Link>.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input label="Titre du projet" value={form.title} onChange={(event) => setField("title", event.target.value)} error={errors.title} placeholder="Ex. Extension de la ligne de transformation" />
              <TextArea label="Description, besoin concret et impact attendu" value={form.description} onChange={(value) => setField("description", value)} error={errors.description} />
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Secteur du projet" options={SECTORS.map((sector) => ({ value: sector, label: sector }))} placeholder="Choisir" value={form.projectSector} onChange={(event) => setField("projectSector", event.target.value)} error={errors.projectSector} />
                <Input label="Ville / localisation" value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="Ex. Abidjan" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                <Choice active={form.fundingType === "DEBT"} title="Dette / obligation" text="Capital remboursable avec rémunération et échéancier contractuel." onClick={() => setField("fundingType", "DEBT")} icon={<Landmark />} />
                <Choice active={form.fundingType === "EQUITY"} title="Participation au capital" text="Les investisseurs acquièrent des titres. Aucun remboursement fixe n'est promis." onClick={() => setField("fundingType", "EQUITY")} icon={<BadgePercent />} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Money label="Montant recherché" value={form.requestedAmount} setValue={(value) => setField("requestedAmount", value)} error={errors.requestedAmount} />
                <Money label="Seuil minimum de collecte" value={form.minimumGoal} setValue={(value) => setField("minimumGoal", value)} error={errors.minimumGoal} hint="Si ce seuil n'est pas atteint, la collecte peut être considérée insuffisante." />
                <Money label="Ticket minimum investisseur" value={form.minTicket} setValue={(value) => setField("minTicket", value)} error={errors.minTicket} />
                <Money label="Ticket maximum investisseur" value={form.maxTicket} setValue={(value) => setField("maxTicket", value)} error={errors.maxTicket} />
              </div>

              {form.fundingType === "DEBT" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input label="Rémunération proposée (%)" value={form.rate} onChange={(event) => setField("rate", event.target.value)} error={errors.rate} inputMode="decimal" />
                    <Select label="Période du taux" options={[{ value: "TOTAL", label: "Total sur la durée" }, { value: "ANNUAL", label: "Par an" }]} value={form.ratePeriod} onChange={(event) => setField("ratePeriod", event.target.value as FormState["ratePeriod"])} />
                    <Select label="Durée" options={DURATIONS} value={form.duration} onChange={(event) => setField("duration", event.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Fréquence de paiement" options={[{ value: "MONTHLY", label: "Mensuelle" }, { value: "QUARTERLY", label: "Trimestrielle" }, { value: "SEMIANNUAL", label: "Semestrielle" }, { value: "AT_MATURITY", label: "À l'échéance" }]} value={form.paymentFrequency} onChange={(event) => setField("paymentFrequency", event.target.value as FormState["paymentFrequency"])} />
                    <Select label="Remboursement du capital" options={[{ value: "BULLET", label: "In fine" }, { value: "AMORTIZING", label: "Progressif / amortissable" }]} value={form.repaymentMode} onChange={(event) => setField("repaymentMode", event.target.value as FormState["repaymentMode"])} />
                    <Input label="Différé de capital (mois)" value={form.graceMonths} onChange={(event) => setField("graceMonths", event.target.value)} error={errors.graceMonths} inputMode="numeric" />
                    <Select label="Base de calcul des intérêts" options={[{ value: "ORIGINAL_PRINCIPAL", label: "Capital initial" }, { value: "OUTSTANDING_PRINCIPAL", label: "Capital restant dû" }]} value={form.interestBase} onChange={(event) => setField("interestBase", event.target.value as FormState["interestBase"])} />
                    <Select label="Remboursement anticipé" options={[{ value: "ALLOWED", label: "Autorisé" }, { value: "WITH_CONDITIONS", label: "Autorisé sous conditions" }, { value: "NOT_ALLOWED", label: "Non prévu" }]} value={form.earlyRepayment} onChange={(event) => setField("earlyRepayment", event.target.value as FormState["earlyRepayment"])} />
                  </div>
                  <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <strong>Le taux doit être lu avec sa période.</strong> 8 % au total sur 6 mois n'est pas 8 % par an.
                  </div>
                  {debtCost && (
                    <div className="grid gap-3 rounded-[16px] bg-[#101010] p-4 text-white sm:grid-cols-3">
                      <DarkMetric label="Intérêts investisseurs" value={formatFCFA(debtCost.investorInterest)} />
                      <DarkMetric label="Suivi estimé" value={formatFCFA(debtCost.annualFee)} />
                      <DarkMetric label="Service total de la dette" value={formatFCFA(debtCost.totalDebtService)} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input label="Part de capital proposée (%)" value={form.equityPercent} onChange={(event) => setField("equityPercent", event.target.value)} error={errors.equityPercent} inputMode="decimal" />
                    <Money label="Valorisation pré-money" value={form.preMoneyValuation} setValue={(value) => setField("preMoneyValuation", value)} error={errors.preMoneyValuation} />
                    <Select label="Horizon indicatif de sortie" options={DURATIONS} value={form.exitHorizon} onChange={(event) => setField("exitHorizon", event.target.value)} />
                  </div>
                  <div className="rounded-[14px] bg-[#EFFBDD] p-4 text-sm text-[#101010]/65">
                    Une opération en capital ne comporte ni rendement fixe ni échéancier fictif. La valorisation, la dilution et les modalités de sortie doivent figurer dans les conditions finales.
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <TextArea label="Garanties ou sûretés proposées" value={form.guaranteeSummary} onChange={(value) => setField("guaranteeSummary", value)} placeholder="Décrivez les garanties disponibles sans promettre leur valeur de recouvrement." />
                <Input label="Rang / priorité éventuelle" value={form.guaranteeRank} onChange={(event) => setField("guaranteeRank", event.target.value)} placeholder="Ex. 1er rang, pari passu, à confirmer…" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Money label="Apport propre de l'entreprise" value={form.ownContribution} setValue={(value) => setField("ownContribution", value)} hint={`Engagement économique : ${ownContributionRatio.toLocaleString("fr-FR")} % du projet.`} />
                <Summary label="Structure du projet" value={`${formatFCFA(totalProject)} · apport ${formatFCFA(ownContribution)}`} />
              </div>
              <div className="space-y-3">
                {form.budgetLines.map((line, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_220px_44px]">
                    <Input placeholder="Poste budgétaire" value={line.label} onChange={(event) => updateLine(index, "label", event.target.value)} />
                    <Money value={line.amount} setValue={(value) => updateLine(index, "amount", value)} placeholder="Montant" />
                    <button type="button" className="nx-icon-button" disabled={form.budgetLines.length === 1} onClick={() => setField("budgetLines", form.budgetLines.filter((_, itemIndex) => itemIndex !== index))} aria-label="Supprimer le poste">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setField("budgetLines", [...form.budgetLines, { label: "", amount: "" }])}>
                Ajouter un poste
              </Button>
              <div className={`rounded-[14px] border p-4 text-sm ${budgetTotal === totalProject && totalProject > 0 ? "border-[#166534]/20 bg-[#EFFBDD]" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex justify-between gap-4"><span>Total budgété</span><strong>{formatFCFA(budgetTotal)}</strong></div>
                <div className="mt-1 flex justify-between gap-4 text-xs"><span>Total du projet</span><strong>{formatFCFA(totalProject)}</strong></div>
                {errors.budget && <p className="mt-2 text-xs text-[#C62828]">{errors.budget}</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Money label="Revenus mensuels additionnels attendus" value={form.expectedRevenue} setValue={(value) => setField("expectedRevenue", value)} />
              <Select label="Source principale de remboursement" options={SOURCES.map((source) => ({ value: source, label: source }))} value={form.repaymentSource} onChange={(event) => setField("repaymentSource", event.target.value)} />
              <TextArea label="Prévisions, contrats, saisonnalité et trésorerie" value={form.forecastDetails} onChange={(value) => setField("forecastDetails", value)} placeholder="Détaillez les hypothèses, contrats signés, dates d'encaissement, charges et scénarios défavorables…" />
              <div className="rounded-[14px] bg-[#F5F5F3] p-4 text-sm text-[#101010]/60">
                Le bénéfice comptable ne suffit pas : l'analyse doit vérifier la trésorerie disponible pour le service financier.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-[14px] border border-[#101010]/7 bg-[#F5F5F3] p-4 text-sm text-[#101010]/60">
                <ShieldCheck className="mb-2 h-5 w-5" />
                <strong>Mode démonstration :</strong> les noms de fichiers sont enregistrés dans le dossier. Le stockage privé chiffré et l'analyse antivirus doivent être branchés avant exploitation réelle.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {DOCUMENTS.map(([key, label]) => (
                  <label key={key} className="rounded-[15px] border border-dashed border-[#101010]/16 bg-white p-4 hover:border-[#B6FF00]">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 truncate text-xs text-[#101010]/45">{form.documents[key] || "Aucun fichier sélectionné"}</p>
                    <input type="file" className="mt-3 block w-full text-xs" onChange={(event) => setDocument(key, event)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Summary label="Projet" value={form.title || "—"} />
                <Summary label="Montant recherché" value={formatFCFA(requested)} />
                <Summary label="Apport propre" value={`${formatFCFA(ownContribution)} · ${ownContributionRatio.toLocaleString("fr-FR")} %`} />
                <Summary label="Instrument" value={form.fundingType === "DEBT" ? "Dette / obligation" : "Participation au capital"} />
                <Summary label={form.fundingType === "DEBT" ? "Rémunération proposée" : "Capital proposé"} value={form.fundingType === "DEBT" ? `${form.rate || "—"} % · ${form.ratePeriod === "TOTAL" ? "total" : "par an"}` : `${form.equityPercent || "—"} %`} />
                <Summary label="Ticket minimum" value={formatFCFA(parseAmount(form.minTicket))} />
              </div>
              <Card className="!bg-[#101010] !text-white">
                <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/45">Après votre soumission</p>
                <ol className="mt-4 space-y-3 text-sm text-white/75">
                  <li>1. L'équipe vérifie l'entreprise, le projet, les documents et la capacité financière.</li>
                  <li>2. Elle peut demander des compléments, refuser ou approuver le dossier.</li>
                  <li>3. Si le dossier est approuvé, l'équipe structure une offre finale distincte.</li>
                  <li>4. Votre entreprise confirme les conditions finales avant toute publication.</li>
                </ol>
              </Card>
            </div>
          )}
        </Card>

        <div className="nx-mobile-action-bar flex flex-col-reverse gap-2 sm:static sm:mx-0 sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
          <div className="flex gap-2">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Précédent</Button>
            <Button variant="secondary" loading={saving} icon={<Save className="h-4 w-4" />} onClick={() => void saveDraft()}>Enregistrer</Button>
          </div>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                if (validate(step)) {
                  setStep((current) => current + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={submitting} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void submit()}>
              Soumettre à l'analyse
            </Button>
          )}
        </div>
      </div>
    </EntrepriseShell>
  );
}

function TextArea({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`nx-field mt-1.5 min-h-32 p-3.5 text-sm ${error ? "!border-[#C62828]" : ""}`} />
      {error && <p className="mt-1 text-xs text-[#C62828]">{error}</p>}
    </label>
  );
}

function Money({ label, value, setValue, error, hint, placeholder }: { label?: string; value: string; setValue: (value: string) => void; error?: string; hint?: string; placeholder?: string }) {
  return <Input label={label} value={value} onChange={(event) => setValue(event.target.value)} onBlur={(event) => setValue(formatAmountInput(event.target.value))} error={error} hint={hint} placeholder={placeholder || "0"} inputMode="numeric" />;
}

function Choice({ active, title, text, onClick, icon }: { active: boolean; title: string; text: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[16px] border p-4 text-left transition-all ${active ? "border-[#101010] bg-[#101010] text-white shadow-[0_12px_28px_rgba(16,16,16,.16)]" : "border-[#101010]/8 bg-white hover:border-[#B6FF00]"}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-[12px] [&>svg]:h-5 [&>svg]:w-5 ${active ? "bg-[#B6FF00] text-[#101010]" : "bg-[#EFFBDD]"}`}>{icon}</span>
      <p className="mt-3 font-bold">{title}</p>
      <p className={`mt-1 text-xs leading-relaxed ${active ? "text-white/60" : "text-[#101010]/55"}`}>{text}</p>
    </button>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p><p className="mt-1 text-sm font-bold text-[#B6FF00]">{value}</p></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[14px] bg-[#F5F5F3] p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#101010]/42">{label}</p><p className="mt-2 text-sm font-bold leading-snug">{value}</p></div>;
}
