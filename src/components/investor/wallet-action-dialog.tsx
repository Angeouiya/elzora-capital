"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, CreditCard, Landmark, Loader2, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
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
import type { CollectionPaymentMethod } from "@/lib/payment-policy";
import type { DisplayCurrency, Locale } from "@/lib/store";
import type { InvestorWalletType } from "@/lib/wallets";

export function WalletActionDialog({
  open,
  onOpenChange,
  action,
  walletType,
  balance,
  depositsEnabled,
  depositMethods,
  locale,
  displayCurrency,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "deposit" | "transfer";
  walletType: InvestorWalletType;
  balance: number;
  depositsEnabled: boolean;
  depositMethods: CollectionPaymentMethod[];
  locale: Locale;
  displayCurrency: DisplayCurrency;
  onCompleted: () => void;
}) {
  const en = locale === "en";
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CollectionPaymentMethod>("card");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestKeyRef = useRef<string | null>(null);
  const numericAmount = Number(amount);
  const destination: InvestorWalletType = walletType === "investment" ? "reserve" : "investment";
  const money = (value: number) => formatDisplayMoney(value, displayCurrency, locale);
  const validAmount = Number.isSafeInteger(numericAmount) && numericAmount > 0;
  const canSubmit = action === "transfer"
    ? validAmount && numericAmount <= balance
    : validAmount && depositsEnabled && depositMethods.includes(method);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setSubmitting(false);
      setConfirmOpen(false);
      requestKeyRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (depositMethods.length > 0 && !depositMethods.includes(method)) {
      setMethod(depositMethods[0]);
    }
  }, [depositMethods, method]);

  const methodOptions = useMemo(() => {
    const options = [
      { value: "card", label: <><CreditCard className="h-4 w-4" />{en ? "Card" : "Carte"}</> },
      { value: "mobile_money", label: <><Smartphone className="h-4 w-4" />Mobile Money</> },
      { value: "bank_transfer", label: <><Landmark className="h-4 w-4" />{en ? "Transfer" : "Virement"}</> },
    ];
    return depositsEnabled ? options.filter((option) => depositMethods.includes(option.value as CollectionPaymentMethod)) : options;
  }, [depositMethods, depositsEnabled, en]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const requestKey = requestKeyRef.current ?? crypto.randomUUID();
      requestKeyRef.current = requestKey;
      const payload = action === "deposit"
        ? { action, requestKey, walletType, amount: numericAmount, method }
        : { action, requestKey, fromWallet: walletType, toWallet: destination, amount: numericAmount };
      const response = await fetch("/api/investor/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        payment?: {
          status?: string;
          checkoutUrl?: string;
          instructions?: { bankName: string; accountReference: string; transferReference: string };
        };
      };
      if (!response.ok && response.status !== 202) throw new Error(result.error || (en ? "Action unavailable." : "Action indisponible."));

      if (result.payment?.status === "ready" && result.payment.checkoutUrl) {
        const checkout = new URL(result.payment.checkoutUrl);
        if (checkout.protocol !== "https:" || checkout.hostname !== "app.paydunya.com") throw new Error(en ? "Invalid payment address." : "Adresse de paiement invalide.");
        window.location.assign(checkout.toString());
        return;
      }
      if (result.payment?.status === "bank_instructions_ready" && result.payment.instructions) {
        toast({
          title: en ? "Bank details ready" : "Coordonnées de virement prêtes",
          description: `${result.payment.instructions.bankName} · ${result.payment.instructions.accountReference} · ${result.payment.instructions.transferReference}`,
        });
      } else {
        toast({
          title: action === "transfer" ? (en ? "Transfer completed" : "Transfert effectué") : (en ? "Request received" : "Demande enregistrée"),
          description: result.message || (action === "transfer"
            ? (en ? "Both wallet balances are now up to date." : "Les deux soldes sont maintenant à jour.")
            : (en ? "You will be notified as soon as the deposit is confirmed." : "Vous serez informé dès confirmation du dépôt.")),
        });
      }
      onOpenChange(false);
      requestKeyRef.current = null;
      onCompleted();
    } catch (error) {
      toast({
        title: en ? "Unable to continue" : "Impossible de continuer",
        description: error instanceof Error ? error.message : (en ? "Please try again." : "Veuillez réessayer."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const walletLabel = walletType === "investment"
    ? (en ? "investment wallet" : "portefeuille d’investissement")
    : (en ? "reserve wallet" : "portefeuille de réserve");
  const destinationLabel = destination === "investment"
    ? (en ? "investment wallet" : "portefeuille d’investissement")
    : (en ? "reserve wallet" : "portefeuille de réserve");

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {action === "deposit" ? (en ? "Add money" : "Déposer de l’argent") : (en ? "Move money" : "Déplacer de l’argent")}
          </DialogTitle>
          <DialogDescription>
            {action === "deposit"
              ? (en ? `Add money directly to your ${walletLabel}.` : `Ajoutez de l’argent directement sur votre ${walletLabel}.`)
              : (en ? `Move money from your ${walletLabel} to your ${destinationLabel}.` : `Déplacez l’argent de votre ${walletLabel} vers votre ${destinationLabel}.`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#541249]/10 bg-[#faf5f9] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{en ? "Current balance" : "Solde actuel"}</p>
                <p className="tnum mt-1 text-xl font-bold text-[#541249]">{money(balance)}</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#541249] shadow-sm"><WalletCards className="h-5 w-5" /></span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet-action-amount">{en ? "Amount in CFA francs" : "Montant en francs CFA"}</Label>
            <Input
              id="wallet-action-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
              placeholder="25000"
            />
            {action === "transfer" && numericAmount > balance ? <p className="text-xs text-destructive">{en ? "Amount exceeds this wallet balance." : "Le montant dépasse le solde de ce portefeuille."}</p> : null}
          </div>

          {action === "deposit" ? (
            <div className="space-y-2">
              <Label>{en ? "Payment method" : "Moyen de paiement"}</Label>
              <SegmentedControl value={method} onValueChange={(value) => setMethod(value as CollectionPaymentMethod)} ariaLabel={en ? "Payment method" : "Moyen de paiement"} options={methodOptions} />
              {!depositsEnabled ? <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{en ? "Secure deposits will be available as soon as the approved payment partner is activated." : "Les dépôts sécurisés seront disponibles dès l’activation du partenaire de paiement autorisé."}</p> : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-[#541249]/10 bg-white p-4 text-sm">
              <span className="font-semibold">{walletLabel}</span>
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-[#7b286d]" />
              <span className="font-semibold">{destinationLabel}</span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-[#f4eaf2] p-3 text-xs leading-5 text-[#541249]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {en ? "Every movement is recorded and visible in your personal history." : "Chaque mouvement est enregistré et visible dans votre historique personnel."}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Annuler"}</Button>
          <Button className="btn-nexora" disabled={!canSubmit || submitting} onClick={() => setConfirmOpen(true)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : action === "deposit" ? <CreditCard className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
            {submitting ? (en ? "Processing…" : "Traitement…") : action === "deposit" ? (en ? "Continue" : "Continuer") : (en ? "Confirm transfer" : "Confirmer le transfert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent className="max-w-md rounded-[1.6rem]">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e8f2] text-[#541249]">
            {action === "deposit" ? <CreditCard className="h-5 w-5" /> : <ArrowRightLeft className="h-5 w-5" />}
          </div>
          <AlertDialogTitle className="text-center">{en ? "Do you want to continue?" : "Voulez-vous vraiment continuer ?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-center leading-6">
            {action === "deposit"
              ? (en ? `${money(numericAmount)} will be requested through your selected payment method and credited to your ${walletLabel} only after confirmation.` : `${money(numericAmount)} seront demandés via le moyen choisi, puis crédités sur votre ${walletLabel} uniquement après confirmation.`)
              : (en ? `${money(numericAmount)} will leave your ${walletLabel} and become available in your ${destinationLabel}.` : `${money(numericAmount)} quitteront votre ${walletLabel} et seront disponibles sur votre ${destinationLabel}.`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border border-[#541249]/10 bg-[#faf5f9] p-3 text-center text-xs leading-5 text-[#541249]">
          {en ? "This action is recorded in your personal history." : "Cette action sera enregistrée dans votre historique personnel."}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{en ? "Cancel" : "Annuler"}</AlertDialogCancel>
          <AlertDialogAction className="btn-nexora" onClick={() => { setConfirmOpen(false); void submit(); }}>
            {en ? "Yes, continue" : "Oui, continuer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
