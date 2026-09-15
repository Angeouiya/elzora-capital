import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-4 sm:p-6",
  lg: "p-5 sm:p-8",
};

export function Card({
  children,
  hover = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-[0_1px_2px_rgba(16,16,16,0.04),0_8px_32px_rgba(16,16,16,0.06)] ring-1 ring-[#101010]/6 ${paddingClasses[padding]} ${hover ? "hover:shadow-[0_2px_4px_rgba(16,16,16,0.06),0_16px_44px_rgba(16,16,16,0.1)] hover:ring-[#B6FF00]/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base sm:text-lg font-semibold leading-snug text-[#101010] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm leading-relaxed text-[#101010]/60 mt-1 ${className}`}>{children}</p>;
}
