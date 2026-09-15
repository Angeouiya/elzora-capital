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
      className={`flex flex-col w-full shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#101010]/5 lg:w-64 lg:h-screen ${className}`}
    >
      {header && (
        <div className="px-4 sm:px-5 py-4 lg:py-6 border-b border-[#101010]/5">{header}</div>
      )}

      <nav aria-label="Navigation latérale" className="flex lg:flex-1 lg:flex-col overflow-x-auto lg:overflow-y-auto px-3 py-3 lg:py-4 gap-1 lg:space-y-1 [scrollbar-width:none]">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 flex items-center gap-2 lg:gap-3 min-h-11 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
        <div className="hidden lg:block px-5 py-4 border-t border-[#101010]/5">{footer}</div>
      )}
    </aside>
  );
}
