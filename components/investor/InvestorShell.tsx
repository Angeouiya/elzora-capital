"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  TrendingUp,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutGrid, exact: true },
  { href: "/offres", label: "Explorer", icon: Search },
  { href: "/dashboard/investissements", label: "Investissements", icon: TrendingUp },
  { href: "/dashboard/paiements", label: "Paiements", icon: CreditCard },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/retrait", label: "Retrait", icon: Wallet },
];

interface InvestorShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function InvestorShell({ title, subtitle, actions, children }: InvestorShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <header className="sticky top-0 z-40 border-b border-[#101010]/7 bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-10">
          <Link href="/dashboard" className="group flex min-w-0 items-center gap-2.5">
            <NexoraLogo size={32} className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]" />
            <div className="hidden leading-tight sm:block">
              <p className="text-[15px] font-bold tracking-[-0.02em] text-[#101010]">Nexora Capital</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#101010]/36">Investisseur</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-[16px] border border-[#101010]/7 bg-[#F5F5F3] p-1 lg:flex" aria-label="Espace investisseur">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-semibold transition-[background,color,box-shadow] ${
                    active
                      ? "bg-[#101010] text-white shadow-[0_6px_16px_rgba(16,16,16,0.14)]"
                      : "text-[#101010]/54 hover:bg-white hover:text-[#101010]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[#B6FF00]" : ""}`} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/notifications" aria-label="Notifications" className="nx-icon-button !h-10 !w-10 sm:!h-11 sm:!w-11">
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/profil"
              className="hidden h-11 items-center gap-2 rounded-[14px] border border-[#101010]/8 bg-[#101010] px-2.5 pr-3 text-white shadow-[0_8px_20px_rgba(16,16,16,0.14)] sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#B6FF00] text-[#101010]">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">Mon compte</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="nx-icon-button !h-10 !w-10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-[#101010]/58 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col bg-white shadow-[-24px_0_70px_rgba(16,16,16,0.20)]">
            <div className="flex h-16 items-center justify-between border-b border-[#101010]/7 px-4">
              <div className="flex items-center gap-2.5">
                <NexoraLogo size={30} />
                <div>
                  <p className="text-sm font-bold text-[#101010]">Nexora Capital</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#101010]/38">Investisseur</p>
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="nx-icon-button !h-9 !w-9" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3" aria-label="Navigation mobile investisseur">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-[14px] px-3.5 text-sm font-semibold transition-colors ${
                      active ? "bg-[#101010] text-white" : "text-[#101010]/60 hover:bg-[#F5F5F3] hover:text-[#101010]"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${active ? "bg-[#B6FF00] text-[#101010]" : "bg-[#F5F5F3] text-[#101010]/50"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#101010]/7 p-4">
              <Link
                href="/connexion"
                className="flex h-11 items-center justify-center gap-2 rounded-[13px] bg-[#F5F5F3] text-sm font-semibold text-[#101010]/60"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Link>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mb-7 flex flex-col gap-4 border-b border-[#101010]/7 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#101010]/38">Espace investisseur</p>
            <h1 className="nx-page-title">{title}</h1>
            {subtitle && <p className="nx-page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
