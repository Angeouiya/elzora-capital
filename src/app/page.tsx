"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { BottomNav } from "@/components/site/bottom-nav";
import { Home } from "@/components/sections/home";
import { Explore } from "@/components/sections/explore";
import { OfferDetail } from "@/components/sections/offer-detail";
import { HowItWorks } from "@/components/sections/how";
import { Login } from "@/components/sections/login";
import { Register } from "@/components/sections/register";
import { InvestorDashboard } from "@/components/sections/investor-dashboard";
import { CompanyDashboard } from "@/components/sections/company-dashboard";
import { CompanySubmit } from "@/components/sections/company-submit";
import { Fees } from "@/components/sections/fees";
import { Risks } from "@/components/sections/risks";

export default function Page() {
  const view = useAppStore((s) => s.view);
  const userEmail = useAppStore((s) => s.userEmail);
  const hydratePreferences = useAppStore((s) => s.hydratePreferences);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  const publicView = view.startsWith("admin_") ? "home" : view;
  const showBottomNav = !!userEmail;

  return (
    <div className="app-shell flex min-h-screen flex-col bg-transparent">
      <Header />
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
