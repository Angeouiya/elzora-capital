# Nexora Capital

Plateforme de financement participatif destinée à l'Afrique de l'Ouest. Les entreprises soumettent des projets, l'équipe analyse et publie les offres, les investisseurs financent et perçoivent leurs remboursements.

## Stack technique

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** (thème dans `app/globals.css`)
- **Prisma + SQLite** (base de données)
- **NextAuth v5** (authentification par identifiants)
- **Lucide React** (icônes outline)
- Polices : Hanken Grotesk + JetBrains Mono

## Démarrage

```bash
npm install
cp .env.example .env        # puis ajustez les valeurs
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts      # données de démonstration
npm run dev
```

Ouvrir http://localhost:3000

## Comptes de démonstration

| Rôle | Email | Mot de passe | Espace |
|------|-------|--------------|--------|
| Investisseur | investisseur@nexora.ci | password123 | /dashboard |
| Entreprise | entreprise@nexora.ci | password123 | /entreprise/dashboard |
| Admin | admin@nexora.ci | password123 | /admin/dashboard |

## Architecture

```
app/
  page.tsx                  Accueil public (offres, recherche)
  offres/                   Catalogue + fiche offre + souscription
  connexion/ inscription/   Authentification
  dashboard/                Espace investisseur (KPIs, investissements, paiements, retrait)
  entreprise/               Espace entreprise (dossiers, financements, remboursements)
  admin/                    Portail administrateur séparé (analyse, offres, finances, audit)
  api/                      27 routes API (Route Handlers)
components/ui/              13 composants partagés (Button, Card, KPI, Sidebar…)
lib/
  auth.ts                   NextAuth (credentials + rôles JWT)
  db.ts                     Client Prisma
  calculations.ts           Règles métier (commissions 6% + 2%, échéanciers, répartition)
prisma/
  schema.prisma             12 modèles (User, Company, Project, Offer, Investment…)
  seed.ts                   Données de démonstration
middleware.ts               Protection des routes par rôle
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
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run db:generate` | Génère le client Prisma |
| `npm run db:push` | Synchronise le schéma avec la base |
| `npm run db:seed` | Charge les données de démo |
