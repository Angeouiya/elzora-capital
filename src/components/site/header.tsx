"use client";
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
import { useState } from "react";
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
    <header
      className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-nexora-black text-base font-black text-nexora-lime">
            N
          </span>
          <span className="text-lg font-black tracking-tight text-foreground">
            NEXORA
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === item.view
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {item.label}
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
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav (guest only) */}
      {open && !userEmail && (
        <nav className="border-t border-border/60 bg-background px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <button
                key={item.view}
                onClick={() => {
                  setView(item.view);
                  setOpen(false);
                }}
                className={`rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
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
  );
}
