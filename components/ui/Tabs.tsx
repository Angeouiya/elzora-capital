"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="nx-scroll-strip rounded-[16px] border border-[#101010]/7 bg-[#F5F5F3] p-1" role="tablist">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              role="tab"
              aria-selected={selected}
              className={`relative min-h-10 shrink-0 rounded-[12px] px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[background,color,box-shadow] duration-150 ${
                selected
                  ? "bg-[#101010] text-white shadow-[0_6px_16px_rgba(16,16,16,0.16)]"
                  : "text-[#101010]/52 hover:bg-white hover:text-[#101010]"
              }`}
            >
              {tab.label}
              {selected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#B6FF00]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      <div className="pt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
