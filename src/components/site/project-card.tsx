"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { formatCompact, formatPct, progressPct, RISK_LABELS } from "@/lib/format";
import { MapPin, TrendingUp, Users, Clock } from "lucide-react";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const { openProject } = useAppStore();
  const pct = progressPct(project.raisedAmount, project.fundingGoal);
  const risk = RISK_LABELS[project.riskLevel] || RISK_LABELS["Modéré"];

  return (
    <Card
      className="group flex flex-col overflow-hidden p-0 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
      onClick={() => openProject(project.id)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={project.imageUrl}
          alt={project.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge className="bg-background/90 text-foreground backdrop-blur">
            {project.sector}
          </Badge>
          {project.featured && (
            <Badge className="bg-accent text-accent-foreground backdrop-blur">
              ★ En vedette
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
          <MapPin className="h-3.5 w-3.5" />
          {project.city}, {project.country}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {project.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {project.tagline}
        </p>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {formatCompact(project.raisedAmount)}
            </span>
            <span className="text-muted-foreground">
              sur {formatCompact(project.fundingGoal)}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="mt-1 text-right text-[11px] font-medium text-primary">
            {formatPct(pct)} financé
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>
              TRI cible{" "}
              <strong className="text-foreground">{formatPct(project.expectedRoi)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong className="text-foreground">{project.backersCount}</strong>{" "}
              invest.
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Risque{" "}
              <strong className={risk.color}>{risk.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-foreground"> dès {formatCompact(project.minInvestment)}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-4 w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            openProject(project.id);
          }}
        >
          Découvrir le projet
        </Button>
      </div>
    </Card>
  );
}
