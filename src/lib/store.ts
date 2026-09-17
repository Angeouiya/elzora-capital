"use client";
import { create } from "zustand";

export type PortalView =
  // Portail principal — publique
  | "home"
  | "explore"
  | "projects"
  | "offer"
  | "project"
  | "how"
  | "fees"
  | "risks"
  | "register"
  | "login"
  | "dashboard"
  // Espace investisseur
  | "investor_dashboard"
  | "investor_investments"
  | "investor_payments"
  | "investor_documents"
  // Espace entreprise
  | "company_dashboard"
  | "company_projects"
  | "company_submit"
  | "company_financing"
  | "company_repayments"
  // Portail admin (séparé)
  | "admin_login"
  | "admin_dashboard"
  | "admin_offers"
  | "admin_analysis"
  | "admin_finance"
  | "admin_users"
  | "admin_commissions";

export type AuthContext = "guest" | "individual" | "company" | "admin";

interface AppState {
  view: PortalView;
  selectedOfferId: string | null;
  selectedProjectId: string | null;
  authContext: AuthContext;
  // Session mock (en production : NextAuth + DB)
  userEmail: string | null;
  adminEmail: string | null;
  adminRole: string | null;
  adminFirstName: string | null;
  adminLastName: string | null;
  selectedCompanyId: string | null;

  setView: (v: PortalView) => void;
  openOffer: (offerId: string) => void;
  openProject: (projectId: string) => void;
  setAuthContext: (c: AuthContext) => void;
  login: (email: string) => void;
  loginAdmin: (
    email: string,
    role?: string,
    firstName?: string,
    lastName?: string
  ) => void;
  logout: () => void;
  logoutAdmin: () => void;
  setCompany: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "home",
  selectedOfferId: null,
  selectedProjectId: null,
  authContext: "guest",
  userEmail: null,
  adminEmail: null,
  adminRole: null,
  adminFirstName: null,
  adminLastName: null,
  selectedCompanyId: null,

  setView: (view) => {
    const normalizedView =
      view === "projects"
        ? "explore"
        : view === "dashboard"
          ? "investor_dashboard"
          : view;
    set({ view: normalizedView });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  openOffer: (offerId) => {
    set({ view: "offer", selectedOfferId: offerId });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  openProject: (projectId) => {
    set({ view: "explore", selectedProjectId: projectId });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  setAuthContext: (c) => set({ authContext: c }),
  login: (email) =>
    set({ userEmail: email, authContext: "individual", view: "investor_dashboard" }),
  loginAdmin: (email, role, firstName, lastName) =>
    set({
      adminEmail: email,
      adminRole: role || null,
      adminFirstName: firstName || null,
      adminLastName: lastName || null,
      view: "admin_dashboard",
    }),
  logout: () =>
    set({ userEmail: null, authContext: "guest", view: "home", selectedCompanyId: null }),
  logoutAdmin: () =>
    set({
      adminEmail: null,
      adminRole: null,
      adminFirstName: null,
      adminLastName: null,
      view: "home",
    }),
  setCompany: (id) => set({ selectedCompanyId: id, authContext: id ? "company" : "individual" }),
}));
