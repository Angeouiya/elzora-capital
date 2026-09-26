"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAnalysis } from "@/components/admin/admin-analysis";
import { AdminOffers } from "@/components/admin/admin-offers";
import { AdminFinance } from "@/components/admin/admin-finance";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminCommissions } from "@/components/admin/admin-commissions";
import { AdminCompliance } from "@/components/admin/admin-compliance";

export function AdminPortal() {
  const view = useAppStore((state) => state.view);
  const adminEmail = useAppStore((state) => state.adminEmail);
  const restoreAdmin = useAppStore((state) => state.restoreAdmin);
  const [sessionPending, setSessionPending] = useState(() => !adminEmail);

  useEffect(() => {
    if (adminEmail) return;

    const controller = new AbortController();
    fetch("/api/admin/me", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          admin?: {
            email: string;
            firstName: string;
            lastName: string;
            role: string;
          } | null;
        }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setSessionPending(false);
        if (!payload?.admin) return;
        restoreAdmin(
          payload.admin.email,
          payload.admin.role,
          payload.admin.firstName,
          payload.admin.lastName
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) setSessionPending(false);
      });

    return () => controller.abort();
  }, [adminEmail, restoreAdmin]);

  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#130410] px-4 text-white">
        <div className="flex flex-col items-center text-center" role="status" aria-label="Vérification de la session sécurisée">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-[linear-gradient(135deg,#6F1F62,#250820)] text-lg font-black shadow-[0_16px_38px_rgba(0,0,0,.28)]">
            N
          </div>
          <p className="mt-4 text-sm font-semibold">Ouverture de l’espace sécurisé</p>
          <div className="mt-3 h-1 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#D79BCD]" />
          </div>
        </div>
      </div>
    );
  }

  if (!adminEmail || !view.startsWith("admin_") || view === "admin_login") {
    return <AdminLogin />;
  }

  return (
    <AdminShell>
      {view === "admin_dashboard" ? <AdminDashboard /> : null}
      {view === "admin_analysis" ? <AdminAnalysis /> : null}
      {view === "admin_compliance" ? <AdminCompliance /> : null}
      {view === "admin_offers" ? <AdminOffers /> : null}
      {view === "admin_finance" ? <AdminFinance /> : null}
      {view === "admin_users" ? <AdminUsers /> : null}
      {view === "admin_commissions" ? <AdminCommissions /> : null}
    </AdminShell>
  );
}
