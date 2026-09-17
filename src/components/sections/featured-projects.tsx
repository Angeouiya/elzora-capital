"use client";
import { useFetch } from "@/hooks/use-fetch";
import { ProjectCard } from "@/components/site/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { ArrowRight } from "lucide-react";

export function FeaturedProjects() {
  const { data, loading } = useFetch<{ projects: Project[] }>(
    "/api/projects?featured=true"
  );
  const { setView } = useAppStore();
  const projects = (data?.projects || []).slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Sélection du moment
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Opportunités en vedette
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Des projets dûment analysés par nos analystes financiers, ouverts au
            financement participatif privé.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => setView("projects")}
          className="hidden text-primary hover:bg-primary/10 sm:inline-flex"
        >
          Tout voir
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border">
                <Skeleton className="h-44 w-full" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))
          : projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Button
          variant="outline"
          onClick={() => setView("projects")}
          className="border-primary/30 text-primary"
        >
          Voir toutes les opportunités
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
