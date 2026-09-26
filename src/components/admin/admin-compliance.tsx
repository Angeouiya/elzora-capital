"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Eye, FileCheck2, Inbox, ShieldAlert, XCircle } from "lucide-react";

interface ComplianceCase {
  id: string;
  userId: string;
  offerId: string;
  method: "card" | "mobile_money" | "bank_transfer";
  amount: number;
  severity: string;
  riskScore: number;
  reasons: string[];
  status: string;
  reviewedBy: string | null;
  reviewerName: string | null;
  deciderName: string | null;
  decisionReason: string | null;
  approvalExpiresAt: string | null;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  offerTitle: string;
}

interface ResponseData {
  canDecide: boolean;
  adminId: string;
  cases: ComplianceCase[];
}

type CaseAction = "review" | "approve" | "reject" | "report";

const METHOD_LABELS = { card: "Carte bancaire", mobile_money: "Mobile Money", bank_transfer: "Virement bancaire" };
const STATUS_LABELS: Record<string, string> = { open: "À prendre en charge", reviewing: "En examen", approved: "Autorisé", consumed: "Autorisation utilisée", rejected: "Refusé", reported: "Signalé" };

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
}

export function AdminCompliance() {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [refresh, setRefresh] = useState(0);
  const { data, loading, error } = useFetch<ResponseData>(`/api/admin/compliance-cases?status=${filter}&r=${refresh}`);
  const [selection, setSelection] = useState<{ item: ComplianceCase; action: CaseAction } | null>(null);
  const [reason, setReason] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cases = useMemo(() => data?.cases || [], [data]);

  const act = async () => {
    if (!selection) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/compliance-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selection.item.id, action: selection.action, reason, reportReference }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Action impossible");
      toast({ title: "Décision enregistrée", description: "Le dossier et son journal ont été mis à jour." });
      setSelection(null);
      setReason("");
      setReportReference("");
      setRefresh((value) => value + 1);
    } catch (caught) {
      toast({ title: "Action non enregistrée", description: caught instanceof Error ? caught.message : "Réessayez.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="space-y-4 p-4 sm:p-6 lg:p-8"><Skeleton className="h-10 w-72" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6C195E]">Protection des opérations</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Paiements à examiner</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Chaque demande sensible est prise en charge puis décidée par une seconde personne. Les montants ne sont pas débités pendant l'examen.</p>
        </div>
        <SegmentedControl value={filter} onValueChange={setFilter} ariaLabel="Filtrer les dossiers" className="sm:w-fit" options={[{ value: "active", label: "À traiter" }, { value: "all", label: "Historique" }]} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Dossiers affichés</p><p className="mt-1 text-2xl font-bold tabular-nums">{cases.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">À prendre en charge</p><p className="mt-1 text-2xl font-bold tabular-nums">{cases.filter((item) => item.status === "open").length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">En double validation</p><p className="mt-1 text-2xl font-bold tabular-nums">{cases.filter((item) => item.status === "reviewing").length}</p></Card>
      </div>

      {error ? <Card className="mt-5 border-red-200 bg-red-50 p-5 text-sm text-red-800">La liste n'a pas pu être chargée.</Card> : null}
      {!error && cases.length === 0 ? (
        <Card className="mt-5 p-10 text-center"><Inbox className="mx-auto h-9 w-9 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">Aucun dossier dans cette vue</p></Card>
      ) : null}

      <div className="mt-5 space-y-3">
        {cases.map((item) => {
          const sameReviewer = item.reviewedBy === data?.adminId;
          return (
            <Card key={item.id} className="overflow-hidden p-0">
              <div className="grid gap-4 p-4 md:grid-cols-[1.25fr_.8fr_1.5fr_auto] md:items-center md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-[#F2E1EF] text-[#541249]">{STATUS_LABELS[item.status] || item.status}</Badge>
                    {item.severity !== "standard" ? <Badge variant="outline" className="border-amber-300 text-amber-800"><AlertTriangle className="mr-1 h-3 w-3" />Vigilance {item.severity === "critical" ? "critique" : "renforcée"}</Badge> : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-bold">{item.firstName} {item.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.email} · {item.country}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.offerTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{METHOD_LABELS[item.method]}</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-[#541249]">{money(item.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">Niveau {item.riskScore}/100</p>
                </div>
                <div className="rounded-xl bg-[#FBF7FA] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#6C195E]">Points à vérifier</p>
                  <ul className="mt-2 space-y-1 text-xs text-foreground">{item.reasons.map((reasonItem) => <li key={reasonItem} className="flex gap-2"><span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6C195E]" />{reasonItem}</li>)}</ul>
                </div>
                <div className="flex flex-wrap gap-2 md:w-40 md:flex-col">
                  {item.status === "open" && data?.canDecide ? <Button size="sm" className="btn-nexora" onClick={() => setSelection({ item, action: "review" })}><Eye className="h-4 w-4" />Prendre en examen</Button> : null}
                  {item.status === "reviewing" && data?.canDecide && !sameReviewer ? <>
                    <Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setSelection({ item, action: "approve" })}><CheckCircle2 className="h-4 w-4" />Autoriser</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelection({ item, action: "reject" })}><XCircle className="h-4 w-4" />Refuser</Button>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-900" onClick={() => setSelection({ item, action: "report" })}><ShieldAlert className="h-4 w-4" />Signaler</Button>
                  </> : null}
                  {item.status === "reviewing" && sameReviewer ? <p className="rounded-lg bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900">Une seconde personne doit prendre la décision.</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-secondary/25 px-4 py-2 text-[11px] text-muted-foreground md:px-5">
                <span>Ouvert le {new Date(item.createdAt).toLocaleString("fr-FR")}</span>
                <span>{item.reviewerName ? `Examen : ${item.reviewerName}` : "Pas encore attribué"}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(selection)} onOpenChange={(open) => { if (!open) setSelection(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selection?.action === "review" ? "Prendre ce dossier en examen" : selection?.action === "approve" ? "Autoriser cette opération" : selection?.action === "reject" ? "Refuser cette opération" : "Enregistrer le signalement"}</DialogTitle>
            <DialogDescription>{selection?.action === "review" ? "Vous analysez le dossier. Une autre personne devra prendre la décision finale." : "La décision, sa justification et votre identité seront conservées dans le journal."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="compliance-reason">{selection?.action === "review" ? "Note de prise en charge (facultative)" : "Justification de la décision"}</Label><Textarea id="compliance-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez les vérifications effectuées et la conclusion…" className="mt-1" /></div>
            {selection?.action === "report" ? <div><Label htmlFor="report-reference">Référence du signalement</Label><Input id="report-reference" value={reportReference} onChange={(event) => setReportReference(event.target.value)} placeholder="Référence interne ou autorité" className="mt-1" /></div> : null}
            {selection?.action === "approve" ? <div className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><FileCheck2 className="h-4 w-4 shrink-0" /><span>L'autorisation sera valable 72 heures, uniquement pour le même montant, la même offre et le même moyen de paiement.</span></div> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelection(null)}>Annuler</Button><Button className="btn-nexora" disabled={submitting} onClick={act}>{submitting ? "Enregistrement…" : "Confirmer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
