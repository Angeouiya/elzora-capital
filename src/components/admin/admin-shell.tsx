"use client";
import { useEffect, useState } from "react";
import { useAppStore, type PortalView } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutGrid,
  Users,
  FileSearch,
  BriefcaseBusiness,
  Wallet,
  Coins,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ShieldCheck,
  Eye,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Matrice rôle → modules autorisés
// ---------------------------------------------------------------------------
// Rôles définis dans le schéma (AdminUser.role) :
//   superadmin, compliance, analyst, legal, technical, finance, validator,
//   support, auditor, sales
// Mapping des modules par rôle (cf. cahier des charges) :
//   analyst    → { Pilotage, Analyse }
//   compliance → { Pilotage, Analyse, Utilisateurs }
//   finance    → { Pilotage, Finances, Commissions }
//   validator  → { Pilotage, Offres, Finances }
//   legal      → { Pilotage, Offres, Finances }
//   support    → { Pilotage, Utilisateurs }
//   auditor    → { Pilotage, Utilisateurs, Commissions } (lecture seule)
//   superadmin → tous
// ---------------------------------------------------------------------------
const ROLE_MODULES: Record<string, PortalView[] | "all"> = {
  analyst: ["admin_dashboard", "admin_analysis"],
  compliance: ["admin_dashboard", "admin_analysis", "admin_users"],
  finance: ["admin_dashboard", "admin_finance", "admin_commissions"],
  validator: ["admin_dashboard", "admin_offers", "admin_finance"],
  legal: ["admin_dashboard", "admin_offers", "admin_finance"],
  support: ["admin_dashboard", "admin_users"],
  auditor: ["admin_dashboard", "admin_users", "admin_commissions"],
  superadmin: "all",
};

const READ_ONLY_ROLES = new Set(["auditor"]);

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super-admin",
  compliance: "Conformité",
  analyst: "Analyste",
  legal: "Juriste",
  technical: "Technique",
  finance: "Finance",
  validator: "Validateur",
  support: "Support",
  auditor: "Auditeur",
  sales: "Commercial",
};

interface NavItem {
  label: string;
  view: PortalView;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { label: "Pilotage", view: "admin_dashboard", icon: LayoutGrid },
  { label: "Utilisateurs", view: "admin_users", icon: Users },
  { label: "Analyse", view: "admin_analysis", icon: FileSearch },
  { label: "Offres", view: "admin_offers", icon: BriefcaseBusiness },
  { label: "Finances", view: "admin_finance", icon: Wallet },
  { label: "Commissions", view: "admin_commissions", icon: Coins },
];

const VIEW_LABELS: Partial<Record<PortalView, string>> = {
  admin_dashboard: "Pilotage",
  admin_users: "Utilisateurs",
  admin_analysis: "Analyse",
  admin_offers: "Offres",
  admin_finance: "Finances",
  admin_commissions: "Commissions",
};

interface DisbursementRow {
  id: string;
  preparedBy: string | null;
  approvedBy: string | null;
  status: string;
  project?: { company?: { legalName?: string } };
}

interface DisbursementsResponse {
  disbursements?: DisbursementRow[];
  error?: string;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const adminEmail = useAppStore((s) => s.adminEmail);
  const adminRole = useAppStore((s) => s.adminRole);
  const adminFirstName = useAppStore((s) => s.adminFirstName);
  const adminLastName = useAppStore((s) => s.adminLastName);
  const logoutAdmin = useAppStore((s) => s.logoutAdmin);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  // Détection d'un éventuel conflit Préparateur / Approbateur sur un même
  // décaissement (séparation des devoirs — audit warning).
  const [conflictDetected, setConflictDetected] = useState(false);

