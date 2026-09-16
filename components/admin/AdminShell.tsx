"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileCheck2,
  FileText,
  Headphones,
  LayoutDashboard,
  Menu,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";

const NAV = [
  { href: "/admin/dashboard", label: "Pilotage", icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/analyse", label: "Analyse", icon: Search },
  { href: "/admin/offres", label: "Offres", icon: FileText },
  { href: "/admin/finances", label: "Finances", icon: WalletCards },
  { href: "/admin/comptabilite", label: "Comptabilité", icon: BookOpen },
  { href: "/admin/commissions", label: "Commissions", icon: Percent },
  { href: "/admin/risques", label: "Risques", icon: AlertTriangle },
  { href: "/admin/contrats", label: "Contrats", icon: FileCheck2 },
  { href: "/admin/assistance", label: "Assistance", icon: Headphones },
  { href: "/admin/acquisition", label: "Acquisition", icon: BriefcaseBusiness },
  { href: "/admin/configuration", label: "Configuration", icon: Settings },
  { href: "/admin/securite", label: "Sécurité", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit", icon: Clock3 },
  { href: "/admin/reporting", label: "Reporting", icon: BarChart3 },
];

export function AdminShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigation = (
    <nav className="flex flex-col gap-1.5" aria-label="Portail équipe">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={`group flex min-h-11 items-center gap-3 rounded-[13px] px-3 text-[13px] font-semibold transition-all ${active ? "bg-[#101010] text-white shadow-[0_10px_24px_rgba(16,16,16,.16)]" : "text-[#101010]/58 hover:bg-[#F5F5F3] hover:text-[#101010]"}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${active ? "bg-[#B6FF00] text-[#101010]" : "bg-[#F5F5F3] text-[#101010]/50 group-hover:bg-white"}`}><Icon className="h-4 w-4" /></span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F3] lg:grid lg:grid-cols-[276px_minmax(0,1fr)]">
      <aside className="hidden h-screen border-r border-[#101010]/7 bg-white lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="flex h-[78px] items-center gap-3 border-b border-[#101010]/7 px-5">
          <NexoraLogo size={36} />
          <div><p className="text-[15px] font-bold tracking-[-.02em] text-[#101010]">Nexora Capital</p><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#101010]/38">Portail équipe</p></div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{navigation}</div>
        <div className="border-t border-[#101010]/7 p-4">
          <div className="rounded-[16px] bg-[#101010] p-3 text-white"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#B6FF00]"/><span className="text-xs font-semibold">Contrôle interne</span></div><p className="mt-1 text-[11px] leading-relaxed text-white/55">Décisions, paiements et modifications sensibles doivent rester tracés et séparés.</p></div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-[#101010]/7 bg-white/94 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between px-4"><button type="button" className="nx-icon-button !h-10 !w-10" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu className="h-5 w-5"/></button><Link href="/admin/dashboard" className="flex items-center gap-2"><NexoraLogo size={28}/><span className="text-sm font-bold">Équipe Nexora</span></Link><span className="h-10 w-10"/></div>
        </header>
        {open && <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#101010]/60 backdrop-blur-[2px]"/><aside className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-white shadow-[28px_0_80px_rgba(16,16,16,.22)]"><div className="flex h-16 items-center justify-between border-b border-[#101010]/7 px-4"><div className="flex items-center gap-2.5"><NexoraLogo size={30}/><div><p className="text-sm font-bold">Nexora Capital</p><p className="text-[10px] uppercase tracking-[.1em] text-[#101010]/40">Portail équipe</p></div></div><button type="button" className="nx-icon-button !h-9 !w-9" onClick={() => setOpen(false)}><X className="h-4 w-4"/></button></div><div className="flex-1 overflow-y-auto p-3">{navigation}</div></aside></div>}

        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
          <div className="mb-7 flex flex-col gap-4 border-b border-[#101010]/7 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#101010]/38">Portail équipe · contrôle & exécution</p><h1 className="nx-page-title">{title}</h1>{subtitle && <p className="nx-page-subtitle">{subtitle}</p>}</div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
