"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Landmark,
  LoaderCircle,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; label: string }
> = {
  INSCRIPTION: {
    icon: UserCheck,
    color: "bg-blue-50 text-blue-700",
    label: "Inscription",
  },
  VERIFICATION: {
    icon: ShieldCheck,
    color: "bg-amber-50 text-amber-700",
    label: "Vérification",
  },
  DOCUMENT: {
    icon: FileCheck,
    color: "bg-amber-50 text-amber-700",
    label: "Document",
  },
  DECISION: {
    icon: CircleAlert,
    color: "bg-purple-50 text-purple-700",
    label: "Décision",
  },
  PUBLICATION: {
    icon: TrendingUp,
    color: "bg-[#EFFBDD] text-[#166534]",
    label: "Publication",
  },
  SUBSCRIPTION: {
    icon: Wallet,
    color: "bg-[#EFFBDD] text-[#166534]",
    label: "Souscription",
  },
  PAYMENT: {
    icon: CreditCard,
    color: "bg-[#EFFBDD] text-[#166534]",
    label: "Paiement",
  },
  CLOSURE: {
    icon: XCircle,
    color: "bg-[#C62828]/10 text-[#C62828]",
    label: "Clôture",
  },
  DISBURSEMENT: {
    icon: Landmark,
    color: "bg-blue-50 text-blue-700",
    label: "Décaissement",
  },
  REPORT: {
    icon: FileText,
    color: "bg-[#F5F5F3] text-[#101010]/60",
    label: "Rapport",
  },
  DUE_DATE: {
    icon: Clock,
    color: "bg-amber-50 text-amber-700",
    label: "Échéance",
  },
  DISTRIBUTION: {
    icon: Wallet,
    color: "bg-[#EFFBDD] text-[#166534]",
    label: "Versement",
  },
  INCIDENT: {
    icon: CircleAlert,
    color: "bg-[#C62828]/10 text-[#C62828]",
    label: "Incident",
  },
};

const defaultType = {
  icon: Bell,
  color: "bg-[#F5F5F3] text-[#101010]/60",
  label: "Notification",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Impossible de charger les notifications.");
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* silent */
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      /* silent */
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#101010]/5">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0">
              <NexoraLogo size={32} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-[#101010]">Notifications</h1>
              <p className="text-xs text-[#101010]/50">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tout est à jour"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              loading={markingAll}
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={markAllRead}
            >
              Tout marquer lu
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Où en suis-je ? */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-[#101010] text-white"
                : "bg-white text-[#101010]/60 hover:text-[#101010]"
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-[#101010] text-white"
                : "bg-white text-[#101010]/60 hover:text-[#101010]"
            }`}
          >
            Non lues
            {unreadCount > 0 && (
              <span
                className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  filter === "unread"
                    ? "bg-[#B6FF00] text-[#101010]"
                    : "bg-[#C62828] text-white"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[#101010]/40">
            <LoaderCircle className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card className="border-[#C62828]/20 bg-[#C62828]/5">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-[#C62828]" />
              <p className="text-sm text-[#C62828]">{error}</p>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F5F5F3] flex items-center justify-center">
              <BellOff className="h-7 w-7 text-[#101010]/30" />
            </div>
            <h2 className="text-lg font-bold text-[#101010] mt-4">
              Aucune notification
            </h2>
            <p className="text-sm text-[#101010]/60 mt-2">
              {filter === "unread"
                ? "Vous êtes à jour ! Toutes vos notifications ont été lues."
                : "Aucune notification pour le moment. Vous serez notifié des événements importants."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const cfg = typeConfig[n.type] ?? defaultType;
              const Icon = cfg.icon;

              return (
                <button
                  key={n.id}
                  onClick={() => !n.read && markOneRead(n.id)}
                  className={`w-full text-left rounded-xl p-4 flex items-start gap-3 transition-all ${
                    !n.read
                      ? "bg-white shadow-sm hover:shadow-md"
                      : "bg-white/60 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${cfg.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${
                          !n.read
                            ? "font-bold text-[#101010]"
                            : "font-medium text-[#101010]"
                        }`}
                      >
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#B6FF00] shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[#101010]/60 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="default">{cfg.label}</Badge>
                      <span className="text-[11px] text-[#101010]/40 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Que se passera-t-il ensuite ? */}
        <Card>
          <p className="text-sm text-[#101010]/60">
            Vous recevez des notifications pour chaque événement important :
            inscription, vérification KYC, décision sur vos dossiers, publication
            d&apos;offres, paiements, décaissements et échéances. Cliquez sur une
            notification pour la marquer comme lue.
          </p>
        </Card>
      </main>
    </div>
  );
}
