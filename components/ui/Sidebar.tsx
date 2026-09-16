"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  mobileMode?: "rail" | "drawer";
}

export function Sidebar({
  items,
  header,
  footer,
  className = "",
  mobileMode = "rail",
}: SidebarProps) {
  const pathname = usePathname();
  const drawer = mobileMode === "drawer";

  return (
    <aside
      className={`flex shrink-0 flex-col bg-white border-[#101010]/8 shadow-[0_1px_0_rgba(16,16,16,0.02)] ${
        drawer
          ? "h-full w-[min(86vw,320px)] border-r lg:h-screen lg:w-[280px]"
          : "w-full border-b lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r"
      } ${className}`}
    >
      {header && (
        <div
          className={`border-[#101010]/7 ${
            drawer
              ? "border-b px-5 py-5"
              : "hidden border-b px-5 py-5 lg:block"
          }`}
        >
          {header}
        </div>
      )}

      <nav
        aria-label="Navigation latérale"
        className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          drawer
            ? "flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4"
            : "flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-y-auto lg:px-3 lg:py-4"
        }`}
      >
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[13px] px-3.5 py-2.5 text-sm font-semibold transition-[background,color,box-shadow,transform] duration-150 active:scale-[0.99] lg:gap-3 ${
                isActive
                  ? "bg-[#101010] text-white shadow-[0_8px_18px_rgba(16,16,16,0.14)]"
                  : "text-[#101010]/58 hover:bg-[#F5F5F3] hover:text-[#101010]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] transition-colors ${
                  isActive
                    ? "bg-[#B6FF00] text-[#101010]"
                    : "bg-[#F5F5F3] text-[#101010]/50 group-hover:bg-white group-hover:text-[#101010]"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[#B6FF00] lg:block" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {footer && (
        <div
          className={`border-t border-[#101010]/7 ${
            drawer ? "px-5 py-4" : "hidden px-5 py-4 lg:block"
          }`}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
