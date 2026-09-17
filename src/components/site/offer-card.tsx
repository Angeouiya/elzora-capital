"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { fmtCompact, fmtPct } from "@/lib/finance";
import { Bookmark, Users, MapPin } from "lucide-react";
import type { OfferDTO } from "@/lib/types";

function progressPct(raised: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  const p = (raised / goal) * 100;
  return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
}

function yieldLabel(offer: OfferDTO): string {
  if (offer.project.instrumentType === "equity") {
    const pct = offer.equityOfferedPct ?? 0;
    return `${pct.toFixed(pct % 1 === 0 ? 0 : 2).replace(".", ",")} % du capital`;
  }
  // dette
  const rate = offer.annualRate ?? 0;
  const duration = offer.durationMonths ?? 0;
  const rateStr = rate.toFixed(rate % 1 === 0 ? 0 : 2).replace(".", ",");
  if (offer.ratePeriod === "annual" && duration > 0) {
    return `${rateStr} % par an · ${duration} mois`;
  }
  return `${rateStr} % total sur ${duration} mois`;
}

export function OfferCard({ offer }: { offer: OfferDTO }) {
  const openOffer = useAppStore((s) => s.openOffer);
  const pct = progressPct(offer.raisedAmount, offer.fundingGoal);
  const isEquity = offer.project.instrumentType === "equity";

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden rounded-lg border border-border p-0 transition-all hover:shadow-md">
      {/* Image */}
      <button
        onClick={() => openOffer(offer.id)}
        className="relative block h-40 w-full overflow-hidden"
        aria-label={`Voir l'offre ${offer.project.title}`}
      >
        <img
          src={offer.project.imageUrl}
          alt={offer.project.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge className="bg-background/95 text-foreground shadow-sm">
            {offer.project.sector}
          </Badge>
          {isEquity ? (
            <Badge className="bg-nexora-black text-nexora-lime shadow-sm">
              Capital
            </Badge>
          ) : (
            <Badge className="bg-nexora-pale text-positive shadow-sm">
              Dette
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-medium text-white drop-shadow">
          <MapPin className="h-3.5 w-3.5" />
          {offer.project.city}, {offer.project.country}
        </div>
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {offer.project.company.tradeName || offer.project.company.legalName}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {offer.project.title}
          </h3>
        </div>

        {/* Rémunération */}
        <div className="rounded-md bg-secondary/60 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Rémunération
          </p>
          <p
            className={`tnum text-sm font-bold ${
              isEquity ? "text-foreground" : "text-positive"
            }`}
          >
            {yieldLabel(offer)}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="tnum font-semibold text-foreground">
              {fmtCompact(offer.raisedAmount)}
            </span>
            <span className="text-muted-foreground">
              sur {fmtCompact(offer.fundingGoal)}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="tnum font-medium text-positive">
              {fmtPct(pct, 0)} financé
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="tnum">{offer.backersCount}</span> souscripteurs
            </span>
          </div>
        </div>

        {/* Min investment + actions */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="text-xs">
            <span className="text-muted-foreground">Dès </span>
            <span className="tnum font-semibold text-foreground">
              {fmtCompact(offer.minInvestment)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Sauvegarder l'offre"
              onClick={(e) => e.stopPropagation()}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => openOffer(offer.id)}
              className="btn-nexora"
            >
              Voir l&rsquo;offre
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
