"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, Bell, Building2, CalendarClock, ChartColumn, FileText, FolderOpen, Landmark, LayoutDashboard, Menu, MessageSquare, UserRound, Users, X } from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";

const NAV = [
  { label: "Vue d'ensemble", href: "/entreprise/dashboard", icon: LayoutDashboard },
  { label: "Société", href: "/entreprise", icon: Building2, exact: true },
  { label: "Dossiers", href: "/entreprise/projet/nouveau", icon: FolderOpen },
  { label: "Financements", href: "/entreprise/financements", icon: Landmark },
  { label: "Décaissements", href: "/entreprise/financements#decaissements", icon: Banknote },
  { label: "Remboursements", href: "/entreprise/financements#remboursements", icon: CalendarClock },
  { label: "Rapports", href: "/entreprise/rapports", icon: ChartColumn },
  { label: "Documents", href: "/entreprise/documents", icon: FileText },
  { label: "Équipe", href: "/entreprise/equipe", icon: Users },
  { label: "Messages", href: "/entreprise/messages", icon: MessageSquare },
];

export function EntrepriseShell({ title, subtitle, actions, companyName, children }: { title: string; subtitle?: string; actions?: ReactNode; companyName?: string | null; children: ReactNode }) {
  const path = usePathname(); const [open,setOpen]=useState(false);
  useEffect(()=>{ document.body.style.overflow=open?"hidden":""; return()=>{document.body.style.overflow=""};},[open]);
  const nav = <nav className="flex flex-col gap-1.5">{NAV.map(({href,label,icon:Icon,exact})=>{ const base=href.split("#")[0]; const active=exact?path===base:path===base||path.startsWith(`${base}/`); return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-[13px] px-3 text-[13px] font-semibold transition-all ${active?"bg-[#101010] text-white":"text-[#101010]/58 hover:bg-[#F5F5F3] hover:text-[#101010]"}`}><span className={`grid h-8 w-8 place-items-center rounded-[10px] ${active?"bg-[#B6FF00] text-[#101010]":"bg-[#F5F5F3]"}`}><Icon className="h-4 w-4"/></span>{label}</Link>})}</nav>;
  return <div className="min-h-screen bg-[#F5F5F3] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]"><aside className="hidden h-screen flex-col border-r border-[#101010]/7 bg-white lg:sticky lg:top-0 lg:flex"><Link href="/entreprise/dashboard" className="flex h-[78px] items-center gap-3 border-b border-[#101010]/7 px-5"><NexoraLogo size={35}/><div><p className="text-[15px] font-bold">Nexora Capital</p><p className="text-[10px] uppercase tracking-[.1em] text-[#101010]/38">Espace entreprise</p></div></Link><div className="flex-1 overflow-y-auto p-3">{nav}</div><div className="border-t border-[#101010]/7 p-4"><div className="flex items-center gap-3 rounded-[14px] bg-[#F5F5F3] p-3"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#B6FF00]"><UserRound className="h-4 w-4"/></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{companyName||"Mon entreprise"}</p><p className="text-[11px] text-[#101010]/45">Contexte entreprise</p></div></div></div></aside><div className="min-w-0"><header className="sticky top-0 z-40 border-b border-[#101010]/7 bg-white/94 backdrop-blur-xl lg:hidden"><div className="flex h-16 items-center justify-between px-4"><button className="nx-icon-button !h-10 !w-10" onClick={()=>setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5"/></button><Link href="/entreprise/dashboard" className="flex items-center gap-2"><NexoraLogo size={28}/><span className="max-w-[180px] truncate text-sm font-bold">{companyName||"Entreprise"}</span></Link><Link href="/notifications" className="nx-icon-button !h-10 !w-10"><Bell className="h-4 w-4"/></Link></div></header>{open&&<div className="fixed inset-0 z-[80] lg:hidden"><button className="absolute inset-0 bg-[#101010]/60" onClick={()=>setOpen(false)} aria-label="Fermer"/><aside className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-white"><div className="flex h-16 items-center justify-between border-b border-[#101010]/7 px-4"><div className="flex items-center gap-2"><NexoraLogo size={30}/><b>Nexora Capital</b></div><button className="nx-icon-button !h-9 !w-9" onClick={()=>setOpen(false)}><X className="h-4 w-4"/></button></div><div className="flex-1 overflow-y-auto p-3">{nav}</div></aside></div>}<main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-9 lg:py-9"><div className="mb-7 flex flex-col gap-4 border-b border-[#101010]/7 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.11em] text-[#101010]/38">Espace entreprise</p><h1 className="nx-page-title">{title}</h1>{subtitle&&<p className="nx-page-subtitle">{subtitle}</p>}</div>{actions&&<div className="flex flex-wrap gap-2">{actions}</div>}</div>{children}</main></div></div>;
}
