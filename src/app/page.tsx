"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Home } from "@/components/sections/home";

const dynamicView = <T extends object>(loader: () => Promise<T>, key: keyof T) =>
  dynamic(() => loader().then((module) => module[key] as React.ComponentType), {
    loading: ViewLoading,
  });

const Explore = dynamicView(() => import("@/components/sections/explore"), "Explore");
const OfferDetail = dynamicView(() => import("@/components/sections/offer-detail"), "OfferDetail");
const HowItWorks = dynamicView(() => import("@/components/sections/how"), "HowItWorks");
const Login = dynamicView(() => import("@/components/sections/login"), "Login");
const Register = dynamicView(() => import("@/components/sections/register"), "Register");
const InvestorDashboard = dynamicView(() => import("@/components/sections/investor-dashboard"), "InvestorDashboard");
const CompanyDashboard = dynamicView(() => import("@/components/sections/company-dashboard"), "CompanyDashboard");
const CompanySubmit = dynamicView(() => import("@/components/sections/company-submit"), "CompanySubmit");
const Fees = dynamicView(() => import("@/components/sections/fees"), "Fees");
const Risks = dynamicView(() => import("@/components/sections/risks"), "Risks");
const BottomNav = dynamicView(() => import("@/components/site/bottom-nav"), "BottomNav");

function ViewLoading() {
  return (
    <div className="page-shell" aria-label="Chargement" role="status">
      <div className="h-72 animate-pulse rounded-[1.75rem] bg-[#f0e6ed]" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

export default function Page() {
  const view = useAppStore((s) => s.view);
  const userEmail = useAppStore((s) => s.userEmail);
  const hydratePreferences = useAppStore((s) => s.hydratePreferences);
  const restoreUser = useAppStore((s) => s.restoreUser);
  const [sessionPending, setSessionPending] = useState(true);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ user?: { email?: string } | null }>;
      })
      .then((payload) => {
        const email = payload?.user?.email;
        if (email) restoreUser(email);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // The public portal remains usable if session restoration is temporarily unavailable.
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionPending(false);
      });

    return () => controller.abort();
  }, [restoreUser]);

  const publicView = view.startsWith("admin_") ? "home" : view;
  const showBottomNav = !!userEmail;

  return (
    <div className="app-shell flex min-h-screen flex-col bg-transparent">
      <Header sessionPending={sessionPending} />
      <main className={`flex-1 ${showBottomNav ? "pb-20 lg:pb-0" : ""}`}>
        {publicView === "home" && <Home />}
        {publicView === "explore" && <Explore />}
        {publicView === "offer" && <OfferDetail />}
        {publicView === "how" && <HowItWorks />}
        {publicView === "login" && <Login />}
        {publicView === "register" && <Register />}
        {publicView === "investor_dashboard" && <InvestorDashboard />}
        {publicView === "company_dashboard" && <CompanyDashboard />}
        {publicView === "company_submit" && <CompanySubmit />}
        {publicView === "fees" && <Fees />}
        {publicView === "risks" && <Risks />}
      </main>
      <Footer />
      {showBottomNav && <BottomNav />}
    </div>
  );
}
