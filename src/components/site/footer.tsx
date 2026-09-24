"use client";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import type { PortalView } from "@/lib/store";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

const COPY = {
  fr: {
    tagline: "Le trait d’union entre le capital privé et les entreprises qui transforment l’Afrique de l’Ouest.",
    product: "Produit",
    productItems: [["Explorer", "explore"], ["Fonctionnement", "how"], ["Tarification", "fees"], ["Risques", "risks"]] as const,
    legal: "Légal",
    legalItems: [["CGU", "/legal/terms"], ["Confidentialité", "/legal/privacy"], ["Cadre réglementaire", "/legal/compliance"]] as const,
    contact: "Contact",
    rights: "Tous droits réservés.",
    warning: "Investir comporte un risque de perte en capital.",
    location: "Dakar · Sénégal",
  },
  en: {
    tagline: "Connecting private capital with the businesses transforming West Africa.",
    product: "Product",
    productItems: [["Explore", "explore"], ["How it works", "how"], ["Pricing", "fees"], ["Risks", "risks"]] as const,
    legal: "Legal",
    legalItems: [["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Regulatory framework", "/legal/compliance"]] as const,
    contact: "Contact",
    rights: "All rights reserved.",
    warning: "Investing involves a risk of capital loss.",
    location: "Dakar · Senegal",
  },
};

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const locale = useAppStore((s) => s.locale);
  const copy = COPY[locale];
  const productItems: ReadonlyArray<readonly [string, PortalView]> = copy.productItems;
  const legalItems: ReadonlyArray<readonly [string, string]> = copy.legalItems;

  return (
    <footer className="mt-auto overflow-hidden bg-[linear-gradient(135deg,#250820_0%,#130410_58%,#090208_100%)] text-white">
      <div className="mx-auto max-w-[82rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-10 h-px w-full bg-[linear-gradient(90deg,#b57277,rgba(181,114,119,.08),transparent)]" />
        <div className="grid grid-cols-1 gap-9 md:grid-cols-[1.5fr_.75fr_.85fr_1fr]">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="" width={38} height={38} className="h-9.5 w-9.5" />
              <span className="text-lg font-black tracking-tight text-white">
                NEXORA
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
              {copy.tagline}
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#dca8c7]">
              {copy.product}
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              {productItems.map(([label, view]) => (
                <li key={view}>
                  <button
                    data-control="text"
                    onClick={() => setView(view)}
                    className="text-left transition-colors hover:text-white"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#dca8c7]">
              {copy.legal}
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              {legalItems.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="inline-flex items-center gap-1 transition-colors hover:text-white">
                    {label}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#dca8c7]">
              {copy.contact}
            </h4>
            <ul className="space-y-2 text-sm text-white/55">
              <li>{copy.location}</li>
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

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 NEXORA Capital. {copy.rights}</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-nexora-lime" />
            {copy.warning}
          </p>
        </div>
      </div>
    </footer>
  );
}
