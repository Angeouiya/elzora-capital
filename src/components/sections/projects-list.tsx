"use client";
import { useFetch } from "@/hooks/use-fetch";
import { ProjectCard } from "@/components/site/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { SECTORS, COUNTRIES } from "@/lib/format";
import type { Project } from "@/lib/types";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { useState, useMemo } from "react";

export function ProjectsList() {
  const [sector, setSector] = useState("all");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (sector !== "all") params.set("sector", sector);
    if (country !== "all") params.set("country", country);
    if (status !== "all") params.set("status", status);
    const q = params.toString();
    return "/api/projects" + (q ? "?" + q : "");
  }, [sector, country, status]);

  const { data, loading } = useFetch<{ projects: Project[]; total: number }>(query);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Catalogue d'investissement
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Opportunités d'investissement
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data
            ? `${data.total} projet${data.total > 1 ? "s" : ""} ouvert${
                data.total > 1 ? "s" : ""
              } au financement participatif privé.`
            : "Chargement des opportunités…"}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filtrer :
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Secteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les secteurs</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="closing">Bientôt clôturés</SelectItem>
              <SelectItem value="funded">Financés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <SearchX className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            Aucun projet ne correspond à vos critères
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modifiez les filtres pour découvrir d'autres opportunités.
          </p>
        </div>
      )}
    </section>
  );
}
