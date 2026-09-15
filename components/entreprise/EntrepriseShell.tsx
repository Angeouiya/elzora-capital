"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building,
  FolderOpen,
  Landmark,
  Banknote,
  CalendarClock,
  ChartColumn,
  FileText,
  Users,
  UserRound,
  Menu,
  Bell,
} from "lucide-react";
import { Sidebar, SidebarItem } from "@/components/ui/Sidebar";
import { NexoraLogo } from "@/components/NexoraLogo";

const NAV_ITEMS: Array<Omit<SidebarItem, "icon"> & { icon: typeof LayoutDashboard }> = [
  { label: "Vue d'ensemble", href: "/entreprise/dashboard", icon: LayoutDashboard },
  { label: "Société", href: "/entreprise", icon: Building, exact: true },
  { label: "Dossiers", href: "/entreprise/projet/nouveau", icon: FolderOpen },
  { label: "Financements", href: "/entreprise/financements", icon: Landmark },
  { label: "Décaissements", href: "/entreprise/financements#decaissements", icon: Banknote },
  { label: "Remboursements", href: "/entreprise/financements#remboursements", icon: CalendarClock },
  { label: "Rapports", href: "/entreprise/rapports", icon: ChartColumn },
  { label: "Documents", href: "/entreprise/documents", icon: FileText },
  { label: "Équipe", href: "/entreprise/equipe", icon: Users },
];

interface EntrepriseShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  companyName?: string | null;
  children: ReactNode;
}

export function EntrepriseShell({ title, subtitle, actions, companyName, children }: EntrepriseShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: SidebarItem[] = NAV_ITEMS.map(({ icon: Icon, ...item }) => ({
    ...item,
    icon: <Icon className="h-5 w-5" />,
  }));

  const sidebarHeader = (
    <Link href="/entreprise/dashboard" className="flex items-center gap-2.5">
      <NexoraLogo size={32} />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-[#101010]">Nexora Capital</span>
        <span className="text-xs text-[#101010]/50">Espace entreprise</span>
      </div>
    </Link>
  );

  const sidebarFooter = (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-[#B6FF00] flex items-center justify-center shrink-0">
        <UserRound className="h-4 w-4 text-[#101010]" />
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-medium text-[#101010] truncate">
          {companyName || "Mon entreprise"}
        </span>
        <span className="text-xs text-[#101010]/50">Porteur de projet</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* Barre supérieure mobile */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#101010]/5">
        <div className="h-14 px-4 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-2 -ml-2 rounded-lg hover:bg-[#F5F5F3] text-[#101010]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/entreprise/dashboard" className="flex items-center gap-2 min-w-0">
            <NexoraLogo size={26} />
            <span className="text-sm font-bold text-[#101010] truncate">{title}</span>
          </Link>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="p-2 -mr-2 rounded-lg hover:bg-[#F5F5F3] text-[#101010]/60"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
          <Sidebar items={items} header={sidebarHeader} footer={sidebarFooter} />
        </div>

        {/* Sidebar mobile en overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-[#101010]/50"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 shadow-xl" onClick={() => setMobileOpen(false)}>
              <Sidebar items={items} header={sidebarHeader} footer={sidebarFooter} />
            </div>
          </div>
        )}

        {/* Contenu */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#101010] tracking-tight">
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-[#101010]/60 mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
