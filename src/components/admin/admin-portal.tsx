"use client";

import { useAppStore } from "@/lib/store";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAnalysis } from "@/components/admin/admin-analysis";
import { AdminOffers } from "@/components/admin/admin-offers";
import { AdminFinance } from "@/components/admin/admin-finance";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminCommissions } from "@/components/admin/admin-commissions";

export function AdminPortal() {
  const view = useAppStore((state) => state.view);

  if (!view.startsWith("admin_") || view === "admin_login") {
    return <AdminLogin />;
  }

  return (
    <AdminShell>
      {view === "admin_dashboard" ? <AdminDashboard /> : null}
      {view === "admin_analysis" ? <AdminAnalysis /> : null}
      {view === "admin_offers" ? <AdminOffers /> : null}
      {view === "admin_finance" ? <AdminFinance /> : null}
      {view === "admin_users" ? <AdminUsers /> : null}
      {view === "admin_commissions" ? <AdminCommissions /> : null}
    </AdminShell>
  );
}
