"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CircleCheck, FileCheck2, FileUp, Layers3, ShieldCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFetch } from "@/hooks/use-fetch";
import { formatDisplayMoney } from "@/lib/display-money";
import { canSubmitStageEvidence } from "@/lib/staged-disbursement";
import { useAppStore } from "@/lib/store";

interface Stage {
  id: string;
  projectId: string;
  projectTitle: string;
  companyId: string;
  mandate: string;
  trancheNo: number;
  title: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  targetDate: string;
  qualityCriteria: string;
  status: string;
  progressNote: string | null;
  evidenceDocumentId: string | null;
  evidenceFileName: string | null;
  evidenceUploadedAt: string | null;
  submittedAt: string | null;
  qaAt: string | null;
  qaNote: string | null;
  transferStatus: string | null;
  transferExecutedAt: string | null;
}

interface StageResponse { stages: Stage[] }
interface StageDraft { note: string; file: File | null; uploadedDocumentId: string | null }
const emptyDraft = (): StageDraft => ({ note: "", file: null, uploadedDocumentId: null });

const COPY = {
  fr: {
    title: "Versements par étapes", intro: "La première tranche suit la validation du financement et du compte de réception. Après chaque versement confirmé, déposez un compte rendu et une preuve du résultat obtenu : leur contrôle ouvre l’étape suivante.",
    empty: "Le calendrier apparaîtra ici après la clôture du financement et la vérification de votre compte de réception.",
    target: "Date cible", amount: "Montant de l’étape", net: "Versement prévu", commission: "Commission déduite", criteria: "Résultat à documenter après versement", report: "Compte rendu de réalisation", reportPlaceholder: "Décrivez les travaux réalisés, les résultats obtenus et ce que montre la pièce jointe.",
    proof: "Pièce justificative", choose: "Ajouter un fichier PDF, Word, Excel ou une photo (10 Mo maximum)", send: "Transmettre pour contrôle", sending: "Transmission…",
    proofSaved: "Justificatif déposé", qa: "Retour de l’équipe", planned: "À venir", reportNeeded: "Compte rendu attendu", submitted: "En contrôle qualité", changes: "Complément demandé", passed: "Qualité validée", prepared: "Versement à approuver", approved: "Versement approuvé", executed: "Versement confirmé", pendingText: "Le versement doit encore être confirmé. Aucun compte rendu n’est demandé avant réception des fonds.",
    proofDate: "Déposé le", proofAfterTransfer: "Déposez un nouveau justificatif après la confirmation du versement de cette étape.",
    confirmTitle: "Transmettre ce compte rendu ?", confirmText: "Votre pièce sera conservée avec le suivi du projet. L’équipe pourra demander une correction si les résultats ne répondent pas aux critères annoncés.", cancel: "Revenir", confirm: "Oui, transmettre", sent: "Compte rendu transmis", error: "Le compte rendu n’a pas pu être transmis", retry: "Réessayez ou choisissez de nouveau la pièce.",
    loadingError: "Le suivi des versements est momentanément indisponible.",
  },
  en: {
    title: "Milestone payments", intro: "The first transfer follows funding and receiving-account checks. After each confirmed transfer, submit a progress report and evidence of the outcome; its quality review unlocks the next stage.",
    empty: "The schedule will appear here after funding closes and your receiving account is verified.",
    target: "Target date", amount: "Stage amount", net: "Expected transfer", commission: "Commission deducted", criteria: "Outcome to document after payment", report: "Progress report", reportPlaceholder: "Describe the work completed, the results achieved and what the attached file demonstrates.",
    proof: "Supporting file", choose: "Add a PDF, Word, Excel file or photo (10 MB maximum)", send: "Submit for review", sending: "Submitting…",
    proofSaved: "Evidence uploaded", qa: "Team feedback", planned: "Upcoming", reportNeeded: "Progress report needed", submitted: "Quality review", changes: "Changes requested", passed: "Quality approved", prepared: "Transfer awaiting approval", approved: "Transfer approved", executed: "Transfer confirmed", pendingText: "The transfer is not confirmed yet. No report is required before the funds arrive.",
    proofDate: "Uploaded on", proofAfterTransfer: "Upload a new supporting file after this stage's transfer has been confirmed.",
    confirmTitle: "Submit this progress report?", confirmText: "Your file will be stored with the project record. The team may request changes if the outcome does not meet the published criteria.", cancel: "Go back", confirm: "Yes, submit", sent: "Progress report submitted", error: "The progress report could not be submitted", retry: "Try again or choose the file again.",
    loadingError: "Payment tracking is temporarily unavailable.",
  },
} as const;

