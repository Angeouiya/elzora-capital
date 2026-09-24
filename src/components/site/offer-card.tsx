"use client";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { fmtPct } from "@/lib/finance";
import { formatDisplayMoney } from "@/lib/display-money";
import { ArrowUpRight, Users, MapPin } from "lucide-react";
import type { OfferDTO } from "@/lib/types";
import { getCountryLabel, getSectorLabel } from "@/lib/countries";

function progressPct(raised: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  const p = (raised / goal) * 100;
  return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
}

function yieldLabel(offer: OfferDTO, locale: "fr" | "en"): string {
  if (offer.project.instrumentType === "equity") {
    const pct = offer.equityOfferedPct ?? 0;
    return `${pct.toFixed(pct % 1 === 0 ? 0 : 2).replace(".", locale === "fr" ? "," : ".")} % ${locale === "fr" ? "du capital" : "equity"}`;
  }
  // dette
  const rate = offer.annualRate ?? 0;
  const duration = offer.durationMonths ?? 0;
  const rateStr = rate
    .toFixed(rate % 1 === 0 ? 0 : 2)
    .replace(".", locale === "fr" ? "," : ".");
  if (offer.ratePeriod === "annual" && duration > 0) {
    return `${rateStr} % ${locale === "fr" ? "par an" : "per year"} · ${duration} ${locale === "fr" ? "mois" : "months"}`;
  }
  return `${rateStr} % ${locale === "fr" ? `total sur ${duration} mois` : `total over ${duration} months`}`;
}

export function OfferCard({ offer, eager = false, compactOnMobile = false }: { offer: OfferDTO; eager?: boolean; compactOnMobile?: boolean }) {
  const openOffer = useAppStore((s) => s.openOffer);
  const locale = useAppStore((s) => s.locale);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const pct = progressPct(offer.raisedAmount, offer.fundingGoal);
  const isEquity = offer.project.instrumentType === "equity";
  const isShowcase = offer.id.startsWith("showcase-");

  return (
    <Card className={`group gap-0 overflow-hidden rounded-[1.35rem] border border-[#541249]/10 bg-white/90 p-0 transition-all duration-300 hover:-translate-y-1 hover:border-[#541249]/25 hover:shadow-[0_24px_60px_rgba(56,12,49,.12)] ${compactOnMobile ? "flex flex-row sm:flex-col" : "flex flex-col"}`}>
      {/* Image */}
      <button
        data-control="media"
        onClick={() => openOffer(offer.id)}
        className={`relative overflow-hidden ${compactOnMobile ? "block min-h-44 w-[38%] shrink-0 sm:h-48 sm:w-full" : "block h-44 w-full sm:h-48"}`}
        aria-label={`${locale === "fr" ? "Voir l’offre" : "View offer"} ${offer.project.title}`}
      >
        <Image
          src={offer.project.imageUrl}
          alt={offer.project.title}
          fill
          sizes={compactOnMobile ? "(max-width: 640px) 38vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          loading={eager ? "eager" : "lazy"}
          unoptimized
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
        />
        <div className={`absolute left-3 top-3 gap-1.5 ${compactOnMobile ? "hidden sm:flex" : "flex"}`}>
          <Badge className="bg-background/95 text-foreground shadow-sm">
            {getSectorLabel(offer.project.sector, locale)}
          </Badge>
          {isEquity ? (
            <Badge className="bg-nexora-black text-nexora-lime shadow-sm">
              {locale === "fr" ? "Capital" : "Equity"}
            </Badge>
          ) : (
            <Badge className="bg-nexora-pale text-positive shadow-sm">
              {locale === "fr" ? "Dette" : "Debt"}
            </Badge>
          )}
        </div>
        {isShowcase ? (
          <Badge className="absolute right-3 top-3 border border-white/25 bg-[#380c31]/88 text-[9px] uppercase tracking-[.1em] text-white shadow-sm backdrop-blur-md">
            {locale === "fr" ? "Démonstration" : "Demo"}
          </Badge>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-medium text-white drop-shadow">
          <MapPin className="h-3.5 w-3.5" />
          {offer.project.city}, {getCountryLabel(offer.project.country, locale)}
        </div>
      </button>

      {/* Content */}
      <div className={`flex min-w-0 flex-1 flex-col ${compactOnMobile ? "gap-2.5 p-3 sm:gap-4 sm:p-5" : "gap-4 p-4 sm:p-5"}`}>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {offer.project.company.tradeName || offer.project.company.legalName}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-extrabold leading-snug tracking-[-.015em] text-foreground">
            {offer.project.title}
          </h3>
        </div>

        {/* Rémunération */}
        <div className={`rounded-xl border border-[#541249]/8 bg-[#f8f2f7] px-3.5 py-2.5 ${compactOnMobile ? "hidden sm:block" : ""}`}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {locale === "fr" ? "Rémunération" : "Return"}
          </p>
          <p
            className={`tnum text-sm font-extrabold ${
              isEquity ? "text-foreground" : "text-positive"
            }`}
          >
            {yieldLabel(offer, locale)}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="tnum font-semibold text-foreground">
              {formatDisplayMoney(offer.raisedAmount, displayCurrency, locale, true)}
            </span>
            <span className="text-muted-foreground">
              {locale === "fr" ? "sur" : "of"} {formatDisplayMoney(offer.fundingGoal, displayCurrency, locale, true)}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className={`mt-1 items-center justify-between text-[11px] text-muted-foreground ${compactOnMobile ? "hidden sm:flex" : "flex"}`}>
            <span className="tnum font-medium text-positive">
              {fmtPct(pct, 0)} {locale === "fr" ? "financé" : "funded"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="tnum">{offer.backersCount}</span> {locale === "fr" ? "souscripteurs" : "investors"}
            </span>
          </div>
        </div>

        {/* Min investment + actions */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="text-xs">
            <span className="text-muted-foreground">{locale === "fr" ? "Dès" : "From"} </span>
            <span className="tnum font-semibold text-foreground">
              {formatDisplayMoney(offer.minInvestment, displayCurrency, locale, true)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => openOffer(offer.id)}
              className="btn-nexora"
            >
              <span className={compactOnMobile ? "sr-only sm:not-sr-only" : ""}>{locale === "fr" ? "Voir l’offre" : "View offer"}</span>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
