"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  buttonClassName,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel: string;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-12 w-full items-stretch gap-1 overflow-x-auto rounded-[1.55rem] border border-[#541249]/10 bg-[#f3f3f2] p-1 shadow-[inset_0_1px_2px_rgba(19,4,16,.055)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            data-control="segment"
            data-state={active ? "active" : "inactive"}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex min-h-10 min-w-max flex-1 items-center justify-center gap-2 rounded-[1.2rem] border px-3.5 py-2 text-sm font-semibold outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:ring-4 focus-visible:ring-[#7b286d]/16 disabled:pointer-events-none disabled:opacity-45",
              active
                ? "border-[#541249]/10 bg-white text-[#16151a] shadow-[0_9px_22px_rgba(19,4,16,.12),inset_0_1px_0_rgba(255,255,255,.95)]"
                : "border-transparent bg-transparent text-[#5f626a] hover:bg-white/55 hover:text-[#541249]",
              buttonClassName
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
