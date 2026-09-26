"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDisplayMoney } from "@/lib/display-money";
import type { DisplayCurrency, Locale } from "@/lib/store";
import type { InvestorWalletType } from "@/lib/wallets";

interface PayoutContext {
  availableBalance: number;
  payoutsEnabled: boolean;
  payoutPhoneMasked: string | null;
  payoutOperators: Array<{ id: string; label: string }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    withdrawMode: string | null;
  }>;
}

export function PayoutDialog({
  open,
  onOpenChange,
  locale,
  displayCurrency,
  onCompleted,
  walletType = "investment",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  displayCurrency: DisplayCurrency;
  onCompleted: () => void;
  walletType?: InvestorWalletType;
}) {
  const en = locale === "en";
  const [context, setContext] = useState<PayoutContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [withdrawMode, setWithdrawMode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/investor/payouts?walletType=${walletType}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as PayoutContext & { error?: string };
        if (!response.ok) throw new Error(en ? "Unable to load your available balance." : "Impossible de charger votre solde disponible.");
        return payload;
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setContext(payload);
          setError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : en ? "Transfer unavailable." : "Versement indisponible.");
      });
    return () => controller.abort();
  }, [open, en, walletType]);

  const numericAmount = Number(amount);
  const openPayout = useMemo(
    () => context?.payouts.find((payout) => ["pending", "ordered", "uncertain"].includes(payout.status)),
    [context]
  );
  const valid = Boolean(
    context?.payoutsEnabled &&
      context.payoutPhoneMasked &&
      withdrawMode &&
      Number.isSafeInteger(numericAmount) &&
      numericAmount > 0 &&
      numericAmount <= context.availableBalance &&
      !openPayout
  );
  const money = (value: number) =>
    formatDisplayMoney(value, displayCurrency, locale);

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/investor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, withdrawMode, walletType }),
      });
      const payload = (await response.json()) as {
        error?: string;
        payout?: { status?: string };
      };
      if (!response.ok && response.status !== 202) {
        throw new Error(getPayoutError(response.status, en));
      }
      const completed = payload.payout?.status === "completed";
      toast({
        title: completed
          ? en ? "Transfer completed" : "Versement effectué"
          : en ? "Request received" : "Demande reçue",
        description: completed
          ? en ? "The amount has been sent to your Mobile Money account." : "Le montant a été envoyé vers votre compte Mobile Money."
          : en ? "We are completing the transfer and will notify you when it is done." : "Nous finalisons le versement et vous préviendrons dès qu’il sera terminé.",
      });
      onOpenChange(false);
      onCompleted();
    } catch (submitError) {
      toast({
        title: en ? "Transfer unavailable" : "Versement indisponible",
        description:
          submitError instanceof Error
            ? submitError.message
            : en ? "Please try again." : "Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{en ? "Withdraw via Mobile Money" : "Retirer par Mobile Money"}</DialogTitle>
          <DialogDescription>
            {en
              ? `Withdraw from your ${walletType === "reserve" ? "reserve" : "investment"} wallet to the number registered on your account.`
              : `Retirez depuis votre portefeuille ${walletType === "reserve" ? "de réserve" : "d’investissement"} vers le numéro enregistré sur votre compte.`}
          </DialogDescription>
        </DialogHeader>

        {!context && !error ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : context ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4">
              <div>
                <p className="text-[11px] text-muted-foreground">{en ? "Available" : "Disponible"}</p>
                <p className="tnum mt-1 text-base font-bold">{money(context.availableBalance)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{en ? "Registered number" : "Numéro enregistré"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Smartphone className="h-3.5 w-3.5" />
                  {context.payoutPhoneMasked || "—"}
                </p>
              </div>
            </div>

            {openPayout ? (
              <div className="rounded-lg border border-[#541249]/20 bg-nexora-pale p-4 text-sm text-positive">
                <p className="font-semibold">{en ? "A payout is already in progress" : "Un versement est déjà en cours"}</p>
                <p className="mt-1 text-xs opacity-85">
                  {en ? "You will be notified as soon as it is completed." : "Vous serez informé dès qu’il sera terminé."}
                </p>
              </div>
            ) : !context.payoutsEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">{en ? "Withdrawals are being activated" : "Les retraits sont en cours d’activation"}</p>
                <p className="mt-1 text-xs leading-5 opacity-85">
                  {en ? "The button will become active as soon as the approved payment partner is connected." : "Le bouton deviendra actif dès que le partenaire de paiement autorisé sera connecté."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payout-amount">{en ? "Amount in CFA francs" : "Montant en francs CFA"}</Label>
                  <Input
                    id="payout-amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                    placeholder="25000"
                  />
                  {numericAmount > (context.availableBalance || 0) && (
                    <p className="text-xs text-destructive">{en ? "Amount exceeds your available balance." : "Le montant dépasse votre solde disponible."}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{en ? "Mobile Money operator" : "Opérateur Mobile Money"}</Label>
                  <Select value={withdrawMode} onValueChange={setWithdrawMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={en ? "Select an operator" : "Sélectionner un opérateur"} />
                    </SelectTrigger>
                    <SelectContent>
                      {context.payoutOperators.map((operator) => (
                        <SelectItem key={operator.id} value={operator.id}>{operator.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-nexora-pale p-3 text-[11px] leading-relaxed text-positive">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {en
                ? "Your amount is protected while the transfer is being completed."
                : "Votre montant reste protégé pendant toute la durée du versement."}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {en ? "Close" : "Fermer"}
          </Button>
          {!openPayout && context && (
            <Button className="btn-nexora" disabled={!valid || submitting} onClick={() => setConfirmOpen(true)}>
              {submitting ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="mr-2 h-4 w-4" />
              )}
              {submitting ? (en ? "Sending…" : "Envoi…") : (en ? "Confirm transfer" : "Confirmer le versement")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent className="max-w-md rounded-[1.6rem]">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e8f2] text-[#541249]"><ArrowDownToLine className="h-5 w-5" /></div>
          <AlertDialogTitle className="text-center">{en ? "Confirm this withdrawal?" : "Confirmer ce retrait ?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-center leading-6">
            {en
              ? `${money(numericAmount)} will be reserved from your ${walletType === "reserve" ? "reserve" : "investment"} wallet, then sent to ${context?.payoutPhoneMasked || "your registered number"}.`
              : `${money(numericAmount)} seront réservés sur votre portefeuille ${walletType === "reserve" ? "de réserve" : "d’investissement"}, puis envoyés vers ${context?.payoutPhoneMasked || "votre numéro enregistré"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs leading-5 text-amber-950">
          {en ? "The amount remains protected while the payment partner confirms the transfer." : "Le montant reste protégé pendant la confirmation du transfert par le partenaire de paiement."}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{en ? "Cancel" : "Annuler"}</AlertDialogCancel>
          <AlertDialogAction className="btn-nexora" onClick={() => { setConfirmOpen(false); void submit(); }}>
            {en ? "Yes, withdraw" : "Oui, retirer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function getPayoutError(status: number, en: boolean): string {
  if (status === 401) return en ? "Sign in again to continue." : "Reconnectez-vous pour continuer.";
  if (status === 403) return en ? "Verify your identity before requesting a transfer." : "Vérifiez votre identité avant de demander un versement.";
  if (status === 409) return en ? "Check your available balance and ongoing requests." : "Vérifiez votre solde disponible et vos demandes en cours.";
  if (status === 503) return en ? "Mobile Money transfers are temporarily unavailable." : "Les versements Mobile Money sont momentanément indisponibles.";
  return en ? "The transfer could not be completed. Please try again." : "Le versement n’a pas pu aboutir. Veuillez réessayer.";
}
