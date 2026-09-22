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
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAnalysis } from "@/components/admin/admin-analysis";
import { AdminOffers } from "@/components/admin/admin-offers";
import { AdminFinance } from "@/components/admin/admin-finance";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminCommissions } from "@/components/admin/admin-commissions";

export default function Page() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const userEmail = useAppStore((s) => s.userEmail);

  // Raccourci clavier Ctrl+Shift+A → portail admin
  // (le portail admin est intentionnellement non lié depuis le portail public — spec 02)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setView("admin_login");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setView]);

  // Portail administrateur — application distincte (pas de Header/Footer public)
  if (view === "admin_login") return <AdminLogin />;

  if (view?.startsWith("admin_")) {
    return (
      <AdminShell>
        {view === "admin_dashboard" && <AdminDashboard />}
        {view === "admin_analysis" && <AdminAnalysis />}
        {view === "admin_offers" && <AdminOffers />}
        {view === "admin_finance" && <AdminFinance />}
        {view === "admin_users" && <AdminUsers />}
        {view === "admin_commissions" && <AdminCommissions />}
      </AdminShell>
    );
  }

  // Portail principal public
  const showBottomNav = !!userEmail && !view?.startsWith("admin_");

  return (
    <div className="app-shell flex min-h-screen flex-col bg-transparent">
      <Header />
      <main className={`flex-1 ${showBottomNav ? "pb-20 lg:pb-0" : ""}`}>
        {view === "home" && <Home />}
        {view === "explore" && <Explore />}
        {view === "offer" && <OfferDetail />}
        {view === "how" && <HowItWorks />}
        {view === "login" && <Login />}
        {view === "register" && <Register />}
        {view === "investor_dashboard" && <InvestorDashboard />}
        {view === "company_dashboard" && <CompanyDashboard />}
        {view === "company_submit" && <CompanySubmit />}
        {/* Vues non couvertes par cette tâche — placeholders */}
        {view === "fees" && (
          <div className="p-8 text-sm text-muted-foreground">Chargement…</div>
        )}
        {view === "risks" && (
          <div className="p-8 text-sm text-muted-foreground">Chargement…</div>
        )}
      </main>
      <Footer />
      {showBottomNav && <BottomNav />}
    </div>
  );
}
