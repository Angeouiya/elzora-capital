"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const helpId = selectId ? `${selectId}-help` : undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-semibold text-[#101010]/82">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={(error || hint) && helpId ? helpId : undefined}
            className={`nx-field h-[52px] sm:h-12 w-full appearance-none px-4 pr-11 text-base sm:text-sm disabled:cursor-not-allowed disabled:bg-[#F5F5F3] disabled:text-[#101010]/40 ${error ? "!border-[#C62828] focus:!shadow-[0_0_0_4px_rgba(198,40,40,0.10)]" : ""} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] bg-[#F5F5F3] text-[#101010]/50">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        {(error || hint) && (
          <p id={helpId} className={`text-xs leading-relaxed ${error ? "text-[#C62828]" : "text-[#101010]/48"}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
