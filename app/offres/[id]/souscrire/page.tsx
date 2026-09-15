"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Landmark,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  LogIn,
  CircleAlert,
  Wallet,
  ClipboardCheck,
  UserCheck,
  CreditCard,
  Receipt,
  PartyPopper,
  Info,
  Building2,
  BadgeCheck,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calculateInvestorInterest, formatFCFA, formatRate } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface OfferSummary {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  minTicket: number;
  maxTicket: number;
  targetAmount: number;
  collectedAmount: number;
  status: string;
  project: {
    title: string;
    city: string | null;
    company: { name: string };
  };
}

interface MeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  kycStatus: string;
}

interface InvestmentResult {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

type PaymentMethod = "TRANSFER" | "MOBILE_MONEY";

const STEP_LABELS = [
  "Montant",
  "Récapitulatif",
  "Éligibilité",
  "Paiement",
  "Confirmation",
  "Terminé",
];

const KYC_LABELS: Record<string, { label: string; hint: string }> = {
  VERIFIED: {
    label: "Vérifié",
    hint: "Votre identité est vérifiée, vous pouvez souscrire.",
  },
  PENDING: {
    label: "En attente",
    hint: "Votre dossier de vérification n'est pas encore complet. Complétez-le pour pouvoir investir.",
  },
  IN_PROGRESS: {
    label: "En cours d'examen",
    hint: "Nos équipes vérifient vos documents. Vous pourrez investir dès la validation.",
  },
  REJECTED: {
    label: "Rejeté",
    hint: "Votre dossier a été refusé. Consultez la page vérification pour plus de détails.",
  },
};

/* -------------------------------- Component ------------------------------- */

export default function SouscrirePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  /* Données */
  const [offer, setOffer] = useState<OfferSummary | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* Parcours */
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(0);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [investment, setInvestment] = useState<InvestmentResult | null>(null);