  useEffect(() => {
    if (!adminEmail) return;
    let active = true;
    fetch("/api/admin/disbursements")
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as DisbursementsResponse;
      })
      .then((d) => {
        if (!active || !d?.disbursements) return;
        const conflict = d.disbursements.some(
          (x) =>
            x.preparedBy &&
            x.approvedBy &&
            x.preparedBy === x.approvedBy
        );
        setConflictDetected(conflict);
      })
      .catch(() => {
        // silent — l'endpoint peut renvoyer 403 selon le rôle
      });
    return () => {
      active = false;
    };
  }, [adminEmail]);

  // Guard: pas d'admin connecté → redirection login
  if (!adminEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexora-black p-6 text-white">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-nexora-lime" />
          <p className="text-sm">Session administrateur requise.</p>
          <Button
            onClick={() => setView("admin_login")}
            className="btn-nexora mt-4"
            size="sm"
          >
            Accéder à l&rsquo;authentification
          </Button>
        </div>
      </div>
    );
  }

  const role = adminRole || "analyst";
  const allowedModules = ROLE_MODULES[role] || ["admin_dashboard"];
  const canSeeAll = allowedModules === "all";
  const isReadOnly = READ_ONLY_ROLES.has(role);

  const visibleNav = NAV.filter((item) =>
    canSeeAll ? true : (allowedModules as PortalView[]).includes(item.view)
  );

  const adminName =
    [adminFirstName, adminLastName].filter(Boolean).join(" ") ||
    adminEmail.split("@")[0];
  const initials =
    adminName
      .split(/[.\s\-_]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "AD";

  const breadcrumb = VIEW_LABELS[view] || "Pilotage";

  const SidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-nexora-lime text-sm font-black text-nexora-black">
          N
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-white">NEXORA</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              data-control="nav"
              key={item.view}
              onClick={() => {
                setView(item.view);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-nexora-lime text-nexora-black"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        {!canSeeAll && (
          <p className="px-3 pt-3 text-[10px] uppercase tracking-widest text-white/30">
            Accès limité à votre rôle
          </p>
        )}
      </nav>

      {/* Bottom: admin identity + role badge + logout */}
      <div className="border-t border-white/10 p-3">
        <div className="rounded-md bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nexora-lime text-xs font-bold text-nexora-black">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-white">
                {adminName}
              </p>
              <p className="truncate text-[10px] text-white/50">{adminEmail}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge className="border-0 bg-nexora-lime text-[10px] text-nexora-black">
              {ROLE_LABELS[role] || role}
            </Badge>
            {isReadOnly && (
              <Badge className="border-0 bg-white/10 text-[10px] text-white/80">
                <Eye className="mr-1 h-3 w-3" />
                Lecture seule
              </Badge>
            )}
          </div>
        </div>

        {/* Indicateur Préparateur / Approbateur (séparation des devoirs) */}
        {conflictDetected ? (
          <div className="mt-2 flex items-start gap-2 rounded-md border-l-4 border-nexora bg-[#FFF5F5] p-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nexora-danger" />
            <p className="text-[10px] leading-snug text-nexora-danger">
              Conflit détecté : un décaissement a été préparé ET approuvé par
              le même admin. La séparation des devoirs doit être strictement
              appliquée.
            </p>
          </div>
        ) : (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-white/5 p-2.5">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-nexora-lime" />
            <p className="text-[10px] leading-snug text-white/70">
              Séparation des devoirs OK — aucun conflit Préparateur / Approbateur
              détecté sur les décaissements en cours.
            </p>
          </div>
        )}

        <Button
          onClick={() => {
            void fetch("/api/admin/logout", { method: "POST" });
            logoutAdmin();
            setView("home");
          }}
          variant="ghost"
          className="mt-2 w-full justify-start text-white/70 hover:bg-white/5 hover:text-white"
          size="sm"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-[#130410]">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col bg-nexora-black lg:flex">
          {SidebarContent}
        </aside>

        {/* Mobile sidebar (drawer) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation d&rsquo;administration"
              className="absolute left-0 top-0 flex h-full w-[min(19rem,88vw)] flex-col bg-nexora-black shadow-2xl"
            >
              <button
                data-control="icon"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
              {SidebarContent}
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-nexora-black px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Hamburger mobile */}
              <button
                data-control="icon"
                onClick={() => setMobileOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm font-bold text-white sm:inline">
                  NEXORA Admin
                </span>
                <span className="text-white/30">/</span>
                <span className="text-sm text-white/70">{breadcrumb}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-md border border-nexora-lime/30 bg-nexora-lime/10 px-2.5 py-1.5 sm:flex">
                <ShieldAlert className="h-3.5 w-3.5 text-nexora-lime" />
                <span className="text-[11px] font-medium text-nexora-lime">
                  Toutes les actions sont tracées
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nexora-lime text-xs font-bold text-nexora-black">
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-[#F7F8F4]">
            <div className="min-h-full">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
