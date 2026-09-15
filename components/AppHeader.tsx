import Link from "next/link";
import { NexoraLogo } from "./NexoraLogo";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  variant?: "light" | "dark";
}

export function AppHeader({ title, subtitle, showBack = false, variant = "light" }: AppHeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl border-b border-surface-container/40">
      <div className="h-16 px-space-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          {showBack && (
            <button
              aria-label="Retour"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low"
              onClick={() => window.history.back()}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <Link href="/" className="flex items-center gap-2.5 group">
            <NexoraLogo size={32} className="transition-transform duration-200 group-hover:scale-105" />
            <div className="flex flex-col">
              {subtitle && (
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary leading-none">
                  {subtitle}
                </span>
              )}
              <span className="font-headline-sm text-headline-sm font-semibold text-on-surface leading-tight truncate max-w-[160px]">
                {title}
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-space-xs">
          <Link
            href="/"
            className="min-h-[44px] px-space-sm flex items-center justify-center font-label-sm text-label-sm text-on-surface font-medium hover:text-primary transition-colors"
          >
            Accueil
          </Link>
          <div className="w-9 h-9 rounded-full bg-on-surface flex items-center justify-center shrink-0 shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-surface text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
