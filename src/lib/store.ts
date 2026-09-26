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
  | "google_complete"
  | "dashboard"
  | "account"
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
  | "admin_compliance"
  | "admin_finance"
  | "admin_users"
  | "admin_commissions";

export type AuthContext = "guest" | "individual" | "company" | "admin";
export type Locale = "fr" | "en";
export type DisplayCurrency = "XOF" | "USD" | "EUR";

interface AppState {
  view: PortalView;
  selectedOfferId: string | null;
  selectedProjectId: string | null;
  authContext: AuthContext;
  locale: Locale;
  displayCurrency: DisplayCurrency;
  exploreSector: string | null;
  // État d'affichage de la session authentifiée côté client.
  userEmail: string | null;
  adminEmail: string | null;
  adminRole: string | null;
  adminFirstName: string | null;
  adminLastName: string | null;
  selectedCompanyId: string | null;

  setView: (v: PortalView) => void;
  openExploreSector: (sector: string) => void;
  openOffer: (offerId: string) => void;
  openProject: (projectId: string) => void;
  setAuthContext: (c: AuthContext) => void;
  setLocale: (locale: Locale) => void;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  hydratePreferences: () => void;
  restoreUser: (email: string) => void;
  login: (email: string) => void;
  loginAdmin: (
    email: string,
    role?: string,
    firstName?: string,
    lastName?: string
  ) => void;
  restoreAdmin: (
    email: string,
    role: string,
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
  locale: "fr",
  displayCurrency: "XOF",
  exploreSector: null,
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
    set({ view: normalizedView, ...(normalizedView === "explore" ? { exploreSector: null } : {}) });
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
  setLocale: (locale) => {
    set({ locale });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nexora-locale", locale);
      document.documentElement.lang = locale;
    }
  },
  openExploreSector: (sector) => {
    set({ view: "explore", exploreSector: sector });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  setDisplayCurrency: (displayCurrency) => {
    set({ displayCurrency });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nexora-currency", displayCurrency);
    }
  },
  hydratePreferences: () => {
    if (typeof window === "undefined") return;
    const savedLocale = window.localStorage.getItem("nexora-locale");
    const savedCurrency = window.localStorage.getItem("nexora-currency");
    const locale: Locale = savedLocale === "en" ? "en" : "fr";
    const displayCurrency: DisplayCurrency =
      savedCurrency === "EUR" || savedCurrency === "USD" ? savedCurrency : "XOF";
    document.documentElement.lang = locale;
    set({ locale, displayCurrency });
  },
  restoreUser: (email) =>
    set({ userEmail: email, authContext: "individual" }),
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
  restoreAdmin: (email, role, firstName, lastName) =>
    set((state) => ({
      adminEmail: email,
      adminRole: role,
      adminFirstName: firstName || null,
      adminLastName: lastName || null,
      view:
        state.view.startsWith("admin_") && state.view !== "admin_login"
          ? state.view
          : "admin_dashboard",
    })),
  logout: () =>
    set({ userEmail: null, authContext: "guest", view: "home", selectedCompanyId: null }),
  logoutAdmin: () =>
    set({
      adminEmail: null,
      adminRole: null,
      adminFirstName: null,
      adminLastName: null,
      view: "admin_login",
    }),
  setCompany: (id) => set({ selectedCompanyId: id, authContext: id ? "company" : "individual" }),
}));
