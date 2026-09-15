"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  LayoutGrid,
  Wallet,
  ArrowRight,
  Bookmark,
  Menu,
  X,
  MapPin,
  TrendingUp,
  Compass,
  Users,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { NexoraLogo } from "@/components/NexoraLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatRate } from "@/lib/calculations";

/* ---------------------------------- Types --------------------------------- */

interface CompanyRef {
  name: string;
  sector: string;
  country: string;
}

interface ProjectRef {
  title: string;
  description: string;
  sector: string;
  city: string | null;
  country: string;
  company: CompanyRef;
}

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
  project: ProjectRef;
}

/* ------------------------------ How it works ------------------------------ */

const steps = [
  {
    n: "01",
    icon: Compass,
    title: "Explorez les projets",
    description:
      "Parcourez des dossiers d'entreprises rigoureusement analysés et vérifiés par nos équipes avant publication.",
  },
  {
    n: "02",
    icon: Wallet,
    title: "Allouez votre capital",
    description:
      "Choisissez librement votre montant et investissez directement, sans intermédiaire, dès le ticket minimum.",
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Percevez vos remboursements",
    description:
      "Suivez les échéances contractuelles de votre portefeuille et encaissez vos intérêts en toute transparence.",
  },
];

/* -------------------------------- Component ------------------------------- */

