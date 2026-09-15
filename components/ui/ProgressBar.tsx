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
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-[#101010]/70">{label}</span>}
          {showValue && (
            <span className="font-medium text-[#101010]">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-[#F5F5F3] rounded-full overflow-hidden`}>
        <div
          className={`${height} bg-[#B6FF00] rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
