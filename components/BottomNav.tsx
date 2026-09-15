import Link from "next/link";

interface BottomNavProps {
  active: "offres" | "investir" | "portefeuille" | "entreprise";
}

const navItems = [
  { href: "/offres", id: "offres" as const, icon: "grid_view", label: "Offres" },
  { href: "/projet", id: "investir" as const, icon: "trending_up", label: "Investir" },
  { href: "/portefeuille", id: "portefeuille" as const, icon: "account_balance_wallet", label: "Portefeuille" },
  { href: "/entreprise", id: "entreprise" as const, icon: "apartment", label: "Entreprise" },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-surface-container/60">
      <div className="flex justify-around items-center h-16 px-space-xs">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-space-xs transition-all duration-200 ${
                isActive
                  ? "text-on-surface font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
              {...(isActive ? { "aria-current": "page" } : {})}
            >
              <div className={`relative transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-container"></span>
                )}
              </div>
              <span className="font-label-sm text-label-sm tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
