"use client";
import { useAppStore, type PortalView } from "@/lib/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutGrid,
  Search,
  Wallet,
  UserRound,
  LogOut,
  Building2,
  BriefcaseBusiness,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: PortalView;
}

export function BottomNav() {
  const { view, setView, userEmail, logout, locale } = useAppStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const labels = locale === "fr"
    ? { home: "Accueil", explore: "Explorer", wallet: "Portefeuille", company: "Entreprise", account: "Compte", signOut: "Déconnexion", signingOut: "Déconnexion…", myWallet: "Mon portefeuille", myCompany: "Ma société" }
    : { home: "Home", explore: "Explore", wallet: "Portfolio", company: "Company", account: "Account", signOut: "Sign out", signingOut: "Signing out…", myWallet: "My portfolio", myCompany: "My company" };
  const items: NavItem[] = [
    { icon: LayoutGrid, label: labels.home, view: "home" },
    { icon: Search, label: labels.explore, view: "explore" },
    { icon: Wallet, label: labels.wallet, view: "investor_dashboard" },
    { icon: BriefcaseBusiness, label: labels.company, view: "company_dashboard" },
    { icon: UserRound, label: labels.account, view: "company_dashboard" },
  ];

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[.\-_]/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("") || "??"
    : "??";

  const handleItemClick = (item: NavItem) => {
    if (item.view === "company_dashboard" && item.icon === UserRound) {
      setAccountOpen(true);
      return;
    }
    setView(item.view);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors
    } finally {
      logout();
      setSigningOut(false);
      setAccountOpen(false);
      toast({
        title: "Déconnecté",
        description: "Vous avez été déconnecté de votre espace.",
      });
      setView("home");
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#541249]/10 bg-white/92 shadow-[0_-10px_35px_rgba(56,12,49,.08)] backdrop-blur-2xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale mobile"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.view && item.icon !== UserRound;
            return (
              <li key={item.label} className="flex-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`flex h-[3.85rem] w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? "bg-[linear-gradient(135deg,#6f1f62,#250820)] text-white shadow-[0_7px_16px_rgba(56,12,49,.22)]"
                        : "bg-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={isActive ? "text-foreground" : ""}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account sheet (mobile) */}
      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <SheetHeader className="items-center text-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-nexora-black text-lg font-bold text-nexora-lime">
                {initials}
              </AvatarFallback>
            </Avatar>
            <SheetTitle className="text-base">
              {userEmail?.split("@")[0] ?? "Compte"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {userEmail}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => {
                setView("investor_dashboard");
                setAccountOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left text-sm font-medium hover:bg-secondary/60"
            >
              <Wallet className="h-4 w-4" />
              {labels.myWallet}
            </button>
            <button
              onClick={() => {
                setView("company_dashboard");
                setAccountOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left text-sm font-medium hover:bg-secondary/60"
            >
              <Building2 className="h-4 w-4" />
              {labels.myCompany}
            </button>
            <button
              onClick={() => {
                setView("home");
                setAccountOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left text-sm font-medium hover:bg-secondary/60"
            >
              <LayoutGrid className="h-4 w-4" />
              {labels.home}
            </button>
          </div>

          <SheetFooter className="mt-4">
            <Button
              onClick={handleLogout}
              disabled={signingOut}
              variant="outline"
              className="w-full text-nexora-danger"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? labels.signingOut : labels.signOut}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
