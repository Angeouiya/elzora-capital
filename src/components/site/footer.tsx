"use client";
import { useAppStore } from "@/lib/store";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

const PRODUCT = [
  { label: "Explorer", view: "explore" as const },
  { label: "Fonctionnement", view: "how" as const },
  { label: "Tarification", view: "fees" as const },
  { label: "Risques", view: "risks" as const },
];

const LEGAL = ["CGU", "Confidentialité", "Conformité BCEAO"];

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto bg-[linear-gradient(135deg,#250820_0%,#130410_58%,#090208_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-11">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[.65rem] bg-nexora-lime text-base font-black text-nexora-black">
                N
              </span>
              <span className="text-lg font-black tracking-tight text-white">
                NEXORA
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
              Le trait d&rsquo;union entre le capital privé et les entreprises qui transforment l&rsquo;Afrique de l&rsquo;Ouest.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/85">
              Produit
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              {PRODUCT.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setView(item.view)}
                    className="text-left transition-colors hover:text-white"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/85">
              Légal
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              {LEGAL.map((item) => (
                <li key={item}>
                  <span className="cursor-default transition-colors hover:text-white">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/85">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              <li>Dakar · Sénégal</li>
              <li>
                <a
                  href="mailto:contact@nexora.capital"
                  className="inline-flex items-center gap-1 transition-colors hover:text-white"
                >
                  contact@nexora.capital
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 NEXORA Capital. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-nexora-lime" />
            Investir comporte un risque de perte en capital.
          </p>
        </div>
      </div>
    </footer>
  );
}