  /* Chargement offre + utilisateur courant */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetch(`/api/offers/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("server-error");
        const data: OfferSummary = await res.json();
        if (cancelled) return;
        setOffer(data);
        setAmount(data.minTicket);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetch("/api/users/me")
      .then(async (res) => {
        if (!res.ok) return; // 401 : visiteur non connecté
        const data: MeInfo = await res.json();
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        /* silencieux : l'utilisateur n'est pas connecté */
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* Estimation du rendement */
  const ratePeriod = offer?.ratePeriod === "ANNUAL" ? "ANNUAL" : "TOTAL";
  const estimate = useMemo(() => {
    if (!offer) return null;
    const interest = calculateInvestorInterest(
      amount,
      offer.rate,
      ratePeriod,
      offer.duration
    );
    return { interest, total: amount + interest };
  }, [offer, amount, ratePeriod]);

  const amountValid =
    !!offer && amount >= offer.minTicket && amount <= offer.maxTicket;
  const kycOk = me?.kycStatus === "VERIFIED";
  const kycInfo = me ? KYC_LABELS[me.kycStatus] : null;

  const canNext =
    step === 1
      ? amountValid
      : step === 3
        ? kycOk && acceptRisk
        : step === 4
          ? true
          : true;

  /* Soumission finale : étape 5 → POST /api/investments */
  const submitSubscription = async () => {
    if (!offer) return;
    setApiError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, amount, method }),
      });
      if (res.status === 401) {
        setApiError(
          "Votre session a expiré. Reconnectez-vous pour finaliser votre souscription."
        );
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setApiError(
          (data as { error?: string }).error ??
            "Une erreur est survenue. Veuillez réessayer."
        );
        return;
      }
      setInvestment(data as InvestmentResult);
      setStep(6);
    } catch {
      setApiError("Impossible de contacter le serveur. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 5) {
      submitSubscription();
      return;
    }
    setApiError("");
    setStep((s) => Math.min(6, s + 1));
  };

  const goPrev = () => {
    setApiError("");
    setStep((s) => Math.max(1, s - 1));
  };

  /* ------------------------------ États simples --------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f7]">
        <div className="h-16 border-b border-[#101010]/8 bg-white" />
        <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded bg-[#F5F5F3]" />
          <div className="h-3 w-full rounded-full bg-[#F5F5F3]" />
          <div className="h-64 rounded-xl bg-[#F5F5F3]" />
        </div>
      </div>
    );
  }

  if (notFound || !offer) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <CircleAlert className="h-10 w-10 text-[#101010]/20 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#101010] mb-2">
            Offre introuvable
          </h1>
          <p className="text-sm text-[#101010]/60 mb-6">
            Impossible de souscrire à une offre inexistante.
          </p>
          <Link href="/offres">
            <Button variant="primary" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour aux offres
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (offer.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <AlertTriangle className="h-10 w-10 text-[#C62828] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#101010] mb-2">
            Collecte clôturée
          </h1>
          <p className="text-sm text-[#101010]/60 mb-6">
            Cette offre n&apos;accepte plus de souscriptions.
          </p>
          <Link href="/offres">
            <Button variant="primary" icon={<ArrowLeft className="h-4 w-4" />}>
              Voir les offres ouvertes
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* ------------------------------- Header ------------------------------ */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center gap-3">
          <Link
            href={`/offres/${offer.id}`}
            aria-label="Retour à l'offre"
            className="h-10 w-10 rounded-lg flex items-center justify-center text-[#101010] hover:bg-[#F5F5F3] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <NexoraLogo size={28} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#101010]/50 font-semibold">
                Souscription
              </p>
              <p className="text-sm font-semibold text-[#101010] leading-tight truncate max-w-[180px] sm:max-w-none">
                {offer.project.company.name}
              </p>
            </div>
          </div>
          <Badge variant="accent" className="ml-auto shrink-0">
            Étape {Math.min(step, 6)}/6
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-16">
        {/* ------------------------------ Stepper ----------------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done = step > n || (step === 6 && n === 6);
              const current = step === n && step !== 6;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${
                      done || current
                        ? "bg-[#B6FF00]"
                        : "bg-[#101010]/10"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      done || current
                        ? "text-[#101010]"
                        : "text-[#101010]/35"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* -------------------------- Résumé de l'offre ------------------------ */}
        <Card padding="sm" className="mb-6 bg-[#EFFBDD]/60 border-[#507300]/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-[#507300] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#101010] truncate">
                  {offer.project.title}
                </p>
                <p className="text-xs text-[#101010]/50">
                  {offer.project.company.name} · {formatRate(offer.rate)}{" "}
                  {offer.ratePeriod === "TOTAL" ? "total" : "/ an"} ·{" "}
                  {offer.duration} mois
                </p>
              </div>
            </div>
            <Badge variant="accent">
              Ticket {formatFCFA(offer.minTicket)} – {formatFCFA(offer.maxTicket)}
            </Badge>
          </div>
          <ProgressBar
            value={offer.collectedAmount}
            max={offer.targetAmount}
            size="sm"
            showValue
            label={`Collecté : ${formatFCFA(offer.collectedAmount)}`}
            className="mt-3"
          />
        </Card>

        {/* ============================ ÉTAPE 1 : Montant ===================== */}
        {step === 1 && (
          <Card className="animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-[#507300]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#101010]">
                  Combien souhaitez-vous investir&nbsp;?
                </h2>
                <p className="text-xs text-[#101010]/50">
                  Ticket minimum {formatFCFA(offer.minTicket)} · maximum{" "}
                  {formatFCFA(offer.maxTicket)}
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <input
                type="number"
                inputMode="numeric"
                min={offer.minTicket}
                max={offer.maxTicket}
                step={5000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-label="Montant à investir"
                className={`w-full h-16 px-5 pr-24 rounded-xl border-2 bg-white text-2xl font-bold text-[#101010] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  amountValid
                    ? "border-[#B6FF00] focus:ring-2 focus:ring-[#B6FF00]/40"
                    : "border-[#C62828] focus:ring-2 focus:ring-[#C62828]/30"
                }`}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#101010]/40">
                FCFA
              </span>
            </div>
            {!amountValid && (
              <p className="text-xs text-[#C62828] mt-2">
                Le montant doit être compris entre{" "}
                {formatFCFA(offer.minTicket)} et {formatFCFA(offer.maxTicket)}.
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => setAmount(offer.minTicket)}
                className="h-9 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors"
              >
                Minimum
              </button>
              {[25000, 100000, 500000].map((stepAmt) => (
                <button
                  key={stepAmt}
                  type="button"
                  disabled={amount + stepAmt > offer.maxTicket}
                  onClick={() =>
                    setAmount((prev) => Math.min(prev + stepAmt, offer.maxTicket))
                  }
                  className="h-9 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  + {new Intl.NumberFormat("fr-FR").format(stepAmt)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(offer.maxTicket)}
                className="h-9 px-3 rounded-lg bg-[#F5F5F3] text-xs font-medium text-[#101010] hover:bg-[#EFFBDD] transition-colors"
              >
                Maximum
              </button>
            </div>

            {estimate && amountValid && (
              <div className="mt-6 p-4 rounded-xl bg-[#F5F5F3]">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[#101010]/60">
                    Intérêts estimés ({formatRate(offer.rate)}{" "}
                    {offer.ratePeriod === "TOTAL" ? "total" : "/ an"} sur{" "}
                    {offer.duration} mois)
                  </span>
                  <span className="font-semibold text-[#507300]">
                    + {formatFCFA(estimate.interest)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1.5 border-t border-[#101010]/10">
                  <span className="font-semibold text-[#101010]">
                    Total perçu à l&apos;échéance
                  </span>
                  <span className="font-bold text-[#101010]">
                    {formatFCFA(estimate.total)}
                  </span>
                </div>
                <p className="text-[11px] text-[#101010]/40 mt-2">
                  Rémunération contractuelle — total prévisionnel, non garanti.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* ======================= ÉTAPE 2 : Récapitulatif ==================== */}
        {step === 2 && estimate && (
          <Card className="animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                <ClipboardCheck className="h-4.5 w-4.5 text-[#507300]" />
              </div>
              <h2 className="text-lg font-bold text-[#101010]">
                Récapitulatif de votre investissement
              </h2>
            </div>

            <div className="rounded-xl border border-[#101010]/10 divide-y divide-[#101010]/8 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">Projet</span>
                <span className="text-sm font-medium text-[#101010] text-right">
                  {offer.project.title}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">Entreprise</span>
                <span className="text-sm font-medium text-[#101010] text-right">
                  {offer.project.company.name}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">Montant investi</span>
                <span className="text-sm font-bold text-[#101010]">
                  {formatFCFA(amount)}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">
                  Rendement contractuel
                </span>
                <span className="text-sm font-medium text-[#507300]">
                  {formatRate(offer.rate)}{" "}
                  {offer.ratePeriod === "TOTAL" ? "sur la durée" : "par an"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">
                  Intérêts estimés (bruts)
                </span>
                <span className="text-sm font-medium text-[#507300]">
                  + {formatFCFA(estimate.interest)}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">
                  Frais Nexora (investisseur)
                </span>
                <span className="text-sm font-medium text-[#166534]">
                  0 FCFA — aucun frais
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-[#101010]/60">Durée</span>
                <span className="text-sm font-medium text-[#101010]">
                  {offer.duration} mois
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-[#EFFBDD]">
                <span className="text-sm font-bold text-[#101010]">
                  Total perçu à l&apos;échéance
                </span>
                <span className="text-base font-bold text-[#101010]">
                  {formatFCFA(estimate.total)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-lg bg-[#F5F5F3] flex gap-2.5">
              <Info className="h-4 w-4 text-[#101010]/40 shrink-0 mt-0.5" />
              <p className="text-xs text-[#101010]/60 leading-relaxed">
                Rémunération contractuelle — total prévisionnel, non garanti.
                Les intérêts sont payés par l&apos;entreprise selon
                l&apos;échéancier de l&apos;offre ; l&apos;investissement présente
                un risque de perte en capital.
              </p>
            </div>
          </Card>
        )}

        {/* ======================= ÉTAPE 3 : Éligibilité ====================== */}
        {step === 3 && (
          <Card className="animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                <UserCheck className="h-4.5 w-4.5 text-[#507300]" />
              </div>
              <h2 className="text-lg font-bold text-[#101010]">
                Vérification de votre éligibilité
              </h2>
            </div>

            {/* Visiteur non connecté */}
            {!me && (
              <div className="rounded-xl border border-[#101010]/10 bg-white p-5 text-center">
                <LogIn className="h-8 w-8 text-[#101010]/25 mx-auto mb-3" />
                <p className="font-semibold text-[#101010] mb-1">
                  Connectez-vous pour continuer
                </p>
                <p className="text-sm text-[#101010]/60 mb-4">
                  La souscription est réservée aux investisseurs disposant
                  d&apos;un compte vérifié.
                </p>
                <Link
                  href={`/connexion?redirectTo=/offres/${offer.id}/souscrire`}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-xs text-[#101010]/50 mt-3">
                  Pas encore de compte&nbsp;?{" "}
                  <Link
                    href="/inscription"
                    className="text-[#507300] font-medium hover:underline"
                  >
                    Créer un compte investisseur
                  </Link>
                </p>
              </div>
            )}

            {/* Utilisateur connecté */}
            {me && (
              <>
                <div className="rounded-xl border border-[#101010]/10 bg-white p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101010]">
                      {me.firstName} {me.lastName}
                    </p>
                    <p className="text-xs text-[#101010]/50 truncate">
                      {me.email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/40 mb-1">
                      Statut KYC
                    </p>
                    <StatusBadge status={me.kycStatus} />
                  </div>
                </div>

                <p
                  className={`text-xs mt-2 mb-4 flex items-start gap-1.5 ${
                    kycOk ? "text-[#166534]" : "text-[#101010]/60"
                  }`}
                >
                  {kycOk && (
                    <BadgeCheck className="h-4 w-4 shrink-0" />
                  )}
                  {kycInfo?.hint ?? ""}
                </p>

                {!kycOk && (
                  <div className="mb-4 p-3.5 rounded-lg bg-amber-50 flex gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">
                        Vérification d&apos;identité requise
                      </p>
                      <p className="text-xs text-amber-700/80 mt-0.5">
                        La souscription est possible uniquement avec un compte
                        vérifié.{" "}
                        <Link
                          href="/verification"
                          className="font-semibold underline underline-offset-2"
                        >
                          Compléter ma vérification
                        </Link>
                      </p>
                    </div>
                  </div>
                )}

                {/* Avertissement risques */}
                <div className="rounded-xl bg-[#C62828]/5 border border-[#C62828]/15 p-4 mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C62828] mb-1.5">
                    Avertissement sur les risques
                  </p>
                  <p className="text-xs text-[#101010]/70 leading-relaxed">
                    Le financement participatif comporte un risque de perte
                    partielle ou totale du capital investi et un risque
                    d&apos;illiquidité jusqu&apos;à l&apos;échéance. N&apos;investissez
                    que des sommes dont vous n&apos;avez pas besoin à court
                    terme.
                  </p>
                </div>

                {/* Case à cocher risques */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptRisk}
                    onChange={(e) => setAcceptRisk(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-[#101010]/30 accent-[#507300] cursor-pointer"
                  />
                  <span className="text-sm text-[#101010] leading-relaxed">
                    J&apos;ai lu et j&apos;accepte les{" "}
                    <Link href="/cgu" className="font-medium text-[#507300] hover:underline">
                      conditions générales
                    </Link>{" "}
                    et je comprends que mon investissement présente un risque de
                    perte en capital.
                  </span>
                </label>
              </>
            )}
          </Card>
        )}

        {/* ===================== ÉTAPE 4 : Moyen de paiement ================== */}
        {step === 4 && (
          <Card className="animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-[#507300]" />
              </div>
              <h2 className="text-lg font-bold text-[#101010]">
                Choisissez votre moyen de paiement
              </h2>
            </div>
            <p className="text-xs text-[#101010]/50 mb-5">
              Votre investissement sera confirmé dès réception des fonds par
              Nexora Capital.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Virement */}
              <button
                type="button"
                onClick={() => setMethod("TRANSFER")}
                aria-pressed={method === "TRANSFER"}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  method === "TRANSFER"
                    ? "border-[#B6FF00] bg-[#EFFBDD]/50"
                    : "border-[#101010]/10 bg-white hover:border-[#101010]/25"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                      method === "TRANSFER"
                        ? "bg-[#B6FF00]"
                        : "bg-[#F5F5F3]"
                    }`}
                  >
                    <Landmark className="h-5 w-5 text-[#101010]" />
                  </div>
                  {method === "TRANSFER" && (
                    <Check className="h-5 w-5 text-[#507300]" />
                  )}
                </div>
                <p className="text-sm font-bold text-[#101010]">
                  Virement bancaire
                </p>
                <p className="text-xs text-[#101010]/55 mt-1 leading-relaxed">
                  Depuis votre banque vers le compte séquestre Nexora.
                  Confirmation sous 1 à 2 jours ouvrés.
                </p>
              </button>

