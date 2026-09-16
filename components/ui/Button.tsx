"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "border-[#B6FF00] bg-[#B6FF00] text-[#101010] font-semibold shadow-[0_8px_22px_rgba(16,16,16,0.12)] hover:border-[#A8EC00] hover:bg-[#A8EC00] hover:shadow-[0_12px_28px_rgba(16,16,16,0.16)]",
  secondary:
    "border-[#101010]/12 bg-white text-[#101010] font-semibold shadow-[0_2px_8px_rgba(16,16,16,0.05)] hover:border-[#101010]/22 hover:bg-[#F5F5F3] hover:shadow-[0_8px_20px_rgba(16,16,16,0.08)]",
  ghost:
    "border-transparent bg-transparent text-[#101010]/68 font-semibold hover:bg-[#101010]/6 hover:text-[#101010]",
  destructive:
    "border-[#C62828] bg-[#C62828] text-white font-semibold shadow-[0_8px_20px_rgba(16,16,16,0.12)] hover:bg-[#B52222] hover:border-[#B52222] hover:shadow-[0_12px_26px_rgba(16,16,16,0.16)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-10 px-3.5 text-[13px] rounded-[12px] gap-1.5",
  md: "min-h-11 sm:min-h-12 px-5 text-sm rounded-[14px] gap-2",
  lg: "min-h-12 sm:min-h-[52px] px-6 sm:px-7 text-[15px] rounded-[15px] gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={`relative isolate inline-flex items-center justify-center overflow-hidden whitespace-nowrap border select-none transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B6FF00]/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <path
            className="opacity-80"
            fill="currentColor"
            d="M12 2a10 10 0 00-10 10h3.2A6.8 6.8 0 0112 5.2V2z"
          />
        </svg>
      ) : (
        icon
      )}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
