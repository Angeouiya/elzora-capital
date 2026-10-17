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
  targetDate: string;
  qualityCriteria: string;
  status: string;
  progressNote: string | null;
  evidenceDocumentId: string | null;
  evidenceFileName: string | null;
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
    title: "Versements par étapes", intro: "Chaque tranche est liée à un résultat précis. Déposez votre compte rendu et une pièce justificative ; l’équipe vérifie la qualité avant de préparer le versement suivant.",
    empty: "Le calendrier apparaîtra ici après la clôture du financement et la vérification de votre compte de réception.",
    target: "Date cible", criteria: "Résultat à vérifier", report: "Compte rendu de réalisation", reportPlaceholder: "Décrivez les travaux réalisés, les résultats obtenus et ce que montre la pièce jointe.",
    proof: "Pièce justificative", choose: "Ajouter un fichier PDF, Word, Excel ou une photo (10 Mo maximum)", send: "Transmettre pour contrôle", sending: "Transmission…",
    proofSaved: "Justificatif déposé", qa: "Retour de l’équipe", planned: "Compte rendu attendu", submitted: "En contrôle qualité", changes: "Complément demandé", passed: "Qualité validée", prepared: "Versement à approuver", approved: "Versement approuvé", executed: "Versement confirmé", pendingText: "La préparation du versement reste soumise aux vérifications de l’équipe.",
    confirmTitle: "Transmettre ce compte rendu ?", confirmText: "Votre pièce sera conservée avec le suivi du projet. L’équipe pourra demander une correction si les résultats ne répondent pas aux critères annoncés.", cancel: "Revenir", confirm: "Oui, transmettre", sent: "Compte rendu transmis", error: "Le compte rendu n’a pas pu être transmis", retry: "Réessayez ou choisissez de nouveau la pièce.",
    loadingError: "Le suivi des versements est momentanément indisponible.",
  },
  en: {
    title: "Milestone payments", intro: "Each payment is tied to a specific outcome. Submit a progress report and supporting file; the team checks quality before preparing the next transfer.",
    empty: "The schedule will appear here after funding closes and your receiving account is verified.",
    target: "Target date", criteria: "Outcome to verify", report: "Progress report", reportPlaceholder: "Describe the work completed, the results achieved and what the attached file demonstrates.",
    proof: "Supporting file", choose: "Add a PDF, Word, Excel file or photo (10 MB maximum)", send: "Submit for review", sending: "Submitting…",
    proofSaved: "Evidence uploaded", qa: "Team feedback", planned: "Progress report needed", submitted: "Quality review", changes: "Changes requested", passed: "Quality approved", prepared: "Transfer awaiting approval", approved: "Transfer approved", executed: "Transfer confirmed", pendingText: "The transfer remains subject to the team's checks.",
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
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || copy.retry);
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#541249]/10 bg-[#fbf7fa] px-4 py-3 sm:px-5"><p className="text-sm font-semibold">{items[0].projectTitle}</p><p className="text-xs text-[#541249]">{items.length} {locale === "fr" ? "étapes" : "stages"}</p></div>
        <div className="divide-y divide-[#541249]/10">
          {items.map((stage) => {
            const draft = drafts[stage.id] ?? emptyDraft();
            const canSubmit = ["planned", "changes_requested"].includes(stage.status) && ["submit", "sign", "manage"].includes(stage.mandate);
            const status = stage.transferStatus === "executed" ? copy.executed : stage.transferStatus === "approved" ? copy.approved : stage.transferStatus === "pending" ? copy.prepared : stage.status === "qa_passed" ? copy.passed : stage.status === "evidence_submitted" ? copy.submitted : stage.status === "changes_requested" ? copy.changes : copy.planned;
            return <div key={stage.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-sm font-semibold">{stage.trancheNo}. {stage.title}</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{money(stage.grossAmount)}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{copy.target} : {new Date(`${stage.targetDate}T00:00:00Z`).toLocaleDateString(dateLocale)}</span></div></div>
                <Badge variant="outline" className="border-[#541249]/15 bg-[#fbf6fa] text-[#541249]">{status}</Badge>
              </div>
              <p className="mt-3 rounded-xl bg-[#f9f5f8] p-3 text-xs leading-5"><strong className="text-[#541249]">{copy.criteria} :</strong> {stage.qualityCriteria}</p>
              {stage.progressNote ? <p className="mt-3 text-xs leading-6"><strong>{copy.report} :</strong> {stage.progressNote}</p> : null}
              {stage.evidenceDocumentId ? <a href={`/api/projects/documents/${stage.evidenceDocumentId}?download=1`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#541249] hover:underline"><FileCheck2 className="h-4 w-4" />{stage.evidenceFileName || copy.proofSaved}</a> : null}
              {stage.qaNote ? <p className="mt-3 rounded-xl border border-[#541249]/12 bg-white p-3 text-xs leading-5"><strong>{copy.qa} :</strong> {stage.qaNote}</p> : null}
              {stage.transferStatus === "approved" ? <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-[#541249]" />{copy.pendingText}</p> : null}
              {stage.transferStatus === "executed" ? <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#541249]"><CircleCheck className="h-4 w-4" />{copy.executed}</p> : null}
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
