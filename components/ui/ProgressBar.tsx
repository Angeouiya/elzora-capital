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
  const height = size === "sm" ? "h-2" : "h-3";

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
      <div className={`w-full ${height} bg-[#101010]/8 ring-1 ring-inset ring-[#101010]/5 rounded-full overflow-hidden`}>
        <div
          className={`${height} bg-gradient-to-r from-[#9BD900] to-[#B6FF00] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
