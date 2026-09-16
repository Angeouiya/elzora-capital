import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Trend = "up" | "down" | "neutral";

interface KPIProps {
  value: string | number;
  label: string;
  trend?: Trend;
  trendValue?: string;
  icon?: ReactNode;
  className?: string;
}

const trendConfig: Record<Trend, { icon: typeof TrendingUp; classes: string }> = {
  up: { icon: TrendingUp, classes: "text-[#166534] bg-[#166534]/8" },
  down: { icon: TrendingDown, classes: "text-[#C62828] bg-[#C62828]/8" },
  neutral: { icon: Minus, classes: "text-[#101010]/50 bg-[#101010]/5" },
};

export function KPI({ value, label, trend, trendValue, icon, className = "" }: KPIProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] sm:rounded-[20px] border border-[#101010]/8 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(16,16,16,0.03),0_12px_32px_rgba(16,16,16,0.05)] ${className}`}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-[#B6FF00]" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#101010]/45">
            {label}
          </p>
          <p className="nx-data mt-2 break-words text-[22px] sm:text-[26px] font-bold leading-tight tracking-[-0.035em] text-[#101010]">
            {value}
          </p>
        </div>
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#B6FF00]/35 bg-[#EFFBDD] text-[#101010]">
            {icon}
          </div>
        )}
      </div>
      {trend && TrendIcon && trendValue && (
        <div className={`mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${trendConfig[trend].classes}`}>
          <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{trendValue}</span>
        </div>
      )}
    </div>
  );
}
