import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "accent" | "success" | "danger" | "warning" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-[#101010]/8 bg-[#F5F5F3] text-[#101010]/66",
  accent: "border-[#B6FF00]/45 bg-[#EFFBDD] text-[#101010]",
  success: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]",
  danger: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]",
  warning: "border-amber-600/15 bg-amber-50 text-amber-700",
  info: "border-blue-600/15 bg-blue-50 text-blue-700",
};

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.015em] ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
