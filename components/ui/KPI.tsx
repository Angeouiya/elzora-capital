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
  up: { icon: TrendingUp, classes: "text-[#166534]" },
  down: { icon: TrendingDown, classes: "text-[#C62828]" },
  neutral: { icon: Minus, classes: "text-[#101010]/40" },
};

export function KPI({ value, label, trend, trendValue, icon, className = "" }: KPIProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null;

  return (
    <div className={`bg-white rounded-xl border border-[#101010]/5 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[#101010]/60">{label}</span>
          <span className="text-2xl font-bold text-[#101010]">{value}</span>
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-[#EFFBDD]">{icon}</div>
        )}
      </div>
      {trend && TrendIcon && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendConfig[trend].classes}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
}
