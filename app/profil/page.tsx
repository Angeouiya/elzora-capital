"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarDays, CheckCircle2, CircleAlert, KeyRound, Mail, Phone, Save, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFCFA } from "@/lib/calculations";

type Me = { id:string; email:string; phone:string|null; firstName:string; lastName:string; role:string; kycStatus:string; accountType:string; country:string; language:string; emailVerified:boolean; createdAt:string; company?:{name:string;status:string}|null };
type Investment = { id:string; amount:number; status:string };

export default function ProfilPage() {
  const [me,setMe]=useState<Me|null>(null); const [investments,setInvestments]=useState<Investment[]>([]); const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false); const [passwordSaving,setPasswordSaving]=useState(false); const [feedback,setFeedback]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);
  const [form,setForm]=useState({firstName:"",lastName:"",phone:"",language:"fr"});
  const [passwords,setPasswords]=useState({currentPassword:"",newPassword:"",confirm:""});

  useEffect(()=>{ let cancelled=false; Promise.all([
    fetch("/api/users/me").then(async r=>{if(!r.ok)throw new Error("Impossible de charger votre compte."); return await r.json() as Me;}),
    fetch("/api/investments").then(async r=>r.ok?await r.json() as Investment[]:[])
  ]).then(([user,rows])=>{if(cancelled)return; setMe(user);setInvestments(rows);setForm({firstName:user.firstName,lastName:user.lastName,phone:user.phone??"",language:user.language||"fr"});})
    .catch(e=>!cancelled&&setError(e instanceof Error?e.message:"Erreur de chargement."))
    .finally(()=>!cancelled&&setLoading(false)); return()=>{cancelled=true}; },[]);

  const capitalConfirmed=useMemo(()=>investments.filter(i=>i.status==="CONFIRMED").reduce((s,i)=>s+i.amount,0),[investments]);
  const activePositions=investments.filter(i=>i.status==="CONFIRMED").length;

  const saveProfile=async(event:FormEvent)=>{event.preventDefault();setSaving(true);setFeedback(null);setError(null);try{const res=await fetch("/api/users/me",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Modification impossible.");setMe(data);setFeedback("Informations du compte mises à jour.");}catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}finally{setSaving(false)}};
  const changePassword=async(event:FormEvent)=>{event.preventDefault();setFeedback(null);setError(null);if(passwords.newPassword!==passwords.confirm){setError("Les deux nouveaux mots de passe ne correspondent pas.");return;}setPasswordSaving(true);try{const res=await fetch("/api/users/me/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:passwords.currentPassword,newPassword:passwords.newPassword})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Modification impossible.");setPasswords({currentPassword:"",newPassword:"",confirm:""});setFeedback("Mot de passe modifié.");}catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}finally{setPasswordSaving(false)}};
  const initials=me?`${me.firstName[0]??""}${me.lastName[0]??""}`.toUpperCase():"NX";

  return <div className="min-h-screen bg-[#F5F5F3]">
    <AppHeader title="Mon compte" subtitle="NEXORA CAPITAL" showBack />
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      {loading?<div className="grid gap-4 lg:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-52 rounded-[20px] bg-white animate-pulse"/>)}</div>:
      error&&!me?<Card className="mx-auto max-w-xl border-[#C62828]/20"><div className="flex items-start gap-3"><CircleAlert className="h-5 w-5 text-[#C62828]"/><p className="text-sm text-[#C62828]">{error}</p></div></Card>:
      me?<div className="space-y-6">
        <section className="nx-panel overflow-hidden"><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] bg-[#101010] text-2xl font-bold text-[#B6FF00]">{initials}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-0.03em] text-[#101010]">{me.firstName} {me.lastName}</h1>{me.emailVerified&&<BadgeCheck className="h-5 w-5 text-[#166534]"/>}</div><p className="mt-1 text-sm text-[#101010]/55">{me.email}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#EFFBDD] px-3 py-1.5 font-semibold text-[#101010]">{me.role==="ENTERPRISE"?"Entreprise":me.role==="ADMIN"?"Équipe interne":"Investisseur"}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[#101010]/55 ring-1 ring-[#101010]/8"><CalendarDays className="h-3.5 w-3.5"/>Depuis {new Date(me.createdAt).toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</span></div></div>
          <Link href="/parametres"><Button variant="secondary">Paramètres</Button></Link>
        </div></section>
        {(feedback||error)&&<div className={`rounded-[16px] border px-4 py-3 text-sm ${error?"border-[#C62828]/20 bg-[#C62828]/5 text-[#C62828]":"border-[#166534]/20 bg-[#EFFBDD] text-[#166534]"}`}>{error??feedback}</div>}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Card padding="lg"><CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader><form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2"><Input label="Prénom" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/><Input label="Nom" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/><Input label="Téléphone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+225..."/><label className="flex flex-col gap-1.5 text-sm font-medium text-[#101010]">Langue<select value={form.language} onChange={e=>setForm(f=>({...f,language:e.target.value}))} className="nx-field h-12 px-4 text-base md:h-11 md:text-sm"><option value="fr">Français</option><option value="en">English</option></select></label><div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={saving} icon={<Save className="h-4 w-4"/>}>Enregistrer</Button></div></form></Card>
            <Card padding="lg" id="securite"><CardHeader><CardTitle>Sécurité du compte</CardTitle></CardHeader><form onSubmit={changePassword} className="space-y-4"><Input label="Mot de passe actuel" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e=>setPasswords(p=>({...p,currentPassword:e.target.value}))}/><div className="grid gap-4 sm:grid-cols-2"><Input label="Nouveau mot de passe" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={e=>setPasswords(p=>({...p,newPassword:e.target.value}))} hint="8 caractères minimum, avec lettres et chiffres."/><Input label="Confirmer" type="password" autoComplete="new-password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))}/></div><Button type="submit" variant="secondary" loading={passwordSaving} icon={<KeyRound className="h-4 w-4"/>}>Modifier le mot de passe</Button></form></Card>
          </div>
          <div className="space-y-6">
            <Card><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EFFBDD]"><ShieldCheck className="h-5 w-5 text-[#166534]"/></div><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#101010]/40">Vérification</p><div className="mt-1"><StatusBadge status={me.kycStatus}/></div></div></div><p className="mt-4 text-sm leading-relaxed text-[#101010]/58">La vérification conditionne l'accès aux opérations financières.</p><Link href="/verification" className="mt-4 block"><Button variant="secondary" className="w-full">Gérer ma vérification</Button></Link></Card>
            {me.role==="INVESTOR"&&<Card><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#101010]/40">Portefeuille</p><p className="mt-2 text-2xl font-bold tracking-tight text-[#101010]">{formatFCFA(capitalConfirmed)}</p><p className="mt-1 text-sm text-[#101010]/52">{activePositions} position{activePositions>1?"s":""} confirmée{activePositions>1?"s":""}</p><Link href="/dashboard/investissements" className="mt-4 block"><Button variant="secondary" className="w-full" icon={<Wallet className="h-4 w-4"/>}>Voir mes investissements</Button></Link></Card>}
            <Card><div className="space-y-3 text-sm"><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-[#101010]/55"><Mail className="h-4 w-4"/>Email</span><span className="truncate font-medium text-[#101010]">{me.email}</span></div><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-[#101010]/55"><Phone className="h-4 w-4"/>Téléphone</span><span className="font-medium text-[#101010]">{me.phone||"Non renseigné"}</span></div><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-[#101010]/55"><UserRound className="h-4 w-4"/>Identifiant</span><span className="font-mono text-xs text-[#101010]">{me.id.slice(-10).toUpperCase()}</span></div><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-[#101010]/55"><CheckCircle2 className="h-4 w-4"/>Email vérifié</span><span className="font-semibold text-[#166534]">{me.emailVerified?"Oui":"Non"}</span></div></div></Card>
          </div>
        </div>
      </div>:null}
    </main>
  </div>;
}
