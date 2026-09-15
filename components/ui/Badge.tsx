import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "accent" | "success" | "danger" | "warning" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#F5F5F3] text-[#101010]/70",
  accent: "bg-[#EFFBDD] text-[#101010] font-medium",
  success: "bg-[#166534]/10 text-[#166534]",
  danger: "bg-[#C62828]/10 text-[#C62828]",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
};

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
