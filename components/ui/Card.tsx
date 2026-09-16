import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "white" | "soft" | "pale" | "dark";
}

const paddingClasses = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const toneClasses = {
  white: "bg-white text-[#101010] border-[#101010]/8",
  soft: "bg-[#F5F5F3] text-[#101010] border-[#101010]/7",
  pale: "bg-[#EFFBDD] text-[#101010] border-[#B6FF00]/25",
  dark: "bg-[#101010] text-white border-[#101010]",
};

export function Card({
  children,
  hover = false,
  padding = "md",
  tone = "white",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] sm:rounded-[20px] border shadow-[0_1px_2px_rgba(16,16,16,0.03),0_12px_34px_rgba(16,16,16,0.055)] ${toneClasses[tone]} ${paddingClasses[padding]} ${hover ? "nx-card-interactive cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-[17px] sm:text-lg font-semibold tracking-[-0.015em] leading-snug text-inherit ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-1.5 text-sm leading-relaxed text-[#101010]/58 ${className}`}>{children}</p>;
}
