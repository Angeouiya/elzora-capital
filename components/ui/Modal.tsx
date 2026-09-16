"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (open) window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Fermer la fenêtre"
        className="absolute inset-0 h-full w-full cursor-default bg-[#101010]/58 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Fenêtre"}
        className={`relative w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#101010]/8 bg-white shadow-[0_30px_90px_rgba(16,16,16,0.26)] sm:max-h-[min(88dvh,48rem)] sm:rounded-[24px] ${className}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#101010]/12 sm:hidden" aria-hidden="true" />
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-[#101010]/7 px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#101010]/40">Nexora Capital</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#101010]">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="nx-icon-button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="max-h-[calc(88dvh-72px)] overflow-y-auto p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