              {/* Mobile Money */}
              <button
                type="button"
                onClick={() => setMethod("MOBILE_MONEY")}
                aria-pressed={method === "MOBILE_MONEY"}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  method === "MOBILE_MONEY"
                    ? "border-[#B6FF00] bg-[#EFFBDD]/50"
                    : "border-[#101010]/10 bg-white hover:border-[#101010]/25"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                      method === "MOBILE_MONEY"
                        ? "bg-[#B6FF00]"
                        : "bg-[#F5F5F3]"
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-[#101010]" />
                  </div>
                  {method === "MOBILE_MONEY" && (
                    <Check className="h-5 w-5 text-[#507300]" />
                  )}
                </div>
                <p className="text-sm font-bold text-[#101010]">Mobile Money</p>
                <p className="text-xs text-[#101010]/55 mt-1 leading-relaxed">
                  Orange Money, MTN MoMo, Moov Money ou Wave. Confirmation
                  quasi immédiate.
                </p>
              </button>
            </div>
          </Card>
        )}

        {/* ====================== ÉTAPE 5 : Confirmation ====================== */}
        {step === 5 && estimate && (
          <Card className="animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-9 w-9 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                <Receipt className="h-4.5 w-4.5 text-[#507300]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#101010]">
                  Dernière étape avant enregistrement
                </h2>
                <p className="text-xs text-[#101010]/50">
                  Vérifiez les informations puis confirmez votre souscription.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#101010]/10 divide-y divide-[#101010]/8 overflow-hidden mb-4">
              <div className="flex justify-between px-4 py-3 bg-white text-sm">
                <span className="text-[#101010]/60">Montant</span>
                <span className="font-bold text-[#101010]">
                  {formatFCFA(amount)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-white text-sm">
                <span className="text-[#101010]/60">Intérêts estimés</span>
                <span className="font-medium text-[#507300]">
                  + {formatFCFA(estimate.interest)} (bruts = nets, 0 frais)
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-white text-sm">
                <span className="text-[#101010]/60">Moyen de paiement</span>
                <span className="font-medium text-[#101010]">
                  {method === "TRANSFER"
                    ? "Virement bancaire"
                    : "Mobile Money"}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-white text-sm">
                <span className="text-[#101010]/60">Compte</span>
                <span className="font-medium text-[#101010] text-right">
                  {me ? `${me.firstName} ${me.lastName}` : "—"}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-white text-sm">
                <span className="text-[#101010]/60">Vérification KYC</span>
                <StatusBadge status={me?.kycStatus ?? "PENDING"} />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F5F5F3] flex gap-2.5 mb-4">
              <ShieldCheck className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
              <p className="text-xs text-[#101010]/60 leading-relaxed">
                En confirmant, vous vous engagez à régler {formatFCFA(amount)}{" "}
                par {method === "TRANSFER" ? "virement" : "Mobile Money"}. La
                souscription devient définitive après réception et
                réconciliation des fonds.
              </p>
            </div>

            {apiError && (
              <div className="mb-4 p-3.5 rounded-lg bg-[#C62828]/10 flex gap-2.5 items-start">
                <CircleAlert className="h-4 w-4 text-[#C62828] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#C62828]">{apiError}</p>
                  {apiError.includes("session") && (
                    <Link
                      href={`/connexion?redirectTo=/offres/${offer.id}/souscrire`}
                      className="text-xs font-semibold text-[#C62828] underline underline-offset-2 mt-1 inline-block"
                    >
                      Se reconnecter
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ========================= ÉTAPE 6 : Succès ========================= */}
        {step === 6 && investment && (
          <Card className="animate-scale-in text-center py-10">
            <div className="h-16 w-16 rounded-full bg-[#EFFBDD] flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="h-7 w-7 text-[#507300]" />
            </div>
            <h2 className="text-xl font-bold text-[#101010]">
              Souscription enregistrée&nbsp;!
            </h2>
            <p className="text-sm text-[#101010]/60 mt-1.5 max-w-md mx-auto">
              Merci pour votre confiance. Votre investissement de{" "}
              <strong className="text-[#101010]">{formatFCFA(investment.amount)}</strong>{" "}
              sur <strong className="text-[#101010]">{offer.project.title}</strong>{" "}
              a bien été pris en compte.
            </p>

            <div className="mt-6 mx-auto max-w-sm rounded-xl border-2 border-dashed border-[#B6FF00] bg-[#EFFBDD]/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#507300]">
                Référence de souscription
              </p>
              <p className="font-mono text-lg font-bold text-[#101010] mt-1 break-all">
                {investment.id}
              </p>
              <p className="text-xs text-[#101010]/50 mt-1.5">
                Statut : {investment.status === "PENDING" ? "En attente de paiement" : investment.status}
                {" · "}
                {new Date(investment.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>

            {/* Instructions selon le moyen choisi */}
            <div className="mt-6 mx-auto max-w-md text-left p-4 rounded-xl bg-[#F5F5F3]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#101010]/50 mb-2">
                Prochaines étapes
              </p>
              {method === "TRANSFER" ? (
                <ul className="space-y-2 text-sm text-[#101010]/70">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    Effectuez un virement de {formatFCFA(amount)} au nom de
                    Nexora Capital (coordonnées dans votre espace paiements).
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    Mentionnez la référence ci-dessus dans le libellé du
                    virement.
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    La confirmation intervient sous 1 à 2 jours ouvrés après
                    réception.
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-[#101010]/70">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    Vous recevrez une demande de paiement Mobile Money de{" "}
                    {formatFCFA(amount)} sur votre numéro.
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    Validez la demande avec votre code secret pour finaliser.
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-[#507300] shrink-0 mt-0.5" />
                    La confirmation est quasi immédiate après validation.
                  </li>
                </ul>
              )}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/investissements">
                <Button variant="primary" icon={<ArrowRight className="h-4 w-4" />}>
                  Suivre mon investissement
                </Button>
              </Link>
              <Link href="/offres">
                <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
                  Explorer d&apos;autres offres
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* -------------------- Navigation Précédent / Suivant ----------------- */}
        {step < 6 && (
          <div className="mt-6 flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={goPrev}
                icon={<ArrowLeft className="h-4 w-4" />}
                className="flex-1 sm:flex-none"
              >
                Précédent
              </Button>
            )}
            {step < 5 ? (
              <Button
                variant="primary"
                onClick={goNext}
                disabled={!canNext}
                icon={<ArrowRight className="h-4 w-4" />}
                className="flex-1 sm:flex-none sm:ml-auto"
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={goNext}
                loading={submitting}
                disabled={!amountValid || !kycOk || !acceptRisk}
                icon={<CheckCircle2 className="h-4 w-4" />}
                className="flex-1 sm:flex-none sm:ml-auto"
              >
                Confirmer et investir
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
