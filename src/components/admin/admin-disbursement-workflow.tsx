"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCheck, CircleCheck, ClipboardCheck, FileUp, Layers3, ShieldCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { fmtFCFA } from "@/lib/finance";
import { canPrepareStage, canReviewStageEvidence } from "@/lib/staged-disbursement";

interface FundedProject { id: string; title: string; companyName: string; raisedAmount: number }
interface Stage {
  id: string;
  projectId: string;
  projectTitle: string;
  companyName: string;
  trancheNo: number;
  title: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  targetDate: string;
  qualityCriteria: string;
  status: string;
  plannedBy: string;
  progressNote: string | null;
  evidenceDocumentId: string | null;
  evidenceFileName: string | null;
  submittedAt: string | null;
  qaBy: string | null;
  qaAt: string | null;
  qaNote: string | null;
  transferId: string | null;
  transferStatus: string | null;
  transferPreparedBy: string | null;
  transferExecutedAt: string | null;
}
interface WorkflowResponse {
  stages: Stage[];
  eligibleProjects: FundedProject[];
  permissions: { plan: boolean; review: boolean; approve: boolean };
  currentAdminId: string;
}
interface FormStage { title: string; grossAmount: string; targetDate: string; qualityCriteria: string }
type Action = { kind: "plan" } | { kind: "qa_pass" | "request_changes" | "prepare" | "approve"; stage: Stage };

const emptyStage = (): FormStage => ({ title: "", grossAmount: "", targetDate: "", qualityCriteria: "" });

function stageLabel(stage: Stage) {
  if (stage.transferStatus === "executed") {
    if (stage.status === "qa_passed") return "Qualité validée";
    if (stage.status === "evidence_submitted") return "À contrôler";
    if (stage.status === "changes_requested") return "Correction demandée";
    return "Compte rendu attendu";
  }
  if (stage.transferStatus === "approved") return "Versement approuvé";
  if (stage.transferStatus === "pending") return "Versement à approuver";
  return "Étape à venir";
}

