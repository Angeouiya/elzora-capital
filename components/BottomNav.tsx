import Link from "next/link";
import { Building2, LayoutGrid, TrendingUp, Wallet } from "lucide-react";

interface BottomNavProps {
  active: "offres" | "investir" | "portefeuille" | "entreprise";
}

const navItems = [
  { href: "/offres", id: "offres" as const, icon: LayoutGrid, label: "Offres" },
  { href: "/offres", id: "investir" as const, icon: TrendingUp, label: "Investir" },
  { href: "/dashboard", id: "portefeuille" as const, icon: Wallet, label: "Portefeuille" },
  { href: "/entreprise", id: "entreprise" as const, icon: Building2, label: "Entreprise" },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 pb-safe md:hidden" aria-label="Navigation principale mobile">
      <div className="mx-auto flex h-[68px] max-w-md items-center gap-1 rounded-[22px] border border-white/10 bg-[#101010] p-1.5 shadow-[0_22px_58px_rgba(16,16,16,0.30)]">
        {navItems.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 transition-[background,color,transform] duration-150 active:scale-[0.97] ${
                isActive
                  ? "bg-[#B6FF00] text-[#101010]"
                  : "text-white/55 hover:bg-white/7 hover:text-white"
              }`}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
              <span className="max-w-full truncate text-[10px] font-semibold leading-none tracking-[-0.01em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
