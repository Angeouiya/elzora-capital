"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  /** Actif uniquement sur la route exacte (utile pour les routes parents comme /entreprise) */
  exact?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ items, header, footer, className = "" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-screen bg-white border-r border-[#101010]/5 w-64 ${className}`}
    >
      {header && (
        <div className="px-5 py-6 border-b border-[#101010]/5">{header}</div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#EFFBDD] text-[#101010]"
                  : "text-[#101010]/60 hover:bg-[#F5F5F3] hover:text-[#101010]"
              }`}
            >
              <span className={isActive ? "text-[#B6FF00]" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {footer && (
        <div className="px-5 py-4 border-t border-[#101010]/5">{footer}</div>
      )}
    </aside>
  );
}
