"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Loader2, ShieldCheck, Trash2, UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  email: string;
  userId: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  maxInvestment: number | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface InvitationResponse {
  offer: { id: string; title: string; minInvestment: number; maxInvestment: number | null };
  invitations: Invitation[];
  editable: boolean;
  privateInvestorLimit: number;
}

const STATUS_LABEL: Record<Invitation["status"], string> = {
  pending: "En attente",
  accepted: "Accès confirmé",
  revoked: "Révoquée",
  expired: "Expirée",
};

export function PrivateInvitationsDialog({
  open,
  onOpenChange,
  offerId,
  offerTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  offerTitle: string;
}) {
  const [data, setData] = useState<InvitationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [maxInvestment, setMaxInvestment] = useState("");
  const [validityDays, setValidityDays] = useState("14");
  const [latestLink, setLatestLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/invitations`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | InvitationResponse
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("invitations" in payload)) {
        throw new Error(payload && "error" in payload ? payload.error : undefined);
      }
      setData(payload);
    } catch (error) {
      toast({
        title: "Accès indisponibles",
        description: error instanceof Error && error.message
          ? error.message
          : "Impossible de charger le cercle privé.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (!open) return;
    setLatestLink(null);
    void load();
  }, [load, open]);

  const createInvitation = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          validityDays: Number(validityDays),
          maxInvestment: maxInvestment ? Number(maxInvestment) : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; accessPath?: string }
        | null;
      if (!response.ok || !payload?.accessPath) {
        throw new Error(payload?.error || "L’invitation n’a pas pu être créée.");
      }
      setLatestLink(`${window.location.origin}${payload.accessPath}`);
      setEmail("");
      setMaxInvestment("");
      toast({
        title: "Invitation prête",
        description: "Copiez le lien et transmettez-le uniquement à la personne concernée.",
      });
      await load();
    } catch (error) {
      toast({
        title: "Invitation non créée",
        description: error instanceof Error ? error.message : "Vérifiez les informations.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!latestLink) return;
    try {
      await navigator.clipboard.writeText(latestLink);
      toast({ title: "Lien copié", description: "Il peut maintenant être envoyé à l’investisseur." });
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez le lien manuellement.", variant: "destructive" });
    }
  };

  const revoke = async (invitationId: string) => {
    setRevoking(invitationId);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/invitations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "L’accès n’a pas pu être retiré.");
      toast({ title: "Accès retiré" });
      await load();
    } catch (error) {
      toast({
        title: "Action non enregistrée",
        description: error instanceof Error ? error.message : "Réessayez.",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  const activeCount = data?.invitations.filter((item) =>
    item.status === "pending" || item.status === "accepted"
  ).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#541249]" />
            Cercle privé
          </DialogTitle>
          <DialogDescription>
            {offerTitle}. Chaque accès est personnel, limité et traçable.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-[#541249]/12 bg-[#FBF7FA] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Nouvelle invitation</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeCount} personne{activeCount > 1 ? "s" : ""} sur {data?.privateInvestorLimit ?? 100}
              </p>
            </div>
            <UserRoundPlus className="h-5 w-5 text-[#7b286d]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.25fr_.75fr_.55fr]">
            <div className="space-y-1.5">
              <Label htmlFor="private-email">Adresse de l’investisseur</Label>
              <Input id="private-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="investisseur@exemple.com" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="private-maximum">Plafond personnel</Label>
              <Input id="private-maximum" type="number" min={data?.offer.minInvestment ?? 1} max={data?.offer.maxInvestment ?? undefined} step="1000" inputMode="numeric" value={maxInvestment} onChange={(event) => setMaxInvestment(event.target.value)} placeholder="Sans plafond ajouté" />
            </div>
            <div className="space-y-1.5">
              <Label>Validité du lien</Label>
              <Select value={validityDays} onValueChange={setValidityDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="btn-nexora mt-4 w-full sm:w-auto" onClick={() => void createInvitation()} disabled={submitting || !email.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Créer le lien personnel
          </Button>
        </div>

        {latestLink ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-950">Lien à transmettre une seule fois</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={latestLink} className="bg-white text-xs" aria-label="Lien d’invitation" />
              <Button type="button" onClick={() => void copyLink()} className="btn-nexora shrink-0">
                <Copy className="h-4 w-4" />Copier
              </Button>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Personnes invitées</p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <div className="space-y-2">
            {!loading && data?.invitations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                Aucune invitation pour le moment.
              </div>
            ) : null}
            {data?.invitations.map((invitation) => {
              const active = invitation.status === "pending" || invitation.status === "accepted";
              return (
                <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-border/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{invitation.email}</p>
                      <Badge variant="outline">{STATUS_LABEL[invitation.status]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invitation.maxInvestment ? `Jusqu’à ${invitation.maxInvestment.toLocaleString("fr-FR")} F CFA · ` : ""}
                      lien valable jusqu’au {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  {active && data.editable ? (
                    <Button type="button" variant="outline" size="sm" className="shrink-0 border-red-200 text-red-800 hover:bg-red-50" disabled={revoking === invitation.id} onClick={() => void revoke(invitation.id)}>
                      {revoking === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Retirer l’accès
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
