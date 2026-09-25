"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@/lib/store";
import { CheckCircle2, Compass, Loader2, LockKeyhole } from "lucide-react";

interface InvestorProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  onSaved: () => void;
}

interface ProfileAnswers {
  experience: string;
  objective: string;
  horizon: string;
  investableCapitalRange: string;
  lossCapacity: string;
  riskComfort: string;
  understandsCapitalLoss: boolean;
  understandsIlliquidity: boolean;
}

const EMPTY_PROFILE: ProfileAnswers = {
  experience: "",
  objective: "",
  horizon: "",
  investableCapitalRange: "",
  lossCapacity: "",
  riskComfort: "",
  understandsCapitalLoss: false,
  understandsIlliquidity: false,
};

const choices = {
  experience: [
    ["first_time", "C’est une première", "This is my first time"],
    ["occasional", "J’ai déjà investi quelques fois", "I have invested a few times"],
    ["experienced", "J’investis régulièrement", "I invest regularly"],
  ],
  objective: [
    ["income", "Recevoir des revenus", "Receive income"],
    ["growth", "Faire grandir mon capital", "Grow my capital"],
    ["diversify", "Diversifier mon épargne", "Diversify my savings"],
  ],
  horizon: [
    ["under_1y", "Moins d’un an", "Less than one year"],
    ["one_to_three", "1 à 3 ans", "1 to 3 years"],
    ["three_to_five", "3 à 5 ans", "3 to 5 years"],
    ["over_five", "Plus de 5 ans", "More than 5 years"],
  ],
  investableCapitalRange: [
    ["under_100k", "Moins de 100 000 FCFA", "Less than XOF 100,000"],
    ["100k_500k", "100 000 à 500 000 FCFA", "XOF 100,000 to 500,000"],
    ["500k_2m", "500 000 à 2 000 000 FCFA", "XOF 500,000 to 2,000,000"],
    ["2m_10m", "2 000 000 à 10 000 000 FCFA", "XOF 2,000,000 to 10,000,000"],
    ["over_10m", "Plus de 10 000 000 FCFA", "More than XOF 10,000,000"],
  ],
  lossCapacity: [
    ["limited", "Très peu, cet argent m’est utile", "Very little, I rely on this money"],
    ["partial", "Une partie, sans gêner mes dépenses", "Some of it, without affecting my expenses"],
    ["substantial", "Une grande partie", "A significant part"],
  ],
  riskComfort: [
    ["cautious", "Je privilégie la prudence", "I prefer caution"],
    ["balanced", "Je cherche un équilibre", "I seek a balance"],
    ["dynamic", "J’accepte davantage de variation", "I accept more variation"],
  ],
} as const;

