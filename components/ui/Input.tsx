"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const helpId = inputId ? `${inputId}-help` : undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-[#101010]/82">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={(error || hint) && helpId ? helpId : undefined}
          className={`nx-field h-[52px] sm:h-12 px-4 text-base sm:text-sm placeholder:text-[#101010]/36 disabled:cursor-not-allowed disabled:bg-[#F5F5F3] disabled:text-[#101010]/40 ${error ? "!border-[#C62828] focus:!shadow-[0_0_0_4px_rgba(198,40,40,0.10)]" : ""} ${className}`}
          {...props}
        />
        {(error || hint) && (
          <p id={helpId} className={`text-xs leading-relaxed ${error ? "text-[#C62828]" : "text-[#101010]/48"}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
