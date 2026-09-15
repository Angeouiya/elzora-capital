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
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#101010]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 px-4 rounded-lg border bg-white text-sm text-[#101010] placeholder:text-[#101010]/40 outline-none transition-all focus:ring-2 focus:ring-[#B6FF00]/40 focus:border-[#B6FF00] ${error ? "border-[#C62828] focus:ring-[#C62828]/30 focus:border-[#C62828]" : "border-[#101010]/10"} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[#C62828]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#101010]/50">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