export function InvestorProfileDialog({ open, onOpenChange, locale, onSaved }: InvestorProfileDialogProps) {
  const en = locale === "en";
  const [answers, setAnswers] = useState<ProfileAnswers>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaved(false);
    setError(null);
    fetch("/api/investor/profile", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json() as { error?: string; profile?: ProfileAnswers | null };
        if (!response.ok) throw new Error(json.error);
        setAnswers(json.profile ? { ...EMPTY_PROFILE, ...json.profile } : EMPTY_PROFILE);
      })
      .catch(() => setError(en ? "Unable to load your answers." : "Impossible de charger vos réponses."))
      .finally(() => setLoading(false));
  }, [open, en]);

  function setChoice(field: keyof ProfileAnswers, value: string | boolean) {
    setAnswers((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.values(answers).some((value) => value === "" || value === false)) {
      setError(en ? "Answer every question and confirm both statements." : "Répondez à chaque question et confirmez les deux mentions.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/investor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error);
      setSaved(true);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error && cause.message
        ? cause.message
        : en ? "Your answers could not be saved." : "Vos réponses n’ont pas pu être enregistrées.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto rounded-[1.5rem] border-[#E8D7E5] sm:max-h-[92vh] sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EAF3] text-[#541249]">
            <Compass className="h-5 w-5" />
          </div>
          <DialogTitle>{en ? "Your investment plans" : "Votre projet d’investissement"}</DialogTitle>
          <DialogDescription>
            {en
              ? "Six simple questions help us present opportunities that suit your situation. You can update your answers at any time."
              : "Six questions simples nous aident à vous présenter des opportunités adaptées à votre situation. Vous pourrez modifier vos réponses à tout moment."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#541249]" /></div>
        ) : saved ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 px-6 py-9 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 font-semibold text-foreground">{en ? "Your answers are saved" : "Vos réponses sont enregistrées"}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {en ? "You can now continue exploring opportunities." : "Vous pouvez maintenant poursuivre la découverte des opportunités."}
            </p>
            <Button className="btn-nexora mt-5" onClick={() => onOpenChange(false)}>{en ? "Continue" : "Continuer"}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Question label={en ? "Your investing experience" : "Votre expérience de l’investissement"}>
                <ChoiceSelect value={answers.experience} onChange={(value) => setChoice("experience", value)} options={choices.experience} en={en} />
              </Question>
              <Question label={en ? "Your main goal" : "Votre objectif principal"}>
                <ChoiceSelect value={answers.objective} onChange={(value) => setChoice("objective", value)} options={choices.objective} en={en} />
              </Question>
              <Question label={en ? "How long can you leave this money invested?" : "Combien de temps pouvez-vous laisser cet argent investi ?"}>
                <ChoiceSelect value={answers.horizon} onChange={(value) => setChoice("horizon", value)} options={choices.horizon} en={en} />
              </Question>
              <Question label={en ? "Amount you can invest without affecting essential expenses" : "Montant disponible sans affecter vos dépenses essentielles"}>
                <ChoiceSelect value={answers.investableCapitalRange} onChange={(value) => setChoice("investableCapitalRange", value)} options={choices.investableCapitalRange} en={en} />
              </Question>
              <Question label={en ? "If an investment lost value, what could you absorb?" : "Si un investissement perdait de la valeur, que pourriez-vous supporter ?"}>
                <ChoiceSelect value={answers.lossCapacity} onChange={(value) => setChoice("lossCapacity", value)} options={choices.lossCapacity} en={en} />
              </Question>
              <Question label={en ? "Which approach feels right for you?" : "Quelle approche vous ressemble le plus ?"}>
                <ChoiceSelect value={answers.riskComfort} onChange={(value) => setChoice("riskComfort", value)} options={choices.riskComfort} en={en} />
              </Question>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#E8D7E5] bg-[#FCF8FB] p-4 text-sm">
              <CheckRow checked={answers.understandsCapitalLoss} onChange={(value) => setChoice("understandsCapitalLoss", value)} label={en ? "I understand that I may lose some or all of the money invested." : "Je comprends que je peux perdre tout ou partie de la somme investie."} />
              <CheckRow checked={answers.understandsIlliquidity} onChange={(value) => setChoice("understandsIlliquidity", value)} label={en ? "I understand that a quick resale or withdrawal is not guaranteed." : "Je comprends qu’une revente ou un retrait rapide n’est pas garanti."} />
            </div>

            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{en ? "Later" : "Plus tard"}</Button>
              <Button type="submit" className="btn-nexora" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {en ? "Save my answers" : "Enregistrer mes réponses"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm font-semibold leading-snug">{label}</Label>{children}</div>;
}

function ChoiceSelect({ value, onChange, options, en }: { value: string; onChange: (value: string) => void; options: readonly (readonly [string, string, string])[]; en: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-h-11 w-full rounded-xl"><SelectValue placeholder={en ? "Choose an answer" : "Choisir une réponse"} /></SelectTrigger>
      <SelectContent>{options.map(([key, fr, english]) => <SelectItem key={key} value={key}>{en ? english : fr}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#541249]" />
      <span>{label}</span>
    </label>
  );
}
