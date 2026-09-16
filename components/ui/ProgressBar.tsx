interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  className = "",
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const height = size === "sm" ? "h-2" : "h-2.5";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          {label && <span className="min-w-0 truncate text-[#101010]/58">{label}</span>}
          {showValue && (
            <span className="nx-data shrink-0 font-semibold text-[#101010]">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${height} overflow-hidden rounded-full bg-[#101010]/8 ring-1 ring-inset ring-[#101010]/5`}>
        <div
          className={`${height} rounded-full bg-[#B6FF00] shadow-[inset_0_0_0_1px_rgba(16,16,16,0.06)] transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        />
      </div>
    </div>
  );
}
