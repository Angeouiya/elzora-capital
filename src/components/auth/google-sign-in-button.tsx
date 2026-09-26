"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function GoogleSignInButton({ className = "" }: { className?: string }) {
  const locale = useAppStore((state) => state.locale);
  const label = locale === "fr" ? "Continuer avec Google" : "Continue with Google";

  return (
    <Button
      asChild
      type="button"
      variant="outline"
      className={`h-12 w-full rounded-xl border-[#541249]/15 bg-white font-semibold text-foreground shadow-[0_8px_22px_rgba(56,12,49,.05)] hover:border-[#541249]/30 hover:bg-[#fcf8fb] ${className}`}
    >
      <a href={`/api/auth/google/start?locale=${locale}`} aria-label={label}>
        <GoogleMark />
        {label}
      </a>
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem] shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.39a4.61 4.61 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.97-4.33 2.97-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.9A6.01 6.01 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.49l3.35-2.59Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z" />
    </svg>
  );
}
