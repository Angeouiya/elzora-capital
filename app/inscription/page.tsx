"use client";

import { useState } from "react";
import Link from "next/link";
import { NexoraLogo } from "@/components/NexoraLogo";

const steps = [
  { n: 1, label: "Informations" },
  { n: 2, label: "Sécurité" },
  { n: 3, label: "Vérification" },
];

const pwdChecks = [
  { label: "8 caractères minimum", test: (s: string) => s.length >= 8 },
  { label: "1 majuscule", test: (s: string) => /[A-Z]/.test(s) },
  { label: "1 chiffre", test: (s: string) => /\d/.test(s) },
  { label: "1 caractère spécial", test: (s: string) => /[!@#$%^&*(),.?":{}|<>]/.test(s) },
];

export default function InscriptionPage() {
  const [step, setStep] = useState(1);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [accountType, setAccountType] = useState("particulier");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [twoFA, setTwoFA] = useState(true);
  const [idFile, setIdFile] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const pwdStrength = pwdChecks.filter((c) => c.test(password)).length;

  return (
    <main className="flex flex-col min-h-screen bg-surface">
      {/* Top Brand */}
      <div className="px-space-md pt-10 pb-6 flex flex-col items-center animate-fade-in-up">
        <NexoraLogo size={48} />
        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold mt-3">Nexora Capital</h1>
        <p className="font-body-md text-body-md text-secondary mt-1">Créer votre compte investisseur</p>
      </div>

      {/* Step Indicator */}
      <div className="px-space-md mb-6 animate-fade-in-up animate-fade-in-up-delay-1">
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                step === s.n ? "bg-primary-container" : step > s.n ? "bg-tertiary-container" : "bg-surface-container"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-data-mono font-bold ${
                  step > s.n ? "bg-tertiary text-on-tertiary" : step === s.n ? "bg-on-surface text-surface" : "bg-surface-container-high text-secondary"
                }`}>
                  {step > s.n ? <span className="material-symbols-outlined text-[14px]">check</span> : s.n}
                </div>
                <span className={`font-label-sm text-label-sm ${step === s.n ? "text-on-surface font-semibold" : step > s.n ? "text-tertiary font-medium" : "text-secondary"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-0.5 ${step > s.n ? "bg-tertiary-container" : "bg-surface-container-high"}`}></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-space-md pb-10">
        {/* Step 1: Informations */}
        {step === 1 && (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-5 animate-scale-in">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Vos informations personnelles</h2>
              <p className="font-body-sm text-body-sm text-secondary mt-1">Ces données seront utilisées pour votre compte investisseur.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="prenom">Prénom</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">person</span>
                  <input id="prenom" className="w-full h-11 pl-10 pr-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="Amadou" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="nom">Nom</label>
                <input id="nom" className="w-full h-11 px-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="Koné" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="email-reg">Adresse email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">mail</span>
                <input id="email-reg" type="email" className="w-full h-11 pl-10 pr-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="phone-reg">Téléphone</label>
              <div className="flex gap-2">
                <div className="h-11 px-3 bg-surface-container-high rounded-lg flex items-center font-data-mono text-body-sm text-on-surface shrink-0">+221</div>
                <input id="phone-reg" className="w-full h-11 px-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="77 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="birth">Date de naissance</label>
              <input id="birth" type="date" className="w-full h-11 px-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="font-label-caps text-label-caps uppercase text-secondary">Type de compte</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAccountType("particulier")} className={`p-3 rounded-lg border-2 transition-all text-left ${accountType === "particulier" ? "border-on-surface bg-surface-container-low" : "border-transparent bg-surface-container-low"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold">Particulier</span>
                    {accountType === "particulier" && <span className="px-1.5 py-0.5 rounded bg-primary-container text-[9px] font-label-caps uppercase font-bold">Recommandé</span>}
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">Compte investisseur individuel</p>
                </button>
                <button onClick={() => setAccountType("entreprise")} className={`p-3 rounded-lg border-2 transition-all text-left ${accountType === "entreprise" ? "border-on-surface bg-surface-container-low" : "border-transparent bg-surface-container-low"}`}>
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold">Entreprise</span>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">Compte société / institution</p>
                </button>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="w-full h-12 bg-primary-container text-on-surface font-headline-sm text-body-md font-bold rounded-lg flex items-center justify-center gap-2 glow-primary transition-all active:scale-[0.99]">
              <span>Continuer</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2: Sécurité */}
        {step === 2 && (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-5 animate-scale-in">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Sécurisez votre compte</h2>
              <p className="font-body-sm text-body-sm text-secondary mt-1">Choisissez un mot de passe robuste.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="pwd-reg">Mot de passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">lock</span>
                <input id="pwd-reg" type={showPwd ? "text" : "password"} className="w-full h-11 pl-10 pr-10 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPwd ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {/* Strength bars */}
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwdStrength ? (pwdStrength <= 2 ? "bg-error" : pwdStrength === 3 ? "bg-primary" : "bg-tertiary") : "bg-surface-container-high"}`}></div>
                ))}
              </div>
              <span className="font-label-sm text-label-sm text-secondary">{pwdStrength === 0 ? "Trop faible" : pwdStrength <= 2 ? "Faible" : pwdStrength === 3 ? "Bon" : "Excellent"}</span>
            </div>

            {/* Password checklist */}
            <div className="space-y-1.5">
              {pwdChecks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${c.test(password) ? "text-tertiary" : "text-secondary"}`}>
                    {c.test(password) ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={`font-body-sm text-body-sm ${c.test(password) ? "text-tertiary" : "text-secondary"}`}>{c.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="font-label-caps text-label-caps uppercase text-secondary" htmlFor="confirm-pwd">Confirmer le mot de passe</label>
              <input id="confirm-pwd" type="password" className="w-full h-11 px-3 bg-surface-container-low rounded-lg text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-on-surface transition-all" placeholder="••••••••" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              {confirmPwd && password !== confirmPwd && <span className="font-body-sm text-body-sm text-error">Les mots de passe ne correspondent pas</span>}
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-secondary">security</span>
                <div>
                  <span className="font-body-sm text-body-sm text-on-surface font-medium block">Authentification à deux facteurs</span>
                  <span className="font-body-sm text-body-sm text-secondary">Protection renforcée par SMS</span>
                </div>
              </div>
              <button onClick={() => setTwoFA(!twoFA)} className={`w-11 h-6 rounded-full transition-all relative ${twoFA ? "bg-tertiary" : "bg-surface-container-high"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${twoFA ? "left-[22px]" : "left-0.5"}`}></div>
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 h-12 bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Retour</span>
              </button>
              <button onClick={() => setStep(3)} className="flex-[2] h-12 bg-primary-container text-on-surface font-headline-sm text-body-md font-bold rounded-lg flex items-center justify-center gap-2 glow-primary transition-all active:scale-[0.99]">
                <span>Continuer</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Vérification */}
        {step === 3 && (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-5 animate-scale-in">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Vérification de votre identité</h2>
              <p className="font-body-sm text-body-sm text-secondary mt-1">Conformité KYC — BCEAO/UEMOA.</p>
            </div>

            {/* ID Upload */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps uppercase text-secondary font-semibold">Pièce d&apos;identité</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-container-high rounded-xl cursor-pointer hover:border-primary transition-colors bg-surface-container-low/50">
                {idFile ? (
                  <div className="flex items-center gap-2 text-tertiary">
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                    <span className="font-body-sm text-body-sm font-medium">{idFile}</span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[32px] text-secondary mb-2">upload_file</span>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">Téléverser votre pièce d&apos;identité</span>
                    <span className="font-label-sm text-label-sm text-secondary mt-1">CNI, Passeport, Permis de conduire</span>
                  </>
                )}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && setIdFile(e.target.files[0].name)} />
              </label>
            </div>

            {/* Selfie Upload */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps uppercase text-secondary font-semibold">Photo de votre visage</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-container-high rounded-xl cursor-pointer hover:border-primary transition-colors bg-surface-container-low/50">
                {selfie ? (
                  <div className="flex items-center gap-2 text-tertiary">
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                    <span className="font-body-sm text-body-sm font-medium">{selfie}</span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[32px] text-secondary mb-2">face</span>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium">Prendre ou importer une photo</span>
                    <span className="font-label-sm text-label-sm text-secondary mt-1">Photo nette, fond uni</span>
                  </>
                )}
                <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && setSelfie(e.target.files[0].name)} />
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 h-12 bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Retour</span>
              </button>
              <button
                onClick={() => { setCreating(true); setTimeout(() => { setCreating(false); setCreated(true); }, 1500); }}
                disabled={creating || created}
                className={`flex-[2] h-12 font-headline-sm text-body-md font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${created ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-surface glow-primary"}`}
              >
                {creating ? (
                  <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span><span>Création en cours...</span></>
                ) : created ? (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span><span>Compte créé !</span></>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">check_circle</span><span>Créer mon compte</span></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-6 text-center animate-fade-in-up animate-fade-in-up-delay-2">
          <p className="font-body-sm text-body-sm text-secondary">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="text-on-surface font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
