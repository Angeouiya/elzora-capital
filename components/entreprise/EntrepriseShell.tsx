"use client";

import { ReactNode, useEffect, useState } from "react";
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
  X,
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const items: SidebarItem[] = NAV_ITEMS.map(({ icon: Icon, ...item }) => ({
    ...item,
    icon: <Icon className="h-4 w-4" />,
  }));

  const sidebarHeader = (
    <Link href="/entreprise/dashboard" className="group flex items-center gap-3">
      <NexoraLogo size={34} className="transition-transform duration-200 group-hover:scale-[1.03]" />
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold tracking-[-0.015em] text-[#101010]">Nexora Capital</span>
        <span className="mt-0.5 block text-[11px] font-medium text-[#101010]/45">Espace entreprise</span>
      </div>
    </Link>
  );

  const sidebarFooter = (
    <div className="flex items-center gap-3 rounded-[14px] bg-[#F5F5F3] p-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#101010]">
        <UserRound className="h-4 w-4 text-[#B6FF00]" />
      </div>
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-[#101010]">{companyName || "Mon entreprise"}</span>
        <span className="mt-0.5 block text-[11px] text-[#101010]/45">Porteur de projet</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <header className="sticky top-0 z-30 border-b border-[#101010]/7 bg-white/94 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="nx-icon-button !h-10 !w-10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/entreprise/dashboard" className="flex min-w-0 items-center gap-2.5">
            <NexoraLogo size={28} />
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-[#101010]/40">Entreprise</p>
              <p className="truncate text-sm font-bold tracking-[-0.015em] text-[#101010]">{title}</p>
            </div>
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="nx-icon-button !h-10 !w-10">
            <Bell className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      <div className="flex min-w-0">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <Sidebar items={items} header={sidebarHeader} footer={sidebarFooter} />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              className="absolute inset-0 h-full w-full bg-[#101010]/58 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 animate-slide-in-right shadow-[24px_0_70px_rgba(16,16,16,0.20)]">
              <Sidebar
                items={items}
                header={sidebarHeader}
                footer={sidebarFooter}
                mobileMode="drawer"
              />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#F5F5F3] text-[#101010]/55 transition-colors hover:text-[#101010]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
            <div className="mb-7 flex flex-col gap-4 border-b border-[#101010]/7 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.11em] text-[#101010]/38 lg:block">
                  Espace entreprise
                </p>
                <h1 className="nx-page-title">{title}</h1>
                {subtitle && <p className="nx-page-subtitle">{subtitle}</p>}
              </div>
              {actions && (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  {actions}
                </div>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
