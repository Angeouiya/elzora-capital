"use client";
import Image from "next/image";
import { useAppStore, type DisplayCurrency, type Locale } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Menu, X, Wallet, BriefcaseBusiness, LogOut, ChevronDown, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const COPY = {
  fr: {
    nav: [
      { label: "Explorer", view: "explore" as const },
      { label: "Financer mon entreprise", view: "register" as const },
      { label: "Fonctionnement", view: "how" as const },
    ],
    appNav: [
      { label: "Vue d’ensemble", view: "home" as const },
      { label: "Opportunités", view: "explore" as const },
      { label: "Portefeuille", view: "investor_dashboard" as const },
      { label: "Entreprise", view: "company_dashboard" as const },
    ],
    login: "Connexion",
    register: "Créer un compte",
    wallet: "Mon portefeuille",
    company: "Ma société",
    logout: "Déconnexion",
    signingOut: "Déconnexion…",
    preferences: "Langue et devise",
    language: "Langue",
    currency: "Devise d’affichage",
    subtitle: "Capital privé",
    signedOut: "Déconnecté",
    signedOutText: "Vous avez été déconnecté de votre espace.",
    closeMenu: "Fermer le menu",
    mobileNavigation: "Navigation mobile",
  },
  en: {
    nav: [
      { label: "Explore", view: "explore" as const },
      { label: "Finance my business", view: "register" as const },
      { label: "How it works", view: "how" as const },
    ],
    appNav: [
      { label: "Overview", view: "home" as const },
      { label: "Opportunities", view: "explore" as const },
      { label: "Portfolio", view: "investor_dashboard" as const },
      { label: "Company", view: "company_dashboard" as const },
    ],
    login: "Sign in",
    register: "Create account",
    wallet: "My portfolio",
    company: "My company",
    logout: "Sign out",
    signingOut: "Signing out…",
    preferences: "Language and currency",
    language: "Language",
    currency: "Display currency",
    subtitle: "Private capital",
    signedOut: "Signed out",
    signedOutText: "You have been signed out of your workspace.",
    closeMenu: "Close menu",
    mobileNavigation: "Mobile navigation",
  },
};

