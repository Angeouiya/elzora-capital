"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BriefcaseBusiness,
  Compass,
  FilePlus2,
  Languages,
  LayoutDashboard,
  LogOut,
  CircleUserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAppStore, type DisplayCurrency, type Locale, type PortalView } from "@/lib/store";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COPY = {
  fr: {
    subtitle: "Capital privé",
    space: "Mon espace",
    overview: "Vue d’ensemble",
    opportunities: "Opportunités",
    portfolio: "Portefeuille",
    company: "Entreprise",
    submit: "Présenter un projet",
    account: "Mon compte",
    preferences: "Langue et devise",
    language: "Langue",
    currency: "Devise d’affichage",
    currencyNote: "Conversion indicative. Les paiements restent effectués en francs CFA.",
    signOut: "Déconnexion",
    signingOut: "Déconnexion…",
    signedOut: "Déconnecté",
    signedOutText: "Vous avez été déconnecté de votre espace.",
  },
  en: {
    subtitle: "Private capital",
    space: "My workspace",
    overview: "Overview",
    opportunities: "Opportunities",
    portfolio: "Portfolio",
    company: "Company",
    submit: "Present a project",
    account: "My account",
    preferences: "Language and currency",
    language: "Language",
    currency: "Display currency",
    currencyNote: "Indicative conversion. Payments remain in CFA francs.",
    signOut: "Sign out",
    signingOut: "Signing out…",
    signedOut: "Signed out",
    signedOutText: "You have been signed out of your workspace.",
  },
} as const;

interface SidebarItem {
  label: string;
  view: PortalView;
  icon: React.ComponentType<{ className?: string }>;
  activeViews?: PortalView[];
}

export function DesktopAppSidebar() {
  const {
    view,
    setView,
    userEmail,
    logout,
    locale,
    displayCurrency,
    setLocale,
    setDisplayCurrency,
  } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const copy = COPY[locale];
  const currencyLabel = displayCurrency === "XOF" ? "F CFA" : displayCurrency;

  if (!userEmail) return null;

  const items: SidebarItem[] = [
    { label: copy.overview, view: "home", icon: LayoutDashboard },
    { label: copy.opportunities, view: "explore", icon: Compass, activeViews: ["explore", "offer"] },
    { label: copy.portfolio, view: "investor_dashboard", icon: WalletCards, activeViews: ["investor_dashboard", "investor_payments"] },
    { label: copy.company, view: "company_dashboard", icon: BriefcaseBusiness, activeViews: ["company_dashboard", "company_submit"] },
    { label: copy.account, view: "account", icon: CircleUserRound },
  ];

  const initials = userEmail
    .split("@")[0]
    .split(/[.\-_]/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "??";

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The local session is cleared even when the network is unavailable.
    } finally {
      logout();
      setSigningOut(false);
      toast({ title: copy.signedOut, description: copy.signedOutText });
      setView("home");
    }
  };

  return (
    <aside className="desktop-app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col lg:flex">
      <div className="px-5 pb-5 pt-6">
        <button
          type="button"
          data-control="brand"
          onClick={() => setView("home")}
          className="flex items-center gap-3 text-left"
        >
          <Image src="/logo.svg" alt="" width={42} height={42} loading="eager" className="h-10 w-10" />
          <span className="leading-none">
            <span className="block text-[1rem] font-bold tracking-[-.025em] text-white">NEXORA</span>
            <span className="mt-1 block text-[.54rem] font-semibold uppercase tracking-[.18em] text-[#e4b4d9]">
              {copy.subtitle}
            </span>
          </span>
        </button>
      </div>

      <div className="mx-4 border-t border-white/10 pt-5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-white/42">{copy.space}</p>
        <nav className="mt-2 space-y-1" aria-label={copy.space}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.activeViews?.includes(view) ?? view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                data-control="nav"
                aria-current={active ? "page" : undefined}
                onClick={() => setView(item.view)}
                className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-white text-[#380c31] shadow-[0_10px_26px_rgba(10,2,9,.2)]"
                    : "text-white/66 hover:bg-white/[.07] hover:text-white"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-[#f4e7f1] text-[#541249]" : "bg-white/[.06] text-white/70"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-4 mt-5">
        <button
          type="button"
          onClick={() => setView("company_submit")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[.09] px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1)] hover:bg-white/[.14]"
        >
          <FilePlus2 className="h-4 w-4 text-[#e4b4d9]" />
          {copy.submit}
        </button>
      </div>

      <div className="mt-auto p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] px-3 py-2.5 text-left text-xs text-white/76 hover:bg-white/[.09] hover:text-white"
              aria-label={copy.preferences}
            >
              <Languages className="h-4 w-4 text-[#e4b4d9]" />
              <span className="flex-1">{locale.toUpperCase()} · {currencyLabel}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-72 rounded-[1.5rem] p-3">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">{copy.language}</DropdownMenuLabel>
            <SegmentedControl
              value={locale}
              onValueChange={setLocale}
              ariaLabel={copy.language}
              options={[
                { value: "fr" as Locale, label: "Français" },
                { value: "en" as Locale, label: "English" },
              ]}
            />
            <DropdownMenuLabel className="mt-2 text-[10px] uppercase tracking-[.14em] text-muted-foreground">{copy.currency}</DropdownMenuLabel>
            <SegmentedControl
              value={displayCurrency}
              onValueChange={setDisplayCurrency}
              ariaLabel={copy.currency}
              options={[
                { value: "XOF" as DisplayCurrency, label: "F CFA" },
                { value: "USD" as DisplayCurrency, label: "USD" },
                { value: "EUR" as DisplayCurrency, label: "Euro" },
              ]}
            />
            {displayCurrency !== "XOF" ? <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-muted-foreground">{copy.currencyNote}</p> : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-[#541249]">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-white">{userEmail.split("@")[0]}</span>
            <span className="mt-0.5 block truncate text-[10px] text-white/42">{userEmail}</span>
          </span>
          <button
            type="button"
            data-control="icon"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex h-9 w-9 items-center justify-center text-white/55 hover:bg-white/[.08] hover:text-white"
            aria-label={signingOut ? copy.signingOut : copy.signOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
