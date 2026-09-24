"use client";
import Image from "next/image";
import { useAppStore, type DisplayCurrency, type Locale } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, Wallet, BriefcaseBusiness, LogOut, ChevronDown, Languages, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const COPY = {
  fr: {
    nav: [
      { label: "Explorer", view: "explore" as const },
      { label: "Financer mon entreprise", view: "register" as const },
      { label: "Fonctionnement", view: "how" as const },
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

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "fr"
      ? "NEXORA Capital — Capital privé en Afrique de l’Ouest"
      : "NEXORA Capital — Private capital in West Africa";
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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
    <>
      {open && !userEmail && !sessionPending && (
        <button
          data-control="overlay"
          type="button"
          aria-label={copy.closeMenu}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/35 backdrop-blur-[2px] xl:hidden"
        />
      )}
    <header
      className="sticky top-0 z-50 w-full border-b border-[#541249]/[.07] bg-[#fffefd]/88 backdrop-blur-2xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[82rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          data-control="brand"
          onClick={() => setView("home")}
          className="group flex items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/logo.svg" alt="" width={38} height={38} priority className="h-9.5 w-9.5 drop-shadow-[0_8px_18px_rgba(56,12,49,.22)]" />
          <span className="leading-none">
            <span className="block text-[1.05rem] font-black tracking-[-.035em] text-foreground">NEXORA</span>
            <span className="mt-1 block text-[.56rem] font-bold uppercase tracking-[.19em] text-[#6C195E]">{copy.subtitle}</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 xl:flex">
          {copy.nav.map((item) => (
            <button
              data-control="nav"
              key={item.view}
              onClick={() => setView(userEmail && item.view === "register" ? "company_dashboard" : item.view)}
              className={`relative rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                view === (userEmail && item.view === "register" ? "company_dashboard" : item.view)
                  ? "bg-[#f4ebf2] text-[#541249]"
                  : "text-muted-foreground hover:bg-[#faf4f9] hover:text-[#541249]"
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
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#541249]/14 bg-white/85 px-3 text-[11px] font-extrabold tracking-wide text-[#541249] shadow-[0_4px_14px_rgba(56,12,49,.06)] hover:-translate-y-0.5 hover:border-[#541249]/28 hover:bg-[#FAF4F9] hover:shadow-[0_8px_18px_rgba(56,12,49,.10)]"
                aria-label={copy.preferences}
              >
                <Languages className="h-3.5 w-3.5" />
                <span>{locale.toUpperCase()} · {displayCurrency}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                {copy.language}
              </DropdownMenuLabel>
              {(["fr", "en"] as Locale[]).map((item) => (
                <DropdownMenuItem key={item} onClick={() => setLocale(item)} className="cursor-pointer rounded-xl">
                  <span className="flex-1">{item === "fr" ? "Français" : "English"}</span>
                  {locale === item ? <Check className="h-4 w-4 text-[#541249]" /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                {copy.currency}
              </DropdownMenuLabel>
              {(["XOF", "EUR"] as DisplayCurrency[]).map((item) => (
                <DropdownMenuItem key={item} onClick={() => setDisplayCurrency(item)} className="cursor-pointer rounded-xl">
                  <span className="flex-1">{item === "XOF" ? "Franc CFA · XOF" : "Euro · EUR"}</span>
                  {displayCurrency === item ? <Check className="h-4 w-4 text-[#541249]" /> : null}
                </DropdownMenuItem>
              ))}
              {displayCurrency === "EUR" ? (
                <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-muted-foreground">
                  {locale === "fr" ? "Conversion d’affichage. Les opérations restent réglées en XOF." : "Display conversion. Transactions remain settled in XOF."}
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
                <button data-control="account" className="flex h-10 items-center gap-2 rounded-xl border border-[#541249]/12 bg-white/88 pl-1.5 pr-3 text-sm font-semibold shadow-[0_4px_14px_rgba(56,12,49,.06)] hover:-translate-y-0.5 hover:border-[#541249]/25 hover:bg-[#FAF4F9]">
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
                variant="ghost"
                size="sm"
                onClick={() => setView("login")}
                className="hidden text-foreground hover:bg-secondary/60 sm:inline-flex"
              >
                {copy.login}
              </Button>
              <Button
                size="sm"
                onClick={() => setView("register")}
                className="btn-nexora hidden sm:inline-flex"
              >
                {copy.register}
              </Button>
            </>
          )}

          {/* Mobile hamburger (only when not logged in — otherwise bottom-nav takes over) */}
          {!userEmail && !sessionPending && (
            <button
              data-control="icon"
              onClick={() => setOpen(!open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#541249]/10 bg-white/80 text-[#541249] shadow-[0_4px_14px_rgba(56,12,49,.06)] hover:bg-[#F7EAF5] xl:hidden"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav (guest only) */}
      {open && !userEmail && !sessionPending && (
        <nav
          id="mobile-navigation"
          aria-label={copy.mobileNavigation}
          className="absolute inset-x-0 top-full border-t border-border/70 bg-white px-4 py-4 shadow-[0_24px_50px_rgba(16,16,16,.14)] xl:hidden"
        >
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
              variant="ghost"
              onClick={() => {
                setView("login");
                setOpen(false);
              }}
              className="mt-2 justify-start sm:hidden"
            >
              {copy.login}
            </Button>
            <Button
              onClick={() => {
                setView("register");
                setOpen(false);
              }}
              className="mt-2 btn-nexora"
            >
              {copy.register}
            </Button>
          </div>
        </nav>
      )}
    </header>
    </>
  );
}
