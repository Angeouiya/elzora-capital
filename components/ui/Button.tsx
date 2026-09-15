"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#B6FF00] text-[#101010] font-semibold shadow-[0_2px_12px_rgba(182,255,0,0.35)] hover:shadow-[0_4px_20px_rgba(182,255,0,0.45)] hover:brightness-105 active:brightness-95",
  secondary:
    "bg-white text-[#101010] font-medium ring-1 ring-[#101010]/12 shadow-[0_1px_3px_rgba(16,16,16,0.05)] hover:ring-[#101010]/25 hover:bg-[#EFFBDD]/60 active:bg-[#EFFBDD]",
  ghost: "bg-transparent text-[#101010] hover:bg-[#101010]/5 active:bg-[#101010]/10",
  destructive:
    "bg-[#C62828] text-white font-medium shadow-[0_2px_12px_rgba(198,40,40,0.3)] hover:shadow-[0_4px_18px_rgba(198,40,40,0.4)] hover:brightness-110 active:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101010] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
