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
  Bell,
  UserRound,
  LogOut,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: PortalView;
}

const ITEMS: NavItem[] = [
  { icon: LayoutGrid, label: "Accueil", view: "home" },
  { icon: Search, label: "Explorer", view: "explore" },
  { icon: Wallet, label: "Portefeuille", view: "investor_dashboard" },
  { icon: Bell, label: "Activité", view: "investor_dashboard" },
  { icon: UserRound, label: "Compte", view: "company_dashboard" },
];

export function BottomNav() {
  const { view, setView, userEmail, logout } = useAppStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[.\-_]/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("") || "??"
    : "??";

  const handleItemClick = (item: NavItem) => {
    if (item.label === "Compte") {
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale mobile"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              view === item.view ||
              (item.view === "investor_dashboard" &&
                view === "investor_dashboard" &&
                item.label !== "Activité") ||
              (item.label === "Activité" && view === "investor_dashboard");
            return (
              <li key={item.label} className="flex-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
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
                        ? "bg-nexora-lime text-nexora-black"
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
              Mon portefeuille
            </button>
            <button
              onClick={() => {
                setView("company_dashboard");
                setAccountOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left text-sm font-medium hover:bg-secondary/60"
            >
              <Building2 className="h-4 w-4" />
              Ma société
            </button>
            <button
              onClick={() => {
                setView("home");
                setAccountOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left text-sm font-medium hover:bg-secondary/60"
            >
              <LayoutGrid className="h-4 w-4" />
              Accueil
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
              {signingOut ? "Déconnexion…" : "Déconnexion"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
