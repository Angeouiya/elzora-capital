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
import { simulateDebtFinancing, fmtFCFA } from "@/lib/finance";
import { SECTORS, COUNTRIES } from "@/lib/countries";
import { toast } from "@/hooks/use-toast";
import {
  Building2,
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
  { id: 1, label: "Entreprise", icon: Building2 },
  { id: 2, label: "Projet", icon: Briefcase },
  { id: 3, label: "Conditions", icon: Landmark },
  { id: 4, label: "Budget", icon: Wallet },
  { id: 5, label: "Récapitulatif", icon: CheckCircle2 },
] as const;

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

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
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
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">
            Connectez-vous pour soumettre un dossier
          </h1>
          <Button
            className="btn-nexora mt-4"
            onClick={() => setView("login")}
          >
            Se connecter
          </Button>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-72" />
        <Skeleton className="mb-4 h-2" />
        <Skeleton className="h-96" />
      </section>
    );
  }

  if (memberships.length === 0) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-8">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-nexora-danger" />
          <h1 className="text-lg font-bold text-foreground">
            Aucune entreprise rattachée
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pour soumettre un dossier de financement, votre compte doit être
            lié à une entreprise vérifiée.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setView("company_dashboard")}
          >
            Retour
          </Button>
        </Card>
      </section>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
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
        title: "Société requise",
        description: "Sélectionnez d'abord votre société.",
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
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          title: "Brouillon non enregistré",
          description: body?.error || "Réessayez ultérieurement.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Brouillon enregistré",
        description: "Vous pourrez reprendre votre dossier plus tard.",
      });
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Réessayez ultérieurement.",
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
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          title: "Soumission échouée",
          description: body?.error || "Réessayez ultérieurement.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Dossier soumis",
        description: "Notre équipe analyse votre dossier. Vous serez notifié.",
      });
      setView("company_dashboard");
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Réessayez ultérieurement.",
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
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("company_dashboard")}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary/60"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          Soumettre un dossier
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
                    <span className="hidden sm:inline">{s.label}</span>
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
            Étape {step} / {STEPS.length} — {STEPS[step - 1].label}
          </CardTitle>
          <CardDescription className="text-xs">
            {step === 1 &&
              "Sélectionnez la société pour laquelle vous soumettez ce dossier."}
            {step === 2 &&
              "Décrivez le projet financé et son contexte géographique."}
            {step === 3 &&
              "Définissez l'instrument financier et les conditions proposées."}
            {step === 4 &&
              "Précisez le budget, la source de remboursement et les risques identifiés."}
            {step === 5 &&
              "Vérifiez l'ensemble avant soumission. Notre équipe analysera le dossier."}
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
                    key={c.id}
                    type="button"
                    onClick={() => set("companyId", c.id)}
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-nexora-lime bg-nexora-pale/60"
                        : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <Building2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        isSelected ? "text-positive" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {c.tradeName || c.legalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.legalForm} · {c.country} · {c.activity}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Votre rôle : {m.role} (mandat : {m.mandate})
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
                  Titre du projet *
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Extension réseau de distribution — Dakar"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">
                  Description courte *
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  placeholder="Une phrase résumant le projet."
                  required
                />
              </div>
              <div>
                <Label htmlFor="longDescription" className="text-xs">
                  Description détaillée *
                </Label>
                <Textarea
                  id="longDescription"
                  value={form.longDescription}
                  onChange={(e) => set("longDescription", e.target.value)}
                  rows={5}
                  placeholder="Contexte, objectif, utilisation des fonds, source de remboursement..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sector" className="text-xs">
                    Secteur *
                  </Label>
                  <Select
                    value={form.sector}
                    onValueChange={(v) => set("sector", v)}
                  >
                    <SelectTrigger id="sector">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="country" className="text-xs">
                    Pays *
                  </Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => set("country", v)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="city" className="text-xs">
                  Ville *
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
                  Image (URL, optionnel)
                </Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Si vide, une image par défaut sera utilisée.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — Conditions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Instrument financier *</Label>
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
                      <p className="text-sm font-semibold">Dette</p>
                      <p className="text-[11px] text-muted-foreground">
                        Remboursement avec intérêts
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
                      <p className="text-sm font-semibold">Capital</p>
                      <p className="text-[11px] text-muted-foreground">
                        Prise de participation
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
                        Attention à la lecture du taux
                      </p>
                      <p className="mt-1">
                        « 8 % total sur 6 mois » ≠ « 8 % par an ». Un taux
                        total s&apos;applique une seule fois sur toute la
                        durée. Un taux annuel est proratisé par la durée.
                      </p>
                      <p className="mt-1">
                        Exemple : 1 000 000 FCFA à 8 % total sur 6 mois →
                        intérêts ={" "}
                        <span className="tnum font-semibold text-foreground">
                          80 000 FCFA
                        </span>
                        . À 8 % par an sur 6 mois → intérêts ={" "}
                        <span className="tnum font-semibold text-foreground">
                          40 000 FCFA
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Common: fundingGoal + minInvestment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fundingGoal" className="text-xs">
                    Montant recherché (FCFA) *
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
                    Souscription min. (FCFA) *
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
                        Apport propre (FCFA)
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
                        Taux (%) *
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
                      Période du taux *
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
                          Total sur la durée
                        </SelectItem>
                        <SelectItem value="annual">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {form.ratePeriod === "total"
                        ? "Le taux s'applique une seule fois sur toute la durée du financement."
                        : "Le taux est annualisé et proratisé selon la durée."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="durationMonths" className="text-xs">
                        Durée (mois) *
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
                        Type de remboursement *
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
                            In fine (capital à la fin)
                          </SelectItem>
                          <SelectItem value="amortized">
                            Amortissement constant
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maxInvestment" className="text-xs">
                      Souscription max. (FCFA, optionnel)
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
                        % du capital offert *
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
                        Valorisation pré-money (FCFA) *
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
                      Pour les actions : aucun échéancier de remboursement. La
                      sortie est envisagée à terme par cession secondaire ou
                      rachat, non garantie.
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
                  Détail du budget *
                </Label>
                <Textarea
                  id="budgetDetail"
                  value={form.budgetDetail}
                  onChange={(e) => set("budgetDetail", e.target.value)}
                  rows={4}
                  placeholder="Stock 600k, Aménagement 250k, FdR 150k..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="repaymentSource" className="text-xs">
                  Source de remboursement *
                </Label>
                <Textarea
                  id="repaymentSource"
                  value={form.repaymentSource}
                  onChange={(e) => set("repaymentSource", e.target.value)}
                  rows={3}
                  placeholder="Marge sur ventes (20%), encaissements quotidiens..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="risksIdentified" className="text-xs">
                  Risques identifiés *
                </Label>
                <Textarea
                  id="risksIdentified"
                  value={form.risksIdentified}
                  onChange={(e) => set("risksIdentified", e.target.value)}
                  rows={3}
                  placeholder="Concentration géographique, dépendance fournisseurs..."
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
                  Société
                </p>
                <p className="mt-1 text-sm">
                  {selectedCompany?.tradeName || selectedCompany?.legalName} ·{" "}
                  {selectedCompany?.legalForm} · {selectedCompany?.country}
                </p>
              </div>

              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-semibold text-foreground">Projet</p>
                <p className="mt-1 text-sm font-medium">{form.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                  {form.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{form.sector}</Badge>
                  <Badge variant="outline">{form.city}, {form.country}</Badge>
                  <Badge className="bg-nexora-lime text-nexora-black">
                    {form.instrumentType === "debt" ? "Dette" : "Capital"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border border-border p-4">
                <p className="text-xs font-semibold text-foreground">
                  Conditions proposées
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Montant recherché</dt>
                    <dd className="tnum font-medium text-foreground">
                      {fmtFCFA(Number(form.fundingGoal) || 0)}
                    </dd>
                  </div>
                  {form.instrumentType === "debt" && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Taux</dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.annualRate} %{" "}
                          {form.ratePeriod === "total"
                            ? "(total sur la durée)"
                            : "(annuel)"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Durée</dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.durationMonths} mois
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          Type de remboursement
                        </dt>
                        <dd className="font-medium text-foreground">
                          {form.repaymentType === "bullet"
                            ? "In fine"
                            : "Amortissement constant"}
                        </dd>
                      </div>
                    </>
                  )}
                  {form.instrumentType === "equity" && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          % du capital offert
                        </dt>
                        <dd className="tnum font-medium text-foreground">
                          {form.equityOfferedPct} %
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          Valorisation pré-money
                        </dt>
                        <dd className="tnum font-medium text-foreground">
                          {fmtFCFA(Number(form.valuationPre) || 0)}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Souscription min.</dt>
                    <dd className="tnum font-medium text-foreground">
                      {fmtFCFA(Number(form.minInvestment) || 0)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Simulation (debt only) */}
              {form.instrumentType === "debt" && debtSim && (
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs font-semibold text-foreground">
                    Simulation financière
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    À titre indicatif — basé sur les commissions plateforme
                    (6% initial, 2%/an de suivi).
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Commission initiale (6%)
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {fmtFCFA(debtSim.upfrontCommission)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Net versé à l&apos;entreprise
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {fmtFCFA(debtSim.netToCompany)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Total à régler par l&apos;entreprise
                      </dt>
                      <dd className="tnum font-semibold text-foreground">
                        {fmtFCFA(debtSim.totalCompanyPayment)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-border pt-1">
                      <dt className="text-muted-foreground">
                        CA plateforme (initial + suivi)
                      </dt>
                      <dd className="tnum font-medium text-foreground">
                        {fmtFCFA(debtSim.platformRevenue)}
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
                    Ces conditions sont proposées par votre entreprise. Notre
                    équipe les analysera et peut demander des révisions. Vous
                    ne publiez pas directement.
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
              Précédent
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
                    Sauvegarde…
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Sauvegarder le brouillon
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
                  Suivant
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
                      Soumission…
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Soumettre le dossier
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