export function CompanyDisbursementStages({ companyId }: { companyId: string }) {
  const locale = useAppStore((state) => state.locale);
  const currency = useAppStore((state) => state.displayCurrency);
  const copy = COPY[locale];
  const { toast } = useToast();
  const [refresh, setRefresh] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});
  const [confirmStageId, setConfirmStageId] = useState<string | null>(null);
  const [busyStageId, setBusyStageId] = useState<string | null>(null);
  const { data, loading, error } = useFetch<StageResponse>(`/api/company/disbursement-stages?refresh=${refresh}`);
  const stages = useMemo(() => (data?.stages ?? []).filter((stage) => stage.companyId === companyId), [data?.stages, companyId]);
  const groups = useMemo(() => {
    const grouped = new Map<string, Stage[]>();
    for (const stage of stages) {
      const items = grouped.get(stage.projectId) ?? [];
      items.push(stage);
      grouped.set(stage.projectId, items);
    }
    return [...grouped.values()].map((items) => items.sort((a, b) => a.trancheNo - b.trancheNo));
  }, [stages]);
  const money = (amount: number) => formatDisplayMoney(amount, currency, locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";

  const submit = async (stage: Stage) => {
    const draft = drafts[stage.id] ?? emptyDraft();
    if (!draft.file && !draft.uploadedDocumentId) return;
    setBusyStageId(stage.id);
    try {
      let evidenceDocumentId = draft.uploadedDocumentId;
      if (!evidenceDocumentId && draft.file) {
        const form = new FormData();
        form.set("kind", "milestone_evidence");
        form.set("replace", "0");
        form.set("file", draft.file);
        const upload = await fetch(`/api/projects/${stage.projectId}/documents`, { method: "POST", body: form });
        const uploaded = await upload.json() as { document?: { id: string }; error?: string };
        if (!upload.ok || !uploaded.document?.id) throw new Error(uploaded.error || copy.retry);
        evidenceDocumentId = uploaded.document.id;
        setDrafts((current) => ({ ...current, [stage.id]: { ...draft, uploadedDocumentId: evidenceDocumentId } }));
      }
      const response = await fetch("/api/company/disbursement-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: stage.id, progressNote: draft.note, evidenceDocumentId }),
      });
      const payload = await response.json() as { error?: string; code?: string };
      if (!response.ok) throw new Error(payload.code === "EVIDENCE_BEFORE_TRANSFER" ? copy.proofAfterTransfer : payload.error || copy.retry);
      setDrafts((current) => ({ ...current, [stage.id]: emptyDraft() }));
      setRefresh((value) => value + 1);
      toast({ title: copy.sent });
    } catch (cause) {
      toast({ title: copy.error, description: cause instanceof Error ? cause.message : copy.retry, variant: "destructive" });
    } finally {
      setBusyStageId(null);
      setConfirmStageId(null);
    }
  };

  return <section className="mt-6" aria-label={copy.title}>
    <div className="mb-3 flex items-center gap-2 text-[#541249]"><Layers3 className="h-4 w-4" /><h2 className="text-sm font-semibold tracking-tight">{copy.title}</h2></div>
    <p className="mb-4 max-w-3xl text-xs leading-6 text-muted-foreground">{copy.intro}</p>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">{copy.loadingError}</p> : null}
    {loading ? <Card className="h-28 animate-pulse rounded-2xl border-[#541249]/10 bg-[#fbf7fa]" /> : null}
    {!loading && !error && groups.length === 0 ? <Card className="rounded-2xl border-[#541249]/10 p-4 text-xs text-muted-foreground">{copy.empty}</Card> : null}
    <div className="space-y-4">
      {groups.map((items) => <Card key={items[0].projectId} className="gap-0 overflow-hidden rounded-[1.5rem] border-[#541249]/12 p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#541249]/10 bg-[#fbf7fa] px-4 py-3 sm:px-5"><p className="text-sm font-semibold">{items[0].projectTitle}</p><p className="text-xs text-[#541249]">{items.length} {locale === "fr" ? items.length === 1 ? "étape" : "étapes" : items.length === 1 ? "stage" : "stages"}</p></div>
        <div className="divide-y divide-[#541249]/10">
          {items.map((stage) => {
            const draft = drafts[stage.id] ?? emptyDraft();
            const canSubmit = canSubmitStageEvidence(stage.status, stage.transferStatus) && ["submit", "sign", "manage"].includes(stage.mandate);
            const status = stage.transferStatus === "executed"
              ? stage.status === "qa_passed" ? copy.passed : stage.status === "evidence_submitted" ? copy.submitted : stage.status === "changes_requested" ? copy.changes : copy.reportNeeded
              : stage.transferStatus === "approved" ? copy.approved : stage.transferStatus === "pending" ? copy.prepared : copy.planned;
            return <div key={stage.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-sm font-semibold">{stage.trancheNo}. {stage.title}</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{copy.amount} : {money(stage.grossAmount)}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{copy.target} : {new Date(`${stage.targetDate}T00:00:00Z`).toLocaleDateString(dateLocale)}</span></div></div>
                <Badge variant="outline" className="border-[#541249]/15 bg-[#fbf6fa] text-[#541249]">{status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-[#541249]/10 bg-[#fcf9fb] px-3 py-2.5 text-xs"><span className="font-semibold text-[#541249]">{copy.net} : {money(stage.netAmount)}</span><span className="text-muted-foreground">{copy.commission} : {money(stage.commissionAmount)}</span></div>
              <p className="mt-3 rounded-xl bg-[#f9f5f8] p-3 text-xs leading-5"><strong className="text-[#541249]">{copy.criteria} :</strong> {stage.qualityCriteria}</p>
              {stage.progressNote ? <p className="mt-3 text-xs leading-6"><strong>{copy.report} :</strong> {stage.progressNote}</p> : null}
              {stage.evidenceDocumentId ? <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><a href={`/api/projects/documents/${stage.evidenceDocumentId}?download=1`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#541249] hover:underline"><FileCheck2 className="h-4 w-4" />{stage.evidenceFileName || copy.proofSaved}</a>{stage.evidenceUploadedAt ? <span className="text-muted-foreground">{copy.proofDate} {new Date(stage.evidenceUploadedAt).toLocaleDateString(dateLocale)}</span> : null}</div> : null}
              {stage.qaNote ? <p className="mt-3 rounded-xl border border-[#541249]/12 bg-white p-3 text-xs leading-5"><strong>{copy.qa} :</strong> {stage.qaNote}</p> : null}
              {stage.transferStatus === "approved" ? <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-[#541249]" />{copy.pendingText}</p> : null}
              {stage.transferStatus === "executed" ? <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#541249]"><CircleCheck className="h-4 w-4" />{copy.executed}{stage.transferExecutedAt ? ` · ${new Date(stage.transferExecutedAt).toLocaleDateString(dateLocale)}` : ""}</p> : null}
              {canSubmit ? <div className="mt-4 grid gap-3 rounded-2xl border border-[#541249]/12 bg-white p-3 sm:p-4">
                <div><Label htmlFor={`stage-note-${stage.id}`}>{copy.report}</Label><Textarea id={`stage-note-${stage.id}`} className="mt-1.5 min-h-24 rounded-xl" placeholder={copy.reportPlaceholder} value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [stage.id]: { ...draft, note: event.target.value } }))} /></div>
                <div><Label htmlFor={`stage-file-${stage.id}`}>{copy.proof}</Label><label htmlFor={`stage-file-${stage.id}`} className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#541249]/30 bg-[#fcf9fb] px-4 py-3 text-xs text-[#541249]"><FileUp className="h-5 w-5 shrink-0" /><span className="break-all">{draft.file?.name || copy.choose}</span></label><input id={`stage-file-${stage.id}`} type="file" accept=".pdf,.docx,.xlsx,.doc,.xls,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => setDrafts((current) => ({ ...current, [stage.id]: { ...draft, file: event.target.files?.[0] || null, uploadedDocumentId: null } }))} /></div>
                <Button size="sm" className="btn-nexora w-full sm:w-fit" disabled={busyStageId === stage.id || draft.note.trim().length < 30 || (!draft.file && !draft.uploadedDocumentId)} onClick={() => setConfirmStageId(stage.id)}>{busyStageId === stage.id ? copy.sending : copy.send}<ArrowRight className="h-4 w-4" /></Button>
              </div> : null}
            </div>;
          })}
        </div>
      </Card>)}
    </div>
    <AlertDialog open={Boolean(confirmStageId)} onOpenChange={(open) => { if (!open && !busyStageId) setConfirmStageId(null); }}><AlertDialogContent className="max-w-md rounded-[1.5rem] border-[#541249]/15 p-6"><AlertDialogHeader><AlertDialogTitle className="text-lg font-semibold">{copy.confirmTitle}</AlertDialogTitle><AlertDialogDescription className="leading-6">{copy.confirmText}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={Boolean(busyStageId)}>{copy.cancel}</AlertDialogCancel><AlertDialogAction className="bg-[#541249] text-white hover:bg-[#380c31]" disabled={Boolean(busyStageId)} onClick={(event) => { event.preventDefault(); const stage = stages.find((item) => item.id === confirmStageId); if (stage) void submit(stage); }}>{busyStageId ? copy.sending : copy.confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
