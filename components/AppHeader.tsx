"use client";

import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { NexoraLogo } from "./NexoraLogo";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  variant?: "light" | "dark";
}

export function AppHeader({ title, subtitle, showBack = false, variant = "light" }: AppHeaderProps) {
  const dark = variant === "dark";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-safe backdrop-blur-xl ${
        dark
          ? "border-b border-white/10 bg-[#101010]/94 text-white"
          : "border-b border-[#101010]/7 bg-white/94 text-[#101010]"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          {showBack && (
            <button
              type="button"
              aria-label="Retour"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border transition-[background,color,border-color,transform] active:scale-[0.97] ${
                dark
                  ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-[#101010]/8 bg-white text-[#101010]/60 hover:bg-[#F5F5F3] hover:text-[#101010]"
              }`}
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          )}
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <NexoraLogo size={32} className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]" />
            <div className="min-w-0 leading-tight">
              {subtitle && (
                <span className={`block truncate text-[10px] font-semibold uppercase tracking-[0.1em] ${dark ? "text-white/40" : "text-[#101010]/38"}`}>
                  {subtitle}
                </span>
              )}
              <span className="block max-w-[180px] truncate text-[15px] font-bold tracking-[-0.02em] sm:max-w-[260px] sm:text-base">
                {title}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className={`hidden min-h-10 items-center justify-center rounded-[12px] px-3.5 text-sm font-semibold transition-colors sm:flex ${
              dark ? "text-white/58 hover:bg-white/7 hover:text-white" : "text-[#101010]/55 hover:bg-[#F5F5F3] hover:text-[#101010]"
            }`}
          >
            Accueil
          </Link>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-[13px] border ${
              dark
                ? "border-[#B6FF00]/30 bg-[#B6FF00] text-[#101010]"
                : "border-[#101010] bg-[#101010] text-[#B6FF00]"
            }`}
          >
            <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
