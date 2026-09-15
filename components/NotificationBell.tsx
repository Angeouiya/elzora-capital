"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

interface NotifCount {
  unread: number;
}

/**
 * NotificationBell — compteur de notifications non lues.
 * Affiche un badge rouge si unread > 0.
 * Se place dans n'importe quel header/navigateur.
 */
export function NotificationBell({ className = "" }: { className?: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setUnread(data.filter((n: { read: boolean }) => !n.read).length);
        }
      } catch {
        /* silent */
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center justify-center ${className}`}
      aria-label={`${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C62828] text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
