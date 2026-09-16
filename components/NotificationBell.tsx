"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

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
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#101010]/8 bg-white text-[#101010]/58 shadow-[0_2px_8px_rgba(16,16,16,0.04)] transition-[transform,color,background,border-color,box-shadow] hover:border-[#101010]/16 hover:bg-[#F5F5F3] hover:text-[#101010] hover:shadow-[0_8px_18px_rgba(16,16,16,0.07)] active:scale-[0.97] ${className}`}
      aria-label={`${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}`}
    >
      <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-[#C62828] px-1 text-[9px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
