"use client";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
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
import { Menu, X, Wallet, Building2, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const NAV = [
  { label: "Explorer", view: "explore" as const },
  { label: "Financer mon entreprise", view: "register" as const },
  { label: "Fonctionnement", view: "how" as const },
];

export function Header() {
  const { view, setView, userEmail, logout } = useAppStore();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
        title: "Déconnecté",
        description: "Vous avez été déconnecté de votre espace.",
      });
      setView("home");
    }
  };

  return (
    <>
      {open && !userEmail && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/35 backdrop-blur-[2px] lg:hidden"
        />
      )}
    <header
      className="sticky top-0 z-50 w-full border-b border-black/[.06] bg-white/85 backdrop-blur-2xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => setView("home")}
          className="group flex items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/logo.svg" alt="" width={38} height={38} priority className="h-9.5 w-9.5 drop-shadow-[0_8px_18px_rgba(56,12,49,.22)]" />
          <span className="leading-none">
            <span className="block text-[1.05rem] font-black tracking-[-.035em] text-foreground">NEXORA</span>
            <span className="mt-1 block text-[.56rem] font-bold uppercase tracking-[.19em] text-[#6C195E]">Capital privé</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`relative rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                view === item.view
                  ? "bg-[#F7EAF5] text-[#541249]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {item.label}
              {view === item.view && <span className="absolute inset-x-3 -bottom-[.9rem] h-0.5 rounded-full bg-[#541249]" />}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {userEmail ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3 text-sm font-medium transition-colors hover:bg-secondary/60">
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
                  Mon portefeuille
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setView("company_dashboard")}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Ma société
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="cursor-pointer text-nexora-danger"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Déconnexion…" : "Déconnexion"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("login")}
                className="text-foreground hover:bg-secondary/60"
              >
                Connexion
              </Button>
              <Button
                size="sm"
                onClick={() => setView("register")}
                className="btn-nexora hidden sm:inline-flex"
              >
                Créer un compte
              </Button>
            </>
          )}

          {/* Mobile hamburger (only when not logged in — otherwise bottom-nav takes over) */}
          {!userEmail && (
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-secondary lg:hidden"
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
      {open && !userEmail && (
        <nav
          id="mobile-navigation"
          aria-label="Navigation mobile"
          className="absolute inset-x-0 top-full border-t border-border/70 bg-white px-4 py-4 shadow-[0_24px_50px_rgba(16,16,16,.14)] lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <button
                key={item.view}
                onClick={() => {
                  setView(item.view);
                  setOpen(false);
                }}
                className={`rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                  view === item.view
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
            <Button
              onClick={() => {
                setView("register");
                setOpen(false);
              }}
              className="mt-2 btn-nexora"
            >
              Créer un compte
            </Button>
          </div>
        </nav>
      )}
    </header>
    </>
  );
}