export default function HomePage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("Tous");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Charger les offres publiées */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/offers")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: OfferItem[] = await res.json();
        if (!cancelled) setOffers(data);
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

  /* Favoris persistés localement (lecture asynchrone après montage) */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("nexora_favorites") || "[]"
        );
        if (!cancelled && Array.isArray(saved)) setFavorites(saved);
      } catch {
        /* favoris illisibles : on ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      try {
        localStorage.setItem("nexora_favorites", JSON.stringify(next));
      } catch {
        /* stockage indisponible : on ignore */
      }
      return next;
    });
  };

  /* Secteurs disponibles déduits des offres */
  const sectors = useMemo(
    () => ["Tous", ...Array.from(new Set(offers.map((o) => o.project.sector)))],
    [offers]
  );

  /* Filtrage client : recherche + secteur */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((o) => {
      const matchSector = sector === "Tous" || o.project.sector === sector;
      const haystack =
        `${o.project.title} ${o.project.description} ${o.project.company.name} ${o.project.city ?? ""}`.toLowerCase();
      return matchSector && (!q || haystack.includes(q));
    });
  }, [offers, search, sector]);

  const totalCollected = useMemo(
    () => offers.reduce((sum, o) => sum + o.collectedAmount, 0),
    [offers]
  );
  const totalInvestors = useMemo(
    () => offers.reduce((sum, o) => sum + o.investorCount, 0),
    [offers]
  );

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* ------------------------------- Header ------------------------------ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <NexoraLogo size={32} />
            <span className="text-[#101010] font-semibold tracking-tight text-lg leading-none">
              Nexora Capital
            </span>
          </Link>

          {/* Liens desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/offres"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F5F3] transition-colors"
            >
              <LayoutGrid className="h-4 w-4" />
              Explorer
            </Link>
            <Link
              href="/entreprise"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#101010]/70 hover:text-[#101010] hover:bg-[#F5F5F3] transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Financer mon entreprise
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/connexion"
              className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm font-medium text-[#101010] hover:bg-[#F5F5F3] transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Créer un compte
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Bouton menu mobile */}
          <button
            type="button"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden h-10 w-10 rounded-lg flex items-center justify-center text-[#101010] hover:bg-[#F5F5F3] transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Panneau menu mobile */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#101010]/8 bg-white px-4 py-3 flex flex-col gap-1">
            <Link
              href="/offres"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium text-[#101010] hover:bg-[#F5F5F3]"
            >
              <LayoutGrid className="h-4 w-4 text-[#101010]/60" />
              Explorer les offres
            </Link>
            <Link
              href="/entreprise"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium text-[#101010] hover:bg-[#F5F5F3]"
            >
              <Building2 className="h-4 w-4 text-[#101010]/60" />
              Financer mon entreprise
            </Link>
            <div className="flex gap-2 pt-2">
              <Link
                href="/connexion"
                onClick={() => setMenuOpen(false)}
                className="flex-1 h-11 rounded-lg bg-[#F5F5F3] ring-1 ring-[#101010]/10 flex items-center justify-center text-sm font-medium text-[#101010]"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                onClick={() => setMenuOpen(false)}
                className="flex-1 h-11 rounded-lg bg-[#B6FF00] flex items-center justify-center text-sm font-semibold text-[#101010]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-16">
        {/* -------------------------------- Hero ------------------------------ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8">
          <div className="max-w-2xl animate-fade-in-up">
            <Badge variant="accent" className="mb-4">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Investir en Afrique de l&apos;Ouest
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#101010] leading-[1.1]">
              Investissez dans des entreprises,{" "}
              <span className="text-[#507300]">en direct</span>.
            </h1>
            <p className="mt-4 text-[#101010]/60 text-base sm:text-lg leading-relaxed">
              Nexora Capital connecte les investisseurs aux entreprises
              ouest-africaines auditées, sans intermédiaire. Rémunération
              contractuelle claire, dès {formatFCFA(10000)}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/offres"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Explorer les offres
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/entreprise"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-[#F5F5F3] ring-1 ring-[#101010]/10 text-[#101010] text-sm font-medium hover:bg-[#EFFBDD] transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Financer mon entreprise
              </Link>
            </div>
          </div>

          {/* Chiffres clés issus des données réelles */}
          {!loading && !loadError && offers.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl animate-fade-in-up animate-fade-in-up-delay-1">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#101010]">
                  {offers.length}
                </div>
                <div className="text-xs sm:text-sm text-[#101010]/50 mt-0.5">
                  offres ouvertes
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#101010]">
                  {new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(totalCollected)}
                </div>
                <div className="text-xs sm:text-sm text-[#101010]/50 mt-0.5">
                  FCFA collectés
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#101010]">
                  {totalInvestors}
                </div>
                <div className="text-xs sm:text-sm text-[#101010]/50 mt-0.5">
                  investisseurs
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---------------------------- Recherche + filtres ------------------- */}
        <section
          id="offres"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sticky top-16 z-30 bg-[#f9f9f7]/95 backdrop-blur-sm"
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#101010]/40 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une entreprise, un projet, une ville…"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-[#101010]/10 text-sm text-[#101010] placeholder:text-[#101010]/40 outline-none transition-all focus:ring-2 focus:ring-[#B6FF00]/50 focus:border-[#B6FF00]"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {loading
                ? ["Tous", "Secteur A", "Secteur B"].map((s) => (
                    <span
                      key={s}
                      className="shrink-0 h-8 w-20 rounded-full bg-white border border-[#101010]/10 animate-pulse"
                    />
                  ))
                : sectors.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSector(s)}
                      className={`shrink-0 h-8 px-4 rounded-full text-xs font-medium transition-colors ${
                        sector === s
                          ? "bg-[#101010] text-[#F5F5F3] font-semibold"
                          : "bg-white text-[#101010]/60 border border-[#101010]/10 hover:text-[#101010] hover:bg-[#F5F5F3]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ Grille offres ----------------------- */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          {loading ? (
            /* État de chargement : cartes squelettes */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#101010]/5 p-5 animate-pulse"
                >
                  <div className="h-5 w-24 rounded bg-[#F5F5F3] mb-3" />
                  <div className="h-6 w-3/4 rounded bg-[#F5F5F3] mb-2" />
                  <div className="h-4 w-1/2 rounded bg-[#F5F5F3] mb-5" />
                  <div className="h-10 rounded-lg bg-[#F5F5F3] mb-4" />
                  <div className="h-1.5 rounded-full bg-[#F5F5F3] mb-4" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 rounded-lg bg-[#F5F5F3]" />
                    <div className="h-10 w-10 rounded-lg bg-[#F5F5F3]" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            /* Erreur de chargement */
            <Card className="text-center py-12">
              <p className="text-[#101010] font-medium mb-1">
                Impossible de charger les offres
              </p>
              <p className="text-sm text-[#101010]/50 mb-4">
                Vérifiez votre connexion puis réessayez.
              </p>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Réessayer
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            /* Aucun résultat */
            <Card className="text-center py-12">
              <Search className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
              <p className="text-[#101010] font-medium mb-1">
                Aucune offre ne correspond
              </p>
              <p className="text-sm text-[#101010]/50">
                Essayez un autre mot-clé ou sélectionnez « Tous » les secteurs.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((offer) => {
                const saved = favorites.includes(offer.id);
                const pct = Math.min(
                  100,
                  Math.round(
                    (offer.collectedAmount / Math.max(offer.targetAmount, 1)) *
                      100
                  )
                );
                return (
                  <Card
                    key={offer.id}
                    hover
                    className="flex flex-col animate-fade-in-up"
                  >
                    {/* En-tête carte */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="accent">{offer.project.sector}</Badge>
                      <span className="text-[11px] font-medium text-[#101010]/40 uppercase tracking-wide">
                        {offer.type === "DEBT" ? "Dette" : "Capital"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#101010] leading-snug">
                      {offer.project.company.name}
                    </h3>
                    <p className="text-sm text-[#101010]/70 mt-0.5 line-clamp-2">
                      {offer.project.title}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-[#101010]/50 mt-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {offer.project.city ?? "—"}
                      {offer.project.city ? " · " : ""}
                      {offer.project.country === "CI"
                        ? "Côte d'Ivoire"
                        : offer.project.country}
                    </p>

                    {/* Indicateurs clés */}
                    <div className="grid grid-cols-2 gap-2 my-4">
                      <div className="bg-[#EFFBDD] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#507300]">
                          Taux
                        </div>
                        <div className="text-base font-bold text-[#101010] mt-0.5">
                          {formatRate(offer.rate)}
                        </div>
                        <div className="text-[11px] text-[#101010]/50">
                          {offer.ratePeriod === "TOTAL"
                            ? "sur la durée"
                            : "par an"}{" "}
                          · {offer.duration} mois
                        </div>
                      </div>
                      <div className="bg-[#F5F5F3] rounded-lg p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#101010]/50">
                          Ticket min.
                        </div>
                        <div className="text-base font-bold text-[#101010] mt-0.5">
                          {new Intl.NumberFormat("fr-FR").format(
                            offer.minTicket
                          )}
                        </div>
                        <div className="text-[11px] text-[#101010]/50">FCFA</div>
                      </div>
                    </div>

                    {/* Progression de la collecte */}
                    <ProgressBar
                      value={offer.collectedAmount}
                      max={offer.targetAmount}
                      label={`Collecté sur ${formatFCFA(offer.targetAmount)}`}
                      className="mb-4"
                    />
                    <p className="flex items-center gap-1.5 text-xs text-[#101010]/50 -mt-3 mb-4">
                      <Users className="h-3.5 w-3.5" />
                      {offer.investorCount} investisseur
                      {offer.investorCount > 1 ? "s" : ""}
                      {offer.endDate && " · "}{pct}% financé
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={`/offres/${offer.id}`}
                        className="flex-1 h-10 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        Voir l&apos;offre
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        aria-pressed={saved}
                        aria-label={
                          saved
                            ? "Retirer des favoris"
                            : "Enregistrer l'offre"
                        }
                        title={saved ? "Retirer des favoris" : "Enregistrer"}
                        onClick={() => toggleFavorite(offer.id)}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
                          saved
                            ? "bg-[#EFFBDD] text-[#507300]"
                            : "bg-[#F5F5F3] text-[#101010]/60 hover:text-[#101010]"
                        }`}
                      >
                        <Bookmark
                          className="h-4 w-4"
                          fill={saved ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* --------------------------- Comment fonctionne --------------------- */}
        <section className="bg-white border-y border-[#101010]/8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
            <div className="max-w-xl mb-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#507300]">
                Processus d&apos;allocation
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#101010] tracking-tight mt-1">
                Comment fonctionne Nexora
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {steps.map((step) => (
                <div
                  key={step.n}
                  className="bg-[#f9f9f7] rounded-xl p-6 border border-[#101010]/5 hover-lift"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-lg bg-[#EFFBDD] flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-[#507300]" />
                    </div>
                    <span className="font-mono text-sm font-bold text-[#101010]/20">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#101010]">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#101010]/60 leading-relaxed mt-1.5">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ CTA entreprise ---------------------- */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="bg-[#101010] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#B6FF00]/10 blur-3xl pointer-events-none"
              aria-hidden
            />
            <div className="relative max-w-2xl">
              <div className="h-11 w-11 rounded-lg bg-[#B6FF00]/15 flex items-center justify-center mb-5">
                <Landmark className="h-5 w-5 text-[#B6FF00]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                Vous cherchez des capitaux pour votre entreprise&nbsp;?
              </h2>
              <p className="text-white/60 mt-3 text-sm sm:text-base leading-relaxed">
                Présentez votre projet à notre comité d&apos;analyse financière
                et accédez à des financements directs, non dilutifs, auprès de
                centaines d&apos;investisseurs.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/entreprise"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-[#B6FF00] text-[#101010] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Déposer un projet
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/entreprise"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  En savoir plus
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------- Footer ---------------------------- */}
        <footer className="border-t border-[#101010]/8 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <NexoraLogo size={26} />
              <span className="text-sm font-semibold text-[#101010]">
                Nexora Capital
              </span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-[#101010]/60">
              <Link href="/offres" className="hover:text-[#101010] transition-colors">
                Offres
              </Link>
              <Link href="/entreprise" className="hover:text-[#101010] transition-colors">
                Entreprises
              </Link>
              <Link href="/connexion" className="hover:text-[#101010] transition-colors">
                Connexion
              </Link>
            </nav>
            <p className="text-xs text-[#101010]/40">
              © {new Date().getFullYear()} Nexora Capital — Plateforme de démonstration
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
