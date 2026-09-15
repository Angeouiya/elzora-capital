# Nexora Capital

Plateforme de financement participatif destinée à l'Afrique de l'Ouest. Les entreprises soumettent des projets, l'équipe analyse et publie les offres, les investisseurs financent et perçoivent leurs remboursements.

**Production :** https://elzora-capital.promise-corporation.workers.dev (Cloudflare Workers + D1)

## Stack technique

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** (thème dans `app/globals.css`, palette exacte spec §04)
- **Prisma 7 + Cloudflare D1** (SQLite en local, D1 en production — driver adapter)
- **OpenNext Cloudflare** (`@opennextjs/cloudflare`) — déploiement Workers
- **NextAuth v5** (authentification par identifiants, JWT)
- **Lucide React** (icônes outline)
- Polices : Hanken Grotesk + JetBrains Mono

## Démarrage local

```bash
npm install
npx prisma generate
npm run db:d1:local      # schéma + données de démo dans le D1 local (miniflare)
npm run dev
```

Ouvrir http://localhost:3000 — les bindings D1 sont exposés en dev via `initOpenNextCloudflareForDev` (miniflare).

## Comptes de démonstration

| Rôle | Email | Mot de passe | Espace |
|------|-------|--------------|--------|
| Investisseur | investisseur@nexora.ci | password123 | /dashboard |
| Entreprise | entreprise@nexora.ci | password123 | /entreprise/dashboard |
| Admin | admin@nexora.ci | password123 | /admin/dashboard |

## Déploiement Cloudflare

```bash
npm run deploy           # opennextjs-cloudflare build && deploy
npm run db:d1:remote     # (re)charge schéma + seed dans le D1 distant
```

Configuration :
- `wrangler.jsonc` — worker `elzora-capital`, binding D1 `DB` (base `elzora-capital-production`), assets statiques
- `open-next.config.ts` — adaptateur Cloudflare (cache dummy)
- `.dev.vars` — secrets locaux (`AUTH_SECRET`) ; en production : `wrangler secret put AUTH_SECRET`
- `prisma/d1/schema.sql` — DDL généré (`prisma migrate diff --from-empty --to-schema`)
- `prisma/d1/seed.sql` — données de démonstration exportées (`npm run db:export-seed`)
- `scripts/patch-opennext-windows.mjs` — patch Windows (symlinks → copie) appliqué en `postinstall`

## Architecture

```
app/
  page.tsx                  Accueil public (offres, recherche)
  offres/                   Catalogue + fiche offre + souscription
  connexion/ inscription/   Authentification (+ mot-de-passe-oublie, cgu, confidentialite)
  dashboard/                Espace investisseur (KPIs, investissements, paiements, retrait)
  entreprise/               Espace entreprise (dossiers, financements, remboursements)
  admin/                    Portail administrateur séparé (analyse, offres, finances, audit)
  api/                      30 routes API (Route Handlers)
components/ui/              13 composants partagés (Button, Card, KPI, Sidebar…)
lib/
  auth.config.ts            Config NextAuth partagée (Edge-compatible, middleware)
  auth.ts                   NextAuth complet (credentials + rôles JWT, Node runtime)
  db.ts                     Client Prisma + adapter D1 (lazy, contexte Cloudflare)
  generated/prisma/         Client Prisma 7 généré (runtime workerd, ESM)
  calculations.ts           Règles métier (commissions 6% + 2%, échéanciers, répartition)
prisma/
  schema.prisma             12 modèles (User, Company, Project, Offer, Investment…)
  seed.ts                   Données de démonstration (D1 local via getPlatformProxy)
  d1/                       DDL + seed SQL pour Cloudflare D1
middleware.ts               Protection des routes par rôle (Edge, sans Prisma)
```

## Règles métier principales

- Commission initiale : **6 %** du capital financé (payée par l'entreprise)
- Suivi : **2 % par an** du capital restant, au prorata de la durée
- **Aucune commission pour l'investisseur**
- « 8 % au total sur 6 mois » ≠ « 8 % par an » : la période du taux est explicite
- Scénario de référence (§28) : 1 000 000 FCFA, 100 × 10 000 FCFA, 8 % total sur 6 mois → commission 60 000, net entreprise 940 000, intérêts 80 000, suivi 10 000, paiement final 1 090 000, investisseur 10 800, CA plateforme 70 000 FCFA

## Mode démonstration

La plateforme fonctionne en mode démonstration : les paiements sont simulés et aucun prestataire réel n'est intégré. Aucune opération ne manipule d'argent réel.

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (bindings D1 via miniflare) |
| `npm run build` | Build de production Next.js |
| `npm run deploy` | Build OpenNext + déploiement Cloudflare Workers |
| `npm run preview` | Build OpenNext + `wrangler dev` local |
| `npm run db:generate` | Génère le client Prisma (workerd) |
| `npm run db:export-seed` | Exporte dev.db vers prisma/d1/seed.sql |
| `npm run db:d1:local` | Charge schéma + seed dans le D1 local |
| `npm run db:d1:remote` | Charge schéma + seed dans le D1 distant |
