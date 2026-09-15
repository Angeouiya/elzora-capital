"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ArrowRight,
  Info,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { KPI } from "@/components/ui/KPI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatFCFA } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface Distribution {
  id: string;
  capitalAmount: number;
  interestAmount: number;
  status: string;
  withdrawnAt: string | null;
  createdAt: string;
  repayment: {
    offer: {
      project: {
        title: string;
        company: { name: string };
      };
    };
  };
}

/* -------------------------------- Component ------------------------------- */

export default function RetraitPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [montant, setMontant] = useState("");
  const [iban, setIban] = useState("");
  const [beneficiaire, setBeneficiaire] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/distributions")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: Distribution[] = await res.json();
        if (!cancelled) setDistributions(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Solde disponible = distributions avec status AVAILABLE */
  const soldeDisponible = useMemo(
    () =>
      distributions
        .filter((d) => d.status === "AVAILABLE")
        .reduce((s, d) => s + d.capitalAmount + d.interestAmount, 0),
    [distributions]
  );

  const availableDistributions = useMemo(
    () => distributions.filter((d) => d.status === "AVAILABLE"),
    [distributions]
  );

  const montantNum = parseInt(montant) || 0;
  const frais = Math.round(montantNum * 0.005); // 0.5% de frais
  const net = montantNum - frais;

  const montantError =
    montantNum > 0 && montantNum > soldeDisponible
      ? "Le montant dépasse votre solde disponible"
      : montantNum > 0 && montantNum < 5000
        ? "Le montant minimum de retrait est de 5 000 FCFA"
        : "";

  const canSubmit =
    montantNum >= 5000 &&
    montantNum <= soldeDisponible &&
    iban.trim().length > 0 &&
    beneficiaire.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      const ids = availableDistributions.map((d) => d.id);
      const res = await fetch("/api/distributions/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributionIds: ids }),
      });
      if (!res.ok) throw new Error("Erreur lors de la demande de retrait");
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBeneficiaireChange = (value: string) => {
    setBeneficiaire(value);
    // Simulate detecting a new beneficiary
    if (value.trim().length > 3 && value !== "Amadou Koné") {
      setShowSecurityWarning(true);
    } else {
      setShowSecurityWarning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[#101010]/60 hover:bg-[#F5F5F3] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold text-[#101010]">Demande de retrait</h1>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-2xl mx-auto px-4 sm:px-6">
        {/* KPI Solde */}
        <div className="mb-8">
          <KPI
            label="Solde disponible"
            value={loading ? "—" : formatFCFA(soldeDisponible)}
            icon={<Wallet className="h-5 w-5 text-[#507300]" />}
            className="border-2 border-[#B6FF00]/30"
          />
          {soldeDisponible > 0 && (
            <p className="text-xs text-[#101010]/50 mt-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              {availableDistributions.length} distribution(s) disponible(s) sur la plateforme
            </p>
          )}
        </div>

        {soldeDisponible === 0 && !loading && (
          <Card className="text-center py-12">
            <Wallet className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
            <p className="text-[#101010] font-medium mb-1">Aucun solde disponible</p>
            <p className="text-sm text-[#101010]/50 mb-4">
              Vous n&apos;avez actuellement aucun fonds disponible pour un retrait. Les fonds
              deviennent disponibles après les remboursements des entreprises.
            </p>
            <Link href="/dashboard/paiements">
              <Button variant="secondary" size="sm">
                Voir mes paiements
              </Button>
            </Link>
          </Card>
        )}

        {soldeDisponible > 0 && step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Formulaire de retrait</CardTitle>
              <CardDescription>
                Transférez vos fonds disponibles vers votre compte bancaire.
              </CardDescription>
            </CardHeader>

            <div className="space-y-5">
              <Input
                label="Montant (FCFA)"
                type="number"
                placeholder="Ex: 150000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                error={montantError}
                hint={`Maximum : ${formatFCFA(soldeDisponible)}`}
              />

              <Input
                label="Bénéficiaire"
                placeholder="Nom du titulaire du compte"
                value={beneficiaire}
                onChange={(e) => handleBeneficiaireChange(e.target.value)}
              />

              <Input
                label="IBAN / Numéro de compte"
                placeholder="CI00 XXXX XXXX XXXX XXXX"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />

              {/* Security Warning */}
              {showSecurityWarning && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Changement de bénéficiaire détecté
                    </p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Par mesure de sécurité, les retraits vers un nouveau bénéficiaire peuvent
                      être soumis à une vérification supplémentaire et un délai de 72h.
                    </p>
                  </div>
                </div>
              )}

              {/* Résumé */}
              {montantNum > 0 && (
                <div className="p-4 rounded-lg bg-[#F5F5F3] space-y-2">
                  <p className="text-sm font-semibold text-[#101010] mb-3">Résumé du retrait</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#101010]/60">Montant demandé</span>
                    <span className="font-medium text-[#101010]">{formatFCFA(montantNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#101010]/60">Frais de traitement (0,5%)</span>
                    <span className="font-medium text-[#101010]">-{formatFCFA(frais)}</span>
                  </div>
                  <div className="h-px bg-[#101010]/10 my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[#101010]">Net à recevoir</span>
                    <span className="font-bold text-[#166534]">{formatFCFA(net)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                icon={<ArrowRight className="h-4 w-4" />}
                className="w-full"
              >
                Continuer vers la confirmation
              </Button>
            </div>
          </Card>
        )}

        {step === "confirm" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[#166534]" />
                </div>
                <div>
                  <CardTitle>Confirmer le retrait</CardTitle>
                  <CardDescription>Vérifiez les informations avant de confirmer</CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#F5F5F3] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#101010]/60">Montant</span>
                  <span className="font-semibold text-[#101010]">{formatFCFA(montantNum)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#101010]/60">Frais (0,5%)</span>
                  <span className="font-medium text-[#101010]">{formatFCFA(frais)}</span>
                </div>
                <div className="h-px bg-[#101010]/10" />
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[#101010]">Net</span>
                  <span className="font-bold text-[#166534]">{formatFCFA(net)}</span>
                </div>
                <div className="h-px bg-[#101010]/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#101010]/60">Bénéficiaire</span>
                  <span className="font-medium text-[#101010]">{beneficiaire}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#101010]/60">Compte</span>
                  <span className="font-medium text-[#101010]">{iban}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#C62828]/10 text-sm text-[#C62828]">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep("form")}
                  className="flex-1"
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleConfirm}
                  loading={submitting}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  className="flex-1"
                >
                  Confirmer le retrait
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "success" && (
          <Card className="text-center py-10">
            <div className="h-14 w-14 rounded-full bg-[#166534]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-[#166534]" />
            </div>
            <h2 className="text-xl font-bold text-[#101010] mb-2">
              Demande de retrait enregistrée
            </h2>
            <p className="text-sm text-[#101010]/60 mb-6 max-w-md mx-auto">
              Votre demande de retrait de{" "}
              <span className="font-semibold text-[#101010]">{formatFCFA(net)}</span> a bien été
              enregistrée. Le virement sera traité dans un délai de 48 à 72h ouvrés.
            </p>

            {/* Que se passera-t-il ensuite ? */}
            <div className="text-left bg-[#F5F5F3] rounded-lg p-5 mb-6 max-w-md mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-[#101010]/60" />
                <p className="text-sm font-semibold text-[#101010]">
                  Que se passera-t-il ensuite ?
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-[#B6FF00] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#101010]">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#101010]">Vérification</p>
                    <p className="text-xs text-[#101010]/60">
                      Notre système vérifie les informations bancaires et la conformité.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-[#B6FF00] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#101010]">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#101010]">Traitement bancaire</p>
                    <p className="text-xs text-[#101010]/60">
                      Le virement est initié vers votre compte sous 48 à 72h ouvrés.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-[#B6FF00] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#101010]">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#101010]">Confirmation</p>
                    <p className="text-xs text-[#101010]/60">
                      Vous recevez une notification de confirmation avec la référence du virement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/paiements">
                <Button variant="secondary">Voir mes paiements</Button>
              </Link>
              <Link href="/dashboard">
                <Button>Retour au tableau de bord</Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
