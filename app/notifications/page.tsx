"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

interface Notification {
  id: number;
  type: "payment" | "alert" | "info" | "success" | "warning";
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

const initialNotifications: Notification[] = [
  { id: 1, type: "payment", title: "Coupon reçu — Atelier Nova", message: "Versement de 666 FCFA crédité sur votre compte Nexora.", time: "Il y a 2h", read: false, icon: "payments" },
  { id: 2, type: "success", title: "Investissement confirmé", message: "Votre souscription de 50 000 FCFA au projet Atelier Nova a été validée.", time: "Hier, 14:30", read: false, icon: "check_circle" },
  { id: 3, type: "alert", title: "Nouvelle offre disponible", message: "SOLIS OUEST — Mini-centrale solaire, rendement 8,5% sur 12 mois.", time: "Hier, 09:00", read: true, icon: "campaign" },
  { id: 4, type: "info", title: "Document KYC approuvé", message: "Votre justificatif de revenus a été validé par notre équipe conformité.", time: "12 Sept. 2024", read: true, icon: "verified" },
  { id: 5, type: "warning", title: "Échéance approaching", message: "Prochain coupon Agro-Alliance prévu le 15 Octobre 2024.", time: "10 Sept. 2024", read: true, icon: "event_upcoming" },
  { id: 6, type: "info", title: "Mise à jour conditions", message: "Les nouvelles conditions générales d'utilisation sont disponibles.", time: "5 Sept. 2024", read: true, icon: "description" },
];

const typeColors: Record<string, { bg: string; text: string }> = {
  payment: { bg: "bg-primary-container", text: "text-on-surface" },
  success: { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
  alert: { bg: "bg-surface-container", text: "text-on-surface" },
  info: { bg: "bg-surface-container-low", text: "text-secondary" },
  warning: { bg: "bg-error-container/40", text: "text-error" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: number) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: !n.read } : n));

  return (
    <>
      <AppHeader title="Notifications" subtitle="NEXORA CAPITAL" showBack />

      <main className="flex-1 w-full bg-surface pt-16 pb-24 min-h-screen">
        <div className="flex flex-col w-full px-space-md py-space-md space-y-space-md">

          {/* Filter Bar */}
          <div className="flex items-center justify-between animate-fade-in-up">
            <div className="flex gap-2">
              <button onClick={() => setFilter("all")} className={`px-4 h-9 rounded-full font-label-sm text-label-sm transition-all ${filter === "all" ? "bg-on-surface text-surface-container-lowest font-semibold" : "bg-surface-container-lowest text-secondary hover:text-on-surface"}`}>
                Toutes ({notifications.length})
              </button>
              <button onClick={() => setFilter("unread")} className={`px-4 h-9 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${filter === "unread" ? "bg-on-surface text-surface-container-lowest font-semibold" : "bg-surface-container-lowest text-secondary hover:text-on-surface"}`}>
                Non lues
                {unreadCount > 0 && <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${filter === "unread" ? "bg-primary-container text-on-surface" : "bg-primary-container text-on-surface"}`}>{unreadCount}</span>}
              </button>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="font-label-sm text-label-sm text-primary font-semibold hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="space-y-2">
            {filtered.map((n, i) => {
              const colors = typeColors[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  className={`w-full text-left bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-start gap-3 transition-all hover-lift animate-fade-in-up ${!n.read ? "card-hover-glow" : "opacity-80"}`}
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-[20px] ${colors.text}`}>{n.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-body-sm text-body-sm text-on-surface truncate ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-container shrink-0"></span>}
                    </div>
                    <p className="font-body-sm text-body-sm text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="font-data-mono text-label-sm text-secondary mt-1 block">{n.time}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
              <span className="material-symbols-outlined text-[48px] text-surface-container-high mb-3">notifications_off</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Aucune notification</span>
              <span className="font-body-sm text-body-sm text-secondary mt-1">Vous êtes à jour !</span>
            </div>
          )}
        </div>
      </main>

      <BottomNav active="portefeuille" />
    </>
  );
}