export function AdminDisbursementWorkflow({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast();
  const [refresh, setRefresh] = useState(0);
  const { data, loading, error } = useFetch<WorkflowResponse>(`/api/admin/disbursement-stages?refresh=${refresh}`);
  const [projectId, setProjectId] = useState("");
  const [formStages, setFormStages] = useState<FormStage[]>([emptyStage(), emptyStage()]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedProject = data?.eligibleProjects.find((project) => project.id === projectId);
  const planTotal = useMemo(() => formStages.reduce((sum, stage) => sum + (Number(stage.grossAmount) || 0), 0), [formStages]);
  const groups = useMemo(() => {
    const grouped = new Map<string, Stage[]>();
    for (const stage of data?.stages ?? []) {
      const items = grouped.get(stage.projectId) ?? [];
      items.push(stage);
      grouped.set(stage.projectId, items);
    }
    return [...grouped.values()].map((items) => items.sort((a, b) => a.trancheNo - b.trancheNo));
  }, [data?.stages]);

  const changeFormStage = (index: number, key: keyof FormStage, value: string) => {
    setFormStages((current) => current.map((stage, i) => i === index ? { ...stage, [key]: value } : stage));
  };

  const chooseProject = (value: string) => {
    setProjectId(value);
    const project = data?.eligibleProjects.find((item) => item.id === value);
    if (project) {
      const first = Math.floor(project.raisedAmount / 2);
      setFormStages([{ ...emptyStage(), grossAmount: String(first) }, { ...emptyStage(), grossAmount: String(project.raisedAmount - first) }]);
    }
  };

  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const isPlan = action.kind === "plan";
      const isReview = action.kind === "qa_pass" || action.kind === "request_changes";
      const path = isPlan || isReview ? "/api/admin/disbursement-stages" : "/api/admin/disbursements";
      const method = isPlan || action.kind === "prepare" ? "POST" : "PATCH";
      const payload = isPlan
        ? { projectId, stages: formStages.map((stage) => ({ ...stage, grossAmount: Number(stage.grossAmount) })) }
        : isReview
          ? { stageId: action.stage.id, action: action.kind, note: reviewNotes[action.stage.id] ?? "" }
          : action.kind === "prepare"
            ? { projectId: action.stage.projectId }
            : { disbursementId: action.stage.transferId, action: "approve" };
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Cette action est indisponible.");
      toast({ title: action.kind === "plan" ? "Calendrier enregistré" : action.kind === "qa_pass" ? "Contrôle qualité validé" : action.kind === "request_changes" ? "Correction demandée" : action.kind === "prepare" ? "Tranche préparée" : "Tranche approuvée" });
      if (isPlan) { setProjectId(""); setFormStages([emptyStage(), emptyStage()]); }
      setRefresh((value) => value + 1);
      onChanged();
    } catch (cause) {
      toast({ title: "Action non enregistrée", description: cause instanceof Error ? cause.message : "Réessayez.", variant: "destructive" });
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  return (
    <section className="mt-6 space-y-4" aria-label="Versements par étapes">
      <div className="overflow-hidden rounded-[1.5rem] border border-[#541249]/12 bg-[linear-gradient(115deg,#541249,#2f0a2a_72%,#180514)] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#e8c4dd]"><Layers3 className="h-4 w-4" /> FINANCEMENTS ENTREPRISES</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Des versements à chaque étape vérifiée</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">La première tranche suit les contrôles du financement et du compte entreprise. Après son versement, l’entreprise documente son utilisation ; une revue qualité indépendante ouvre la tranche suivante.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right">
            <p className="text-xs text-white/60">Calendriers suivis</p>
            <p className="text-xl font-semibold">{groups.length}</p>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Le suivi des versements ne peut pas être chargé. Réessayez en actualisant la page.</p> : null}
      {loading ? <Card className="h-24 animate-pulse rounded-2xl border-[#541249]/10 bg-[#faf5f9]" /> : null}

      {data?.permissions.plan && data.eligibleProjects.length > 0 ? (
        <Card className="gap-4 rounded-[1.5rem] border-[#541249]/12 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4e9f1] text-[#541249]"><CalendarDays className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold">Préparer un calendrier</h3><p className="mt-1 text-xs text-muted-foreground">Répartissez exactement le montant collecté et fixez un résultat vérifiable pour chaque étape.</p></div>
          </div>
          <div>
            <Label htmlFor="stage-project">Financement</Label>
            <select id="stage-project" value={projectId} onChange={(event) => chooseProject(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-white px-3 text-sm">
              <option value="">Choisir un financement</option>
              {data.eligibleProjects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.companyName} · {fmtFCFA(project.raisedAmount)}</option>)}
            </select>
          </div>
          {selectedProject ? <>
            <div className="grid gap-3 lg:grid-cols-2">
              {formStages.map((stage, index) => (
                <div key={index} className="rounded-2xl border border-[#541249]/10 bg-[#fcf9fb] p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Étape {index + 1}</p><Button size="sm" variant="ghost" disabled={formStages.length <= 2} onClick={() => setFormStages((rows) => rows.filter((_, i) => i !== index))}>Retirer</Button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Label htmlFor={`stage-title-${index}`}>Résultat attendu</Label><Input id={`stage-title-${index}`} value={stage.title} onChange={(event) => changeFormStage(index, "title", event.target.value)} className="mt-1 h-10 rounded-xl" placeholder="Ex. Équipements installés" /></div>
                    <div><Label htmlFor={`stage-amount-${index}`}>Montant brut (F CFA)</Label><Input id={`stage-amount-${index}`} type="number" min="1" step="1" value={stage.grossAmount} onChange={(event) => changeFormStage(index, "grossAmount", event.target.value)} className="mt-1 h-10 rounded-xl" /></div>
                    <div><Label htmlFor={`stage-date-${index}`}>Date cible</Label><Input id={`stage-date-${index}`} type="date" value={stage.targetDate} onChange={(event) => changeFormStage(index, "targetDate", event.target.value)} className="mt-1 h-10 rounded-xl" /></div>
                    <div className="sm:col-span-2"><Label htmlFor={`stage-quality-${index}`}>Critères de qualité à contrôler</Label><Textarea id={`stage-quality-${index}`} value={stage.qualityCriteria} onChange={(event) => changeFormStage(index, "qualityCriteria", event.target.value)} className="mt-1 min-h-20 rounded-xl" placeholder="Décrivez les résultats et les preuves attendues." /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f8f0f6] p-3 text-sm">
              <span>Répartition : <strong>{fmtFCFA(planTotal)}</strong> sur {fmtFCFA(selectedProject.raisedAmount)}</span>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={formStages.length >= 12} onClick={() => setFormStages((rows) => [...rows, emptyStage()])}>Ajouter une étape</Button><Button size="sm" className="btn-nexora" disabled={planTotal !== selectedProject.raisedAmount || formStages.some((stage) => !stage.title || !stage.targetDate || stage.qualityCriteria.length < 20)} onClick={() => setAction({ kind: "plan" })}>Enregistrer le calendrier <ArrowRight className="h-4 w-4" /></Button></div>
            </div>
          </> : null}
        </Card>
      ) : null}

      {groups.length === 0 && !loading ? <Card className="rounded-2xl border-[#541249]/10 p-5 text-sm text-muted-foreground">Aucun calendrier de versement pour le moment. Il sera préparé dès qu’un financement réel aura atteint son objectif et que le compte entreprise aura été vérifié.</Card> : null}
      {groups.map((items) => (
        <Card key={items[0].projectId} className="gap-0 overflow-hidden rounded-[1.5rem] border-[#541249]/12 p-0">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#541249]/10 bg-[#fbf7fa] px-4 py-4 sm:px-5">
            <div><h3 className="text-sm font-semibold">{items[0].projectTitle}</h3><p className="mt-0.5 text-xs text-muted-foreground">{items[0].companyName}</p></div>
            <span className="text-xs text-[#541249]">{items.length} étapes · {fmtFCFA(items.reduce((sum, stage) => sum + stage.grossAmount, 0))}</span>
          </div>
          <div className="divide-y divide-[#541249]/10">
            {items.map((stage, index) => {
              const previous = index === 0 ? null : items[index - 1];
              const cleared = canPrepareStage({
                status: stage.status,
                trancheNo: stage.trancheNo,
                previousTransferStatus: previous?.transferStatus ?? null,
                previousQualityStatus: previous?.status ?? null,
                previousReviewer: previous?.qaBy ?? null,
              });
              const canPrepare = cleared && !stage.transferId;
              const canApprove = data?.permissions.approve && cleared && stage.transferStatus === "pending" && stage.transferPreparedBy !== data.currentAdminId;
              return <div key={stage.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold">{stage.trancheNo}. {stage.title}</p><p className="mt-1 text-xs text-muted-foreground">Cible : {new Date(`${stage.targetDate}T00:00:00Z`).toLocaleDateString("fr-FR")} · {fmtFCFA(stage.grossAmount)}</p></div>
                  <Badge variant="outline" className="border-[#541249]/15 bg-[#fbf6fa] text-[#541249]">{stageLabel(stage)}</Badge>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5"><span className="font-semibold text-[#541249]">Net entreprise : {fmtFCFA(stage.netAmount)}</span><span className="text-muted-foreground">Commission déduite : {fmtFCFA(stage.commissionAmount)}</span></p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">À vérifier :</strong> {stage.qualityCriteria}</p>
                {stage.progressNote ? <p className="mt-2 rounded-xl bg-[#f8f4f7] p-3 text-xs leading-5"><strong>Compte rendu :</strong> {stage.progressNote}</p> : null}
                {stage.evidenceDocumentId ? <a href={`/api/projects/documents/${stage.evidenceDocumentId}?download=1`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#541249] underline-offset-2 hover:underline"><FileUp className="h-3.5 w-3.5" />{stage.evidenceFileName || "Voir le justificatif"}</a> : null}
                {stage.qaNote ? <p className="mt-2 text-xs text-[#541249]"><strong>Revue qualité :</strong> {stage.qaNote}</p> : null}
                {canReviewStageEvidence(stage.status, stage.transferStatus) && data?.permissions.review && stage.plannedBy !== data.currentAdminId ? <div className="mt-3 space-y-2">
                  <Label htmlFor={`qa-note-${stage.id}`}>Conclusion du contrôle</Label>
                  <Textarea id={`qa-note-${stage.id}`} value={reviewNotes[stage.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [stage.id]: event.target.value }))} className="min-h-20 rounded-xl" placeholder="Décrivez ce qui a été vérifié ou les corrections à effectuer." />
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={(reviewNotes[stage.id] ?? "").trim().length < 20} onClick={() => setAction({ kind: "request_changes", stage })}>Demander une correction</Button><Button size="sm" className="btn-nexora" disabled={(reviewNotes[stage.id] ?? "").trim().length < 20} onClick={() => setAction({ kind: "qa_pass", stage })}><ClipboardCheck className="h-4 w-4" />Valider la qualité</Button></div>
                </div> : null}
                {canPrepare && data?.permissions.plan ? <Button size="sm" className="btn-nexora mt-3" onClick={() => setAction({ kind: "prepare", stage })}>Préparer cette tranche <ArrowRight className="h-4 w-4" /></Button> : null}
                {canApprove ? <Button size="sm" variant="outline" className="mt-3 border-[#541249]/25 text-[#541249]" onClick={() => setAction({ kind: "approve", stage })}><CheckCheck className="h-4 w-4" />Approuver la tranche</Button> : null}
                {stage.transferStatus === "approved" ? <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" />Versement approuvé. L’exécution attend la connexion du partenaire de paiement et une confirmation bancaire.</p> : null}
                {stage.transferStatus === "executed" ? <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#541249]"><CircleCheck className="h-4 w-4 shrink-0" />Tranche versée{stage.transferExecutedAt ? ` le ${new Date(stage.transferExecutedAt).toLocaleDateString("fr-FR")}` : ""}. {stage.status === "qa_passed" ? "Contrôle qualité clôturé." : "Le résultat reste suivi jusqu’à la validation qualité."}</p> : null}
              </div>;
            })}
          </div>
        </Card>
      ))}

      <AlertDialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}>
        <AlertDialogContent className="max-w-md rounded-[1.5rem] border-[#541249]/15 p-6">
          <AlertDialogHeader><AlertDialogTitle className="text-lg font-semibold">Confirmer cette décision</AlertDialogTitle><AlertDialogDescription className="leading-6">{action?.kind === "plan" ? `Le calendrier de ${formStages.length} étapes pour ${selectedProject?.title ?? "ce projet"} sera communiqué à l’entreprise.` : action?.kind === "qa_pass" ? "Cette validation clôturera le contrôle qualité de la tranche reçue et, s’il reste une étape, permettra de préparer le versement suivant." : action?.kind === "request_changes" ? "L’entreprise devra déposer un nouveau compte rendu et un justificatif avant une nouvelle revue." : action?.kind === "prepare" ? `Cette tranche sera préparée sur le compte vérifié de l’entreprise. Montant prévu après commission : ${fmtFCFA(action.stage.netAmount)}.` : `Un second responsable approuvera le montant prévu de ${fmtFCFA(action?.stage.netAmount ?? 0)}. Le virement restera suspendu jusqu’à la confirmation du partenaire de paiement.`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void runAction(); }} className="bg-[#541249] text-white hover:bg-[#380c31]">{busy ? "Enregistrement…" : "Confirmer"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
