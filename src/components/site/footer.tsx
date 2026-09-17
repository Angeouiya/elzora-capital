"use client";
import { useAppStore } from "@/lib/store";
import { ShieldCheck } from "lucide-react";

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
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-nexora-black text-base font-black text-nexora-lime">
                N
              </span>
              <span className="text-lg font-black tracking-tight text-foreground">
                NEXORA
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Plateforme de financement participatif — Afrique de l&rsquo;Ouest
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Produit
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PRODUCT.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setView(item.view)}
                    className="text-left transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Légal
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {LEGAL.map((item) => (
                <li key={item}>
                  <span className="cursor-default transition-colors hover:text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Dakar · Sénégal</li>
              <li>
                <a
                  href="mailto:contact@nexora.capital"
                  className="transition-colors hover:text-foreground"
                >
                  contact@nexora.capital
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Demo notice */}
        <div className="mt-8 flex items-start gap-2 rounded-md border border-border/60 bg-background/60 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mode démonstration — aucune opération financière réelle n&rsquo;est
            traitée sur cette plateforme. La mise en production nécessite un
            prestataire de paiement habilité et les validations réglementaires
            applicables (BCEAO / CRC).
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© 2025 NEXORA Capital</p>
          <p className="rounded-full bg-background px-3 py-1 font-medium">
            Mode démonstration — aucune opération financière réelle
          </p>
        </div>
      </div>
    </footer>
  );
}