export function Header({ sessionPending = false }: { sessionPending?: boolean }) {
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
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const copy = COPY[locale];
  const currencyLabel = displayCurrency === "XOF" ? "F CFA" : displayCurrency;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "fr"
      ? "NEXORA Capital — Capital privé en Afrique de l’Ouest"
      : "NEXORA Capital — Private capital in West Africa";
  }, [locale]);

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[.\-_]/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("") || "??"
    : "";

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout — local state is cleared anyway
    } finally {
      logout();
      setSigningOut(false);
      toast({
        title: copy.signedOut,
        description: copy.signedOutText,
      });
      setView("home");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
    <header
      className={`sticky top-0 z-50 w-full border-b border-[#541249]/[.08] bg-[#fffefd]/92 shadow-[0_1px_0_rgba(255,255,255,.9),0_12px_35px_rgba(56,12,49,.045)] backdrop-blur-2xl ${userEmail ? "lg:hidden" : ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className={`mx-auto flex max-w-[82rem] items-center justify-between px-4 sm:px-6 lg:px-8 ${userEmail ? "h-16 lg:h-[4.5rem]" : "h-[4.5rem]"}`}>
        {/* Logo */}
        <button
          data-control="brand"
          onClick={() => setView("home")}
          className="group flex items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/logo.svg" alt="" width={38} height={38} loading="eager" className="h-9.5 w-9.5 drop-shadow-[0_8px_18px_rgba(56,12,49,.22)]" />
          <span className="leading-none">
            <span className="block text-[1.05rem] font-black tracking-[-.035em] text-foreground">NEXORA</span>
            <span className="mt-1 block text-[.56rem] font-bold uppercase tracking-[.19em] text-[#6C195E]">{copy.subtitle}</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav
          className="hidden min-h-12 items-stretch gap-1 rounded-[1.35rem] border border-[#541249]/[.09] bg-[#f1eff1] p-1 shadow-[inset_0_1px_2px_rgba(19,4,16,.06),0_1px_0_rgba(255,255,255,.9)] lg:flex"
          aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"}
        >
          {(userEmail ? copy.appNav : copy.nav).map((item) => (
            <button
              data-control="nav"
              key={item.view}
              onClick={() => setView(userEmail && item.view === "register" ? "company_dashboard" : item.view)}
              aria-current={view === (userEmail && item.view === "register" ? "company_dashboard" : item.view) ? "page" : undefined}
              className={`relative min-h-10 rounded-[1rem] border px-4 py-2 text-[.8125rem] font-bold tracking-[-.012em] transition-all ${
                view === (userEmail && item.view === "register" ? "company_dashboard" : item.view)
                  ? "border-[#541249]/10 bg-white text-[#541249] shadow-[0_8px_20px_rgba(19,4,16,.11),inset_0_1px_0_rgba(255,255,255,.96)]"
                  : "border-transparent text-[#60615e] hover:border-white/70 hover:bg-white/65 hover:text-[#541249] hover:shadow-[0_5px_14px_rgba(56,12,49,.06)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-control="preference"
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-[1.05rem] border border-[#541249]/14 bg-white/92 px-3 text-xs font-extrabold tracking-[.015em] text-[#541249] shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_6px_16px_rgba(56,12,49,.07)] hover:-translate-y-0.5 hover:border-[#541249]/28 hover:bg-[#FCF8FB] hover:shadow-[0_10px_24px_rgba(56,12,49,.12)]"
                aria-label={copy.preferences}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-[.65rem] bg-[#f4eaf2] text-[#541249]">
                  <Languages className="h-3.5 w-3.5" />
                </span>
                <span>{locale.toUpperCase()} · {currencyLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#541249]/55" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-[1.5rem] p-3">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                {copy.language}
              </DropdownMenuLabel>
              <SegmentedControl
                value={locale}
                onValueChange={setLocale}
                ariaLabel={copy.language}
                options={[
                  { value: "fr" as Locale, label: "Français" },
                  { value: "en" as Locale, label: "English" },
                ]}
              />
              <DropdownMenuLabel className="mt-2 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                {copy.currency}
              </DropdownMenuLabel>
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
              {displayCurrency !== "XOF" ? (
                <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-muted-foreground">
                  {locale === "fr" ? "Conversion indicative. Les paiements restent effectués en francs CFA." : "Indicative conversion. Payments remain in CFA francs."}
                </p>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {sessionPending ? (
            <div
              className="h-10 w-[7.25rem] animate-pulse rounded-xl border border-[#541249]/8 bg-[#F7EAF5]/70"
              aria-label={locale === "fr" ? "Vérification de la session" : "Checking session"}
              role="status"
            />
          ) : userEmail ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-control="account" className="hidden h-10 items-center gap-2 rounded-xl border border-[#541249]/12 bg-white/88 pl-1.5 pr-3 text-sm font-semibold shadow-[0_4px_14px_rgba(56,12,49,.06)] hover:-translate-y-0.5 hover:border-[#541249]/25 hover:bg-[#FAF4F9] lg:flex">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-nexora-black text-xs font-bold text-nexora-lime">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-foreground sm:inline">
                    {userEmail.split("@")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setView("investor_dashboard")}
                  className="cursor-pointer"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {copy.wallet}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setView("company_dashboard")}
                  className="cursor-pointer"
                >
                  <BriefcaseBusiness className="mr-2 h-4 w-4" />
                  {copy.company}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="cursor-pointer text-nexora-danger"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? copy.signingOut : copy.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("login")}
                className="hidden h-10 rounded-[1.05rem] border-[#541249]/12 bg-white/80 px-4 text-[#33262f] shadow-[inset_0_1px_0_rgba(255,255,255,.94),0_5px_15px_rgba(56,12,49,.055)] hover:border-[#541249]/28 hover:bg-[#FCF8FB] hover:text-[#541249] sm:inline-flex"
              >
                {copy.login}
              </Button>
              <Button
                size="sm"
                onClick={() => setView("register")}
                className="btn-nexora hidden h-10 rounded-[1.05rem] px-[1.1rem] shadow-[inset_0_1px_0_rgba(255,255,255,.24),inset_0_-1px_0_rgba(19,4,16,.28),0_9px_24px_rgba(56,12,49,.25)] sm:inline-flex"
              >
                {copy.register}
              </Button>
            </>
          )}

          {/* Mobile hamburger (only when not logged in — otherwise bottom-nav takes over) */}
          {!userEmail && !sessionPending && (
            <SheetTrigger asChild>
              <button
                data-control="icon"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[1.05rem] border border-[#541249]/12 bg-white/92 text-[#541249] shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_6px_16px_rgba(56,12,49,.07)] hover:-translate-y-0.5 hover:border-[#541249]/25 hover:bg-[#F7EAF5] hover:shadow-[0_10px_22px_rgba(56,12,49,.11)] lg:hidden"
                aria-label="Menu"
                aria-expanded={open}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </SheetTrigger>
          )}
        </div>
      </div>

    </header>

      {!userEmail && !sessionPending ? (
        <SheetContent
          side="bottom"
          className="rounded-t-[1.6rem] border-[#541249]/10 bg-[#fffefd] px-4 pb-5 pt-4 lg:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <SheetHeader className="px-0 pb-2 text-left">
            <SheetTitle className="text-lg font-black tracking-[-.025em]">{copy.mobileNavigation}</SheetTitle>
            <SheetDescription>
              {locale === "fr" ? "Choisissez votre prochaine étape." : "Choose your next step."}
            </SheetDescription>
          </SheetHeader>
          <nav aria-label={copy.mobileNavigation}>
          <div className="flex flex-col gap-1">
            {copy.nav.map((item) => (
              <button
                data-control="nav"
                key={item.view}
                onClick={() => {
                  setView(item.view);
                  setOpen(false);
                }}
                className={`rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-all ${
                  view === item.view
                    ? "border-[#541249]/15 bg-[#F7EAF5] text-[#541249] shadow-[0_5px_15px_rgba(56,12,49,.08)]"
                    : "border-transparent text-muted-foreground hover:border-[#541249]/10 hover:bg-[#FAF4F9] hover:text-[#541249]"
                }`}
              >
                {item.label}
              </button>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setView("login");
                setOpen(false);
              }}
              className="mt-2 h-12 w-full justify-center rounded-[1.1rem] sm:hidden"
            >
              {copy.login}
            </Button>
            <Button
              onClick={() => {
                setView("register");
                setOpen(false);
              }}
              className="mt-2 h-12 w-full rounded-[1.1rem] btn-nexora"
            >
              {copy.register}
            </Button>
          </div>
          </nav>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
