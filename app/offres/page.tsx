"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Building2,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatRate } from "@/lib/calculations";

interface OfferItem {
  id: string;
  type: string;
  rate: number;
  ratePeriod: string;
  duration: number;
  minTicket: number;
  maxTicket: number;
  targetAmount: number;
  collectedAmount: number;
  investorCount: number;
  status: string;
  endDate: string | null;
  project: {
    title: string;
    description: string;
    sector: string;
    city: string | null;
    country?: string;
    company: { name: string };
  };
}

export default function OffresPage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeSector, setActiveSector] = useState("Tous");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/offers")
      .then(async (response) => {
        if (!response.ok) throw new Error("fetch failed");
        const data = await response.json();
        if (!cancelled) setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nexora_favorites") || "[]");
      if (Array.isArray(saved)) setFavorites(saved);
    } catch {
      /* Le catalogue reste utilisable même sans stockage local. */
    }
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id];

      try {
        localStorage.setItem("nexora_favorites", JSON.stringify(next));
      } catch {
        /* Stockage indisponible : état conservé uniquement pendant la session. */
      }

      return next;
    });
  };

  const sectors = useMemo(
    () => ["Tous", ...Array.from(new Set(offers.map((offer) => offer.project.sector)))],
    [offers]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesSector =
        activeSector === "Tous" || offer.project.sector === activeSector;
      const searchable = `${offer.project.company.name} ${offer.project.title} ${offer.project.description} ${offer.project.city || ""}`.toLowerCase();
      return matchesSector && (!query || searchable.includes(query));
    });
  }, [activeSector, offers, search]);

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <header className="sticky top-0 z-50 border-b border-[#101010]/7 bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-10">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <NexoraLogo size={32} className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#101010]">
                Nexora Capital
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#101010]/36">
                Opportunités
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/connexion"
              className="hidden min-h-10 items-center rounded-[12px] px-3.5 text-sm font-semibold text-[#101010]/58 transition-colors hover:bg-[#F5F5F3] hover:text-[#101010] sm:flex"
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#B6FF00] bg-[#B6FF00] px-4 text-sm font-semibold text-[#101010] shadow-[0_8px_20px_rgba(16,16,16,0.11)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_12px_26px_rgba(16,16,16,0.15)]"
            >
              <span className="sm:hidden">Créer</span>
              <span className="hidden sm:inline">Créer un compte</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-[1280px] px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 lg:px-10 lg:pt-12">
          <div className="max-w-3xl">
            <Badge variant="accent">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Offres publiées après analyse
            </Badge>
            <h1 className="mt-4 text-[32px] font-bold leading-[1.06] tracking-[-0.04em] text-[#101010] sm:text-[42px] lg:text-[48px]">
              Choisissez une entreprise.<br className="hidden sm:block" /> Comprenez l&apos;offre. Investissez ensuite.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#101010]/56 sm:text-base">
              Comparez les conditions, la durée, le montant minimum et l&apos;avancement de chaque collecte avant toute décision.
            </p>
          </div>
        </section>

        <section className="sticky top-16 z-30 border-y border-[#101010]/6 bg-[#F5F5F3]/94 backdrop-blur-xl sm:top-[72px]">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10">
            <div className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#101010]/38" />
              <input
                className="nx-field h-[52px] w-full pl-11 pr-4 text-base sm:h-12 sm:text-sm"
                placeholder="Entreprise, projet, secteur ou ville…"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Rechercher une offre"
              />
            </div>

            <div className="nx-scroll-strip -mx-4 px-4 sm:-mx-0 sm:px-0" aria-label="Filtres par secteur">
              {sectors.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setActiveSector(sector)}
                  data-active={activeSector === sector}
                  className="nx-chip"
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#101010]/38">Catalogue</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-[#101010] sm:text-2xl">
                {loading ? "Chargement…" : `${filtered.length} offre${filtered.length > 1 ? "s" : ""}`}
              </h2>
            </div>
            {!loading && search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="min-h-10 rounded-[12px] px-3 text-xs font-semibold text-[#101010]/52 transition-colors hover:bg-white hover:text-[#101010]"
              >
                Effacer la recherche
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="rounded-[20px] border border-[#101010]/7 bg-white p-5 sm:p-6">
                  <div className="nx-skeleton h-7 w-24" />
                  <div className="nx-skeleton mt-4 h-6 w-3/4" />
                  <div className="nx-skeleton mt-2 h-4 w-1/2" />
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="nx-skeleton h-20" />
                    <div className="nx-skeleton h-20" />
                  </div>
                  <div className="nx-skeleton mt-5 h-2.5 w-full" />
                  <div className="nx-skeleton mt-6 h-11 w-full" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <Card padding="lg">
              <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
                <Search className="h-8 w-8 text-[#101010]/20" />
                <h3 className="mt-4 text-lg font-bold text-[#101010]">Impossible de charger les offres</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#101010]/50">
                  Vérifiez votre connexion puis relancez le chargement.
                </p>
                <Button variant="secondary" className="mt-5" onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              </div>
            </Card>
          ) : filtered.length === 0 ? (
            <Card padding="lg">
              <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
                <Search className="h-8 w-8 text-[#101010]/20" />
                <h3 className="mt-4 text-lg font-bold text-[#101010]">Aucun résultat</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#101010]/50">
                  Modifiez la recherche ou revenez à tous les secteurs.
                </p>
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => {
                    setSearch("");
                    setActiveSector("Tous");
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((offer) => {
                const saved = favorites.includes(offer.id);

                return (
                  <Card key={offer.id} hover className="flex min-h-full flex-col" padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant="accent">{offer.project.sector}</Badge>
                      <span className="rounded-full bg-[#F5F5F3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#101010]/46">
                        {offer.type === "DEBT" ? "Dette" : "Capital"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-bold tracking-[-0.02em] text-[#101010]">
                        {offer.project.company.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-[#101010]/72">
                        {offer.project.title}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[#101010]/45">
                        <MapPin className="h-3.5 w-3.5" />
                        {offer.project.city || "Localisation à consulter"}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[14px] border border-[#B6FF00]/25 bg-[#EFFBDD] p-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[#101010]/45">
                          Rémunération
                        </p>
                        <p className="nx-data mt-1.5 text-lg font-bold text-[#101010]">
                          {formatRate(offer.rate)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#101010]/48">
                          {offer.ratePeriod === "TOTAL" ? `total · ${offer.duration} mois` : `par an · ${offer.duration} mois`}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-[#101010]/6 bg-[#F5F5F3] p-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[#101010]/45">
                          Ticket minimum
                        </p>
                        <p className="nx-data mt-1.5 text-lg font-bold text-[#101010]">
                          {new Intl.NumberFormat("fr-FR").format(offer.minTicket)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#101010]/48">FCFA</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <ProgressBar
                        value={offer.collectedAmount}
                        max={offer.targetAmount}
                        label={`Collecté sur ${formatFCFA(offer.targetAmount)}`}
                      />
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[#101010]/45">
                        <Users className="h-3.5 w-3.5" />
                        {offer.investorCount} investisseur{offer.investorCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="mt-auto flex gap-2 pt-5">
                      <Link href={`/offres/${offer.id}`} className="flex-1">
                        <Button fullWidth size="md">
                          Voir l&apos;offre
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <button
                        type="button"
                        aria-label={saved ? "Retirer des favoris" : "Enregistrer l'offre"}
                        aria-pressed={saved}
                        onClick={() => toggleFavorite(offer.id)}
                        className={`nx-icon-button !h-12 !w-12 ${saved ? "!border-[#B6FF00]/40 !bg-[#EFFBDD] !text-[#101010]" : ""}`}
                      >
                        <Bookmark className="h-[18px] w-[18px]" fill={saved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-[#101010]/7 bg-white">
          <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#101010]/38">Entreprise</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#101010] sm:text-3xl">
                Vous recherchez un financement ?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#101010]/54">
                Préparez votre dossier. Notre équipe l&apos;analyse avant toute éventuelle publication d&apos;une offre.
              </p>
            </div>
            <Link href="/entreprise" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth className="sm:w-auto" icon={<Building2 className="h-4 w-4" />}>
                Financer mon entreprise
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
