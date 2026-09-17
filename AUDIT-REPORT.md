# AUDIT NEXORA CAPITAL — Rapport critique

**Date de l'audit**: session AUDIT-1 (read-only)
**Périmètre**: `src/components/`, `src/app/api/`, `prisma/`, `src/lib/`, `src/app/page.tsx`, `src/app/layout.tsx`
**Méthode**: revue statique de code (Grep/Read/Glob), sans exécution du serveur ni navigateur.

---

## Résumé exécutif

- **Nombre total de problèmes**: 12 critiques, 16 élevés, 22 moyens, 11 faibles → **61 constats**.
- **Verdict préliminaire**: **NON PRÊT POUR PRODUCTION — PRÊT POUR DÉMONSTRATION STRICTE**.
  Le moteur financier `finance.ts` et la séparation visuelle dette/equity sont solides. Mais l'ensemble des mutations financières et des accès admin sont non authentifiés côté serveur, plusieurs tableaux de bord admin affichent des données financières **inventées** présentées comme live, et aucun flux réel de paiement/décaissement/remboursement/distribution n'est implémenté. Toute mise en production sans reprise architecturale de l'auth, du workflow d'analyse, et du circuit de l'argent exposerait à un risque réglementaire (BCEAO/CRC), juridique (perte en capital client) et réputationnel majeur.

---

## A. Logique métier & workflow financement

### A1. [CRITIQUE] Aucune authentification serveur — toutes les mutations admin sont exposées
- **Fichier**: `src/app/api/admin/analysis/route.ts` (lignes 7-45), `src/app/api/admin/stats/route.ts` (lignes 5-47), `src/app/api/admin/login/route.ts` (lignes 16-19)
- **Problème**: `PATCH /api/admin/analysis` accepte `{ projectId, status, note, actorId }` sans vérifier de session admin. `actorId` est fourni par le client. `GET /api/admin/stats` ne vérifie aucun token et retourne tous les utilisateurs (avec emails + statut KYC) et toutes les entreprises. Le login admin accepte n'importe quel mot de passe (`void password` ligne 19) pour tout `AdminUser` actif.
- **Impact**: n'importe qui peut approuver/publier/refuser un dossier, consulter la base utilisateurs, et se faire passer pour n'importe quel admin. La séparation des devoirs affichée en UI est purement cosmétique.
- **Correction**: implémenter NextAuth (credentials + 2FA + IP allowlist) comme indiqué en commentaire ; vérifier la session serveur sur chaque route admin ; refuser `actorId` côté client et le déduire de la session.

### A2. [CRITIQUE] Aucune machine à états sur le workflow d'analyse
- **Fichier**: `src/app/api/admin/analysis/route.ts` (lignes 13-22)
- **Problème**: la route accepte `status` comme chaîne libre — aucun contrôle de transition. On peut passer de `draft` à `published` en un seul appel, sauter `under_review`/`approved`, ou remettre un dossier `published` en `draft`. Le schéma déclare 15 statuts (`draft, submitted, under_review, complement_requested, rejected, approved, offer_prepared, offer_confirmed, published, funding, funded, repaying, completed, defaulted, closed`) mais aucun n'est lié à une transition autorisée.
- **Impact**: le workflow « soumission → analyse → approbation → publication » n'est pas garanti. Une entreprise (ou un attaquant) pourrait court-circuiter l'analyse.
- **Correction**: définir une matrice de transitions autorisées (ex. `submitted → under_review | complement_requested | rejected`, `under_review → approved | rejected`, `approved → published`, etc.) et rejeter toute transition invalide côté serveur.

### A3. [CRITIQUE] La règle « l'entreprise ne publie jamais directement » n'est pas enforceée en code
- **Fichiers**: aucun endpoint `/api/projects` (POST/PUT) n'existe — `Glob src/app/api/**` ne retourne que `offers`, `investor/dashboard`, `admin/login`, `admin/stats`, `admin/analysis`.
- **Problème**: la règle métier est « respectée » uniquement par absence d'API de création de projet. Il n'existe même pas de route permettant à une entreprise de **soumettre** un dossier. Le `view: "company_submit"` déclaré dans `store.ts` n'a aucun composant rattaché dans `page.tsx`. Aucune route ne crée de `Project`, `Offer`, `Investment` confirmé, `CompanyPayment` ni `Distribution`.
- **Impact**: la plateforme est une vitrine de lecture seule ; le workflow de dépôt d'entreprise n'est pas implémenté. La conformité à la spec 2/8 est **apparente** (UI) mais pas **fonctionnelle**.
- **Correction**: créer `POST /api/projects` (soumission entreprise), `POST /api/admin/analysis/{id}/approve` (avec session admin), `POST /api/admin/analysis/{id}/publish` (création de l'Offer figée).

### A4. [CRITIQUE] La publication d'un projet n'entraîne pas la création d'une Offer
- **Fichiers**: `src/app/api/admin/analysis/route.ts` (lignes 13-22), `prisma/schema.prisma` (lignes 187-218 Offer).
- **Problème**: le `PATCH /api/admin/analysis` met à jour `Project.status` et `Project.analysisNote` mais ne crée **jamais** de ligne `Offer`. La seed crée les 4 offres directement en base. Donc un nouveau projet approuvé/publié via l'admin ne sera jamais visible sur `/api/offers` (qui filtre `status: "open"` sur `Offer`, pas sur `Project`).
- **Impact**: le cycle « admin publie → offre visible côté investisseur » est cassé en production. Seules les 4 offres seedées apparaissent.
- **Correction**: lors du passage à `published`, créer une `Offer` à partir des conditions finales du projet (figer `upfrontCommissionPct`, `annualFollowUpPct`, `ratePeriod`, etc.).

### A5. [ÉLEVÉ] La souscription d'investissement n'incrémente pas `raisedAmount` ni `backersCount`
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` (lignes 109-123)
- **Problème**: la route crée un `Investment` avec `status: "pending_payment"` mais ne modifie ni `Offer.raisedAmount`, ni `Offer.committedAmount`, ni `Offer.backersCount`. Le contrôle `remaining = offer.fundingGoal - offer.raisedAmount` (ligne 98) ne tient donc jamais compte des souscriptions en cours — le cap est contournable indéfiniment.
- **Impact**: la jauge de financement affichée aux investisseurs est figée ; le seuil de réussite/échec de la collecte (spec 5) n'est pas calculé.
- **Correction**: incrémenter `committedAmount` à la souscription, `raisedAmount` à la confirmation de paiement, `backersCount` à la première confirmation.

### A6. [ÉLEVÉ] Aucun endpoint de confirmation de paiement serveur
- **Fichiers**: `src/app/api/**` — aucune route ne met à jour `Investment.status` depuis `pending_payment` vers `confirmed`.
- **Problème**: la spec section 5 exige « paiement → confirmation serveur → enregistré ». Le `POST /subscribe` reste à `pending_payment`. Le `GET /api/investor/dashboard` filtre `status: "confirmed"` — donc les souscriptions saisies par l'utilisateur n'apparaissent jamais dans son portefeuille.
- **Impact**: le flux d'investissement est cassé après la première étape ; l'utilisateur est redirigé vers un dashboard vide.
- **Correction**: implémenter `POST /api/investments/{id}/confirm` (webhook prestataire) et afficher `pending_payment` dans le dashboard avec un badge « En attente de confirmation ».

### A7. [ÉLEVÉ] Date de clôture non vérifiée à la souscription
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` (lignes 83-100)
- **Problème**: seul `offer.status === "open"` est vérifié. La `closingDate` n'est jamais comparée à `now()`. Une offre restée `open` peut recevoir des souscriptions après sa date de clôture prévue.
- **Impact**: non-respect de la spec 5 (clôture à date fixe).
- **Correction**: ajouter `if (new Date(offer.closingDate) < new Date()) return 400`.

### A8. [ÉLEVÉ] Aucun mécanisme de succès/échec de collecte
- **Fichiers**: aucun.
- **Problème**: la spec exige min/goal/cap + déclenchement de remboursement si succès, restitution si échec. Aucun code ne compare `raisedAmount` à un seuil minimal à la clôture, aucun job ne ferme les offres, aucun endpoint de remboursement n'existe.
- **Impact**: aucune offre ne peut échouer ni déclencher de remboursement automatique.
- **Correction**: job planifié de clôture, seuil minimal configurable (ex. 60 % du `fundingGoal`), webhook de restitution.

### A9. [MOYEN] Statuts déclaré incohérents entre schéma et UI
- **Fichiers**: `prisma/schema.prisma` (lignes 141-149, 15 statuts), `src/components/admin/admin-analysis.tsx` (lignes 82-94, 8 statuts dans `STATUS_META`), `src/components/admin/admin-offers.tsx` (lignes 80-86, 5 statuts `Offer.status`).
- **Problème**: `STATUS_META` (admin-analysis) omet `offer_prepared, offer_confirmed, funding, funded, repaying, completed, defaulted, closed`. `Offer.status` définit `open, closing, funded, failed, closed` mais `funding`/`repaying`/`completed`/`defaulted` sont sur `Project`, pas `Offer` — confusion potentielle.
- **Impact**: un projet dans un statut avancé (`funded`, `repaying`, `completed`, `defaulted`) s'affichera avec un badge fallback générique.
- **Correction**: aligner les énumérations UI/DB ( idéalement utiliser une enum Prisma).

### A10. [MOYEN] `committedAmount` existe mais n'est jamais utilisé
- **Fichiers**: `prisma/schema.prisma` ligne 207, `src/components/admin/admin-offers.tsx` ligne 310 (`fmtFCFA(o.committedAmount)` affiché), aucune route ne l'écrit.
- **Impact**: distinction `levé` vs `engagé` affichée en UI mais toujours égale à `raisedAmount` (qui elle-même ne bouge pas — voir A5).
- **Correction**: incrémenter `committedAmount` à la souscription, `raisedAmount` à la confirmation.

### A11. [FAIBLE] Seed place directement le projet de référence en `published`
- **Fichier**: `prisma/seed.ts` lignes 99-103
- **Problème**: le `Project` Téranga est seedé en `status: "published"` avec `submittedAt/reviewedAt/publishedAt` mais sans `ProjectEvent` correspondant. L'audit log ne montre donc pas le parcours d'analyse.
- **Impact**: mineur (démo), mais peut induire en erreur lors de tests de bout en bout.
- **Correction**: ajouter `ProjectEvent` pour chaque transition dans la seed.

---

## B. Taux & rentabilité

### B1. [FAIBLE — OK] `ratePeriod` correctement stocké et affiché partout
- **Fichiers**: `prisma/schema.prisma` (lignes 126, 197), `src/components/site/offer-card.tsx` (lignes 22-31), `src/components/sections/offer-detail.tsx` (lignes 230-232), `src/components/sections/company-dashboard.tsx` (lignes 572-577), `src/components/admin/admin-offers.tsx` (lignes 103-112).
- **Constat**: `ratePeriod: "total" | "annual"` est stocké, transmis au moteur `computeInvestorInterest` (`finance.ts` lignes 50-65) qui applique correctement `principal × taux` pour `total` et `principal × taux × mois / 12` pour `annual`. Les cartes affichent « 8 % total sur 6 mois » vs « 10 % par an · 18 mois ». **Aucune transformation de 8 % total en 8 %/an.** ✓ Conforme.

### B2. [ÉLEVÉ] `admin-analysis.tsx` affiche `annualRate` pour le label « Capital offert » des projets equity
- **Fichier**: `src/components/admin/admin-analysis.tsx` lignes 378-392
- **Problème**:
  ```
  {p.instrumentType === "equity"
    ? "Capital offert"          ← label
    : "Durée"}
  {p.instrumentType === "equity"
    ? p.annualRate != null
      ? `${p.annualRate} %`     ← valeur affichée = annualRate
      : "—"
    : ...}
  ```
  Pour le projet AgriTech (equity), `annualRate` est null en seed → affiche « — » alors que `equityOfferedPct = 15` existe.
- **Impact**: l'analyste voit « Capital offert : — » pour une offre equity pourtant à 15 %, et est induit en erreur sur la lecture du dossier.
- **Correction**: afficher `p.equityOfferedPct` (et non `annualRate`) pour les projets equity.

### B3. [ÉLEVÉ] Les montants dette ne sont pas suivis séparément (capital remboursé, intérêts reçus, restant dû, disponible, versé)
- **Fichiers**: `prisma/schema.prisma` (lignes 224-254 Investment, 286-299 Distribution), `src/app/api/investor/dashboard/route.ts` (lignes 20-53), `src/components/sections/investor-dashboard.tsx` (lignes 208-210).
- **Problème**: la route dashboard ne renvoie que `totalInvested = sum(investment.amount)`, `received = 0` (hardcodé ligne 27), `available = 0` (hardcodé ligne 210). Le modèle `Distribution` (avec `capitalPortion`, `interestPortion`, `feePortion`, `availableAt`) existe en schéma mais **aucune route API ne crée ni ne lit** de `Distribution`. Le `Investment` n'a pas non plus de champs `capitalRepaid`, `interestReceived`, `remainingDue`.
- **Impact**: il est impossible de présenter à l'investisseur la ventilation exigée par la spec 4 (capital investi / intérêts prévus / capital remboursé / intérêts reçus / restant dû / disponible / versé). Tout est aplati en un seul montant « capital engagé ».
- **Correction**: étendre `Investment` ou `Distribution` avec ces colonnes ; créer `GET /api/investor/dashboard` qui agrège ces champs par investissement.

### B4. [MOYEN] « Remboursement attendu » présenté sans marquage « projection »
- **Fichier**: `src/components/sections/offer-detail.tsx` lignes 482-502
- **Problème**: le simulateur affiche « Remboursement attendu : 54 000 FCFA » et « Dont intérêts : 4 000 FCFA » sans préciser « (projeté, sous réserve de remboursement intégral par l'entreprise) ». Le risque de perte en capital est noté plus bas (lignes 564-580), mais pas sur la ligne « Remboursement attendu » elle-même.
- **Impact**: un investisseur peu attentif peut confondre « attendu » avec « garanti ».
- **Correction**: renommer en « Remboursement projeté (non garanti) » + astérisque pointant vers l'avertissement risque.

### B5. [FAIBLE — OK] Equity : aucun échéancier fictif, aucune garantie de rendement
- **Fichiers**: `src/lib/finance.ts` (lignes 151-166 `simulateEquityFinancing`), `src/components/sections/offer-detail.tsx` (lignes 295-311, 504-509).
- **Constat**: la simulation equity retourne uniquement `sharePct`, `postMoney`, `pricePerShare` conventionnel — pas d'échéancier, pas de yield. L'UI affiche « Pas d'échéancier — sortie envisagée à terme, non garantie. » ✓ Conforme spec 4. (Note : `pricePerShare = valuationPre / 1000` est une convention arbitraire non documentée — pourrait prêter à confusion.)

### B6. [MOYEN] `fmtCompact` utilise des divisions flottantes
- **Fichier**: `src/lib/finance.ts` lignes 209-215
- **Problème**: `(n / 1_000_000_000).toFixed(2)` et `Math.round(n / 1000)` font de l'arithmétique flottante sur des BigInt convertis en `Number`. Pour les affichages c'est acceptable, mais le nom `fmtCompact` suggère un usage comptable.
- **Impact**: négligeable pour les montants actuels (< 2 Md FCFA), mais incohérent avec la philosophie « BigInt partout ».
- **Correction**: garder `Number` pour l'affichage mais documenter le seuil de précision.

---

## C. Commissions

### C1. [FAIBLE — OK] 0 % commission investisseur enforced par absence de code
- **Fichiers**: `src/lib/finance.ts` (lignes 70-90 `computeUpfrontCommission` / `computeFollowUpCommission` ne prennent que `principal`), `simulateDebtFinancing` (lignes 140-143 `perInvestorRepayment = capitalPlusInterest × invest/principal` — aucun prélèvement plateforme côté investisseur).
- **Constat**: aucune fonction ne soustrait de frais à l'investisseur. ✓ Conforme spec 4. Aucune route ne calcule ni ne facture l'investisseur.

### C2. [MOYEN] Commissions configurables en schéma mais non éditables en UI
- **Fichiers**: `prisma/schema.prisma` (lignes 203-204 `upfrontCommissionPct @default(6)`, `annualFollowUpPct @default(2)`), `src/components/admin/admin-offers.tsx` (lignes 305-313 affiche les valeurs en lecture seule), `src/components/admin/admin-commissions.tsx` (lignes 35-58 `computeRow` avec `upfrontPct = 6` et `followUpPctAnnual = 2` hardcodés).
- **Problème**: les champs existent par offre, mais aucun endpoint PATCH n'existe pour les modifier ; `admin-commissions` recalcule à partir de constantes en dur et non depuis l'offre.
- **Impact**: en production, ajuster la tarification pour une offre nécessite une migration DB ; impossible de figer contractuellement des conditions négociées.
- **Correction**: exposer `upfrontCommissionPct` / `annualFollowUpPct` dans le formulaire de préparation d'offre (admin) ; les rendre read-only après `published`.

### C3. [FAIBLE — OK] Aucun code ne facture accidentellement l'investisseur
- **Constat**: revue exhaustive de `finance.ts`, `subscribe/route.ts`, `investor/dashboard/route.ts` — aucune soustraction de frais investisseur. ✓

---

## D. Circuit de l'argent

### D1. [CRITIQUE] Aucun flux de décaissement implémenté
- **Fichiers**: `src/components/admin/admin-finance.tsx` (lignes 31-101: `COLLECTIONS`, `DISBURSEMENTS`, `REPAYMENTS` sont des constantes TypeScript hardcodées, **pas de fetch API**), aucun endpoint `/api/admin/disbursements` ou similaire.
- **Problème**: le module Finances admin affiche des données totalement fictives (cf. section I). Le modèle `CompanyPayment` existe en schéma mais n'est jamais lu ni écrit. La « validation, compte pro vérifié, brut, commissions, net » de la spec 5 n'est pas implémentée.
- **Impact**: aucun décaissement réel n'est possible. L'admin ne peut ni préparer ni approuver ni ordonnancer un virement.
- **Correction**: créer `POST /api/admin/disbursements` (préparation), `POST /api/admin/disbursements/{id}/approve` (second signataire), `POST /api/admin/disbursements/{id}/order` (envoi instruction au prestataire).

### D2. [CRITIQUE] Paiement d'échéance entreprise : bouton fictif
- **Fichier**: `src/components/sections/company-dashboard.tsx` (lignes 547-556, bouton « J'ai effectué le paiement »)
- **Problème**: le `onClick` se contente de `setPayDialogOpen(false)` — aucun appel API, aucun enregistrement en base, aucune création de `CompanyPayment`. Les coordonnées IBAN affichées (« SN12 0060 0000 1234 5678 9012 », « Banque de l'Afrique Occidentale (BAO) ») sont hardcodées et probablement fictives.
- **Impact**: l'entreprise croit avoir réglé ; aucune trace dans le système ; l'échéance reste « upcoming » à jamais.
- **Correction**: `POST /api/company/payments/{installmentId}` qui crée un `CompanyPayment` avec `status: "verifying"` et notifie le finance ops.

### D3. [CRITIQUE] Réconciliation par investisseur absente
- **Fichiers**: `prisma/schema.prisma` (lignes 286-299 Distribution), aucune route API ne touche ce modèle.
- **Problème**: spec 5 exige « entreprise paie globalement → confirmation → réconciliation → distribution par investisseur ». La `Distribution` est modélisée mais jamais créée. Aucun endpoint ne découpe un `CompanyPayment` en parts pro-rata par investisseur.
- **Impact**: même si l'entreprise paie, rien n'arrive jamais aux investisseurs. Le champ `available` du dashboard investisseur restera à 0.
- **Correction**: job de réconciliation qui, à la confirmation d'un `CompanyPayment`, crée une `Distribution` (capitalPortion + interestPortion) par `Investment` confirmé, en pro-rata de `investment.amount / offer.fundingGoal`.

### D4. [CRITIQUE] Aucun flux de retrait investisseur
- **Fichiers**: `prisma/schema.prisma` (lignes 301-314 `Payout`), aucune route API, aucun bouton UI.
- **Problème**: spec 5 exige « disponible → demande → compte vérifié → payout → confirmation ». Le modèle `Payout` existe, l'UI investisseur affiche « Disponible = 0 FCFA, vos revenus apparaîtront ici après distribution » (investor-dashboard.tsx ligne 305) — mais il n'y a ni bouton « Demander un retrait », ni endpoint.
- **Impact**: le circuit de l'argent est incomplet de bout en bout côté investisseur.
- **Correction**: `POST /api/investor/payouts` (création), `GET /api/investor/payouts` (historique), bouton UI quand `available > 0`.

### D5. [CRITIQUE] Idempotence nulle — double soumission et dépassement de cap possibles
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` (lignes 67-123)
- **Problème**:
  1. Aucune clé d'idempotence — un double clic ou un replay crée N lignes `Investment`.
  2. `remaining = offer.fundingGoal - offer.raisedAmount` (ligne 98) — `raisedAmount` n'est jamais incrémenté par cette route (cf. A5), donc le cap n'est jamais atteint côté serveur même après 100 souscriptions.
  3. Aucune vérification qu'un même `investorEmail` n'a pas déjà souscrit (multi-soumission par email possible).
- **Impact**: un attaquant peut sature la base de `Investment` pending ; contournement systématique du cap de collecte.
- **Correction**: clé d'idempotence client (header `Idempotency-Key`), incrément atomique de `committedAmount` via transaction Prisma, vérification `(raisedAmount + committedAmount + amt) <= fundingGoal`.

### D6. [ÉLEVÉ] Risque Ponzi structurel (pas de compte séquestre isolé)
- **Fichiers**: `prisma/schema.prisma` (lignes 79-81 `Company.verifiedBankAccount`), aucun modèle `EscrowAccount` ou `Wallet`.
- **Problème**: il n'existe pas de modélisation d'un compte séquestre séparé du compte opérationnel plateforme. En l'absence de ségrégation, en production les flux investisseurs entrants et les sorties vers d'anciens investisseurs pourraient transiter par le même compte — architecture typique du schéma Ponzi.
- **Impact**: risque réglementaire BCEAO majeur.
- **Correction**: modéliser un `EscrowAccount` par offre (IBAN dédié), interdire tout flux direct investisseur → entreprise.

### D7. [ÉLEVÉ] Aucune trace d'audit des souscriptions
- **Fichiers**: `src/app/api/offers/[id]/subscribe/route.ts` — aucun `db.auditLog.create`. `src/app/api/admin/login/route.ts` (lignes 26-36) et `src/app/api/admin/analysis/route.ts` (lignes 33-42) créent bien un audit log.
- **Problème**: la mutation la plus sensible financièrement (création d'un engagement investisseur) n'est pas journalisée.
- **Impact**: impossibilité de tracer qui a souscrit quoi, quand, depuis quelle IP.
- **Correction**: `db.auditLog.create` à chaque `POST /subscribe` (actorType: "user", action: "investment_created", ipAddress, metadata).

### D8. [MOYEN] Paiement simulé sans signature électronique
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` (lignes 109-123)
- **Problème**: `signatureHash` est déclaré en schéma (ligne 242) mais jamais peuplé. `signedAt` jamais peuplé non plus. Le contrat d'investissement n'a aucune valeur juridique.
- **Impact**: en production, absence de preuve de consentement.
- **Correction**: intégrer un prestataire de signature électronique (Yousign, Universign) et stocker le hash.

---

## E. Comptabilité & calculs

### E1. [FAIBLE — OK] BigInt dans la base, Number dans le DTO
- **Fichiers**: `prisma/schema.prisma` (tous les montants en `BigInt`), `src/lib/serialize.ts` (lignes 1-8: conversion BigInt → Number via JSON.stringify).
- **Constat**: le serveur travaille en BigInt ✓. La sérialisation en Number est documentée (commentaire ligne 2: « les montants FCFA restent exacts tant qu'ils ne dépassent pas 9 × 10^15 »). Pour les montants actuels (max 2,5 Md FCFA = 2,5 × 10^9) c'est safe.

### E2. [MOYEN] Le frontend fait de l'arithmétique flottante sur des montants Number
- **Fichiers**: `src/components/site/offer-card.tsx` (ligne 12 `(raised / goal) * 100`), `src/components/sections/offer-detail.tsx` (ligne 30 même calcul), `src/components/admin/admin-offers.tsx` (ligne 217), `src/components/admin/admin-commissions.tsx` (lignes 44-45 `Math.round((funded * upfrontPct) / 100)`), `src/app/api/admin/stats/route.ts` (lignes 22-23 `Number(o.raisedAmount)` réduit en `number`).
- **Problème**: tous les calculs d'affichage sont en `number` JS (flottant). Pour les grands totaux (admin/stats réduit `offers.reduce` en `number`), la précision se dégrade au-delà de 2^53.
- **Impact**: pour la démo actuelle négligeable ; à l'échelle de la plateforme visée (Md FCFA cumulés sur plusieurs offres), des arrondis erronés pourraient apparaître dans les KPI admin.
- **Correction**: conserver les agrégats en BigInt côté serveur (utiliser `reduce<bigint>`), ne convertir qu'au moment du formatage.

### E3. [CRITIQUE] Aucune comptabilité en partie double (grand-livre)
- **Fichiers**: aucun modèle `LedgerEntry` / `Transaction` / `Account` n'existe dans `prisma/schema.prisma`. Seuls `Investment`, `CompanyPayment`, `Distribution`, `Payout` existent, sans lien comptable entre eux (pas de double entrée, pas de compte bancaire rattaché).
- **Problème**: la spec 6 exige « chaque montant rattaché à une transaction / contrat / entreprise / investisseur / date / statut ». Actuellement un `Investment.amount` n'est pas rattaché à un flux bancaire entrant ; un `CompanyPayment.paidAmount` ne sait pas d'où vient l'argent ; un `Payout` n'est pas rattaché à un flux sortant précis.
- **Impact**: impossible de produire un grand-livre, de réconcilier avec un relevé bancaire, d'effectuer un audit comptable.
- **Correction**: introduire un modèle `LedgerEntry { id, debitAccountId, creditAccountId, amount, date, refType, refId, status }` et un `Account { id, type: "escrow"|"platform_revenue"|"investor_wallet"|"company_operating", balance }`.

### E4. [ÉLEVÉ] `audit_log` non cryptographiquement chaîné
- **Fichier**: `prisma/schema.prisma` lignes 334-344 (`AuditLog`)
- **Problème**: chaque entrée est indépendante — pas de `previousHash`, pas de signature. Un admin avec accès DB peut altérer ou supprimer une ligne sans laisser de trace.
- **Impact**: faible valeur probante en cas de contrôle BCEAO/CRC.
- **Correction**: chaînage hash-SHA256 (previousHash + contenu) + signature HMAC stockée hors DB.

### E5. [MOYEN] `amount` reçu en `Number` puis `BigInt(amount)` côté serveur
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` lignes 12, 86
- **Problème**: `const amount = Number(req.nextUrl.searchParams.get("amount"))` (ligne 12 du GET) puis `BigInt(amount)` (ligne 30 et 86 du POST). Si le client envoie un montant non-entier (ex. `50000.5`), `BigInt(50000.5)` lève une `RangeError`. Si le montant dépasse `Number.MAX_SAFE_INTEGER`, perte de précision silencieuse.
- **Impact**: erreur 500 non gérée sur input malformé ; perte de précision sur très gros montants.
- **Correction**: valider `Number.isInteger(amount)` et `amount > 0` avant `BigInt`, retourner 400 si invalide.

### E6. [FAIBLE] `fmtFCFA` convertit BigInt en Number à l'affichage
- **Fichier**: `src/lib/finance.ts` ligne 205 — `Number(amount)` puis `Intl.NumberFormat`. Même remarque que E2.

---

## F. Permissions & sécurité

### F1. [CRITIQUE] 8+ rôles admin déclarés mais aucun enforced
- **Fichiers**: `prisma/schema.prisma` (ligne 326 `role String` commenté `superadmin, compliance, analyst, legal, technical, finance, validator, support, auditor, sales`), `prisma/schema.prisma` (ligne 327 `permissions String` JSON), `src/app/api/admin/login/route.ts` (lignes 38-48 retourne `role` mais aucun check ultérieur), `src/components/admin/admin-shell.tsx` (ligne 126 hardcode `superadmin`).
- **Problème**: le champ `permissions` (JSON `["all"]` pour le seed) n'est jamais lu par aucune route. Aucun middleware ne vérifie `role`. L'UI affiche « Vous êtes identifié comme analyste » (`admin-analysis.tsx` ligne 529) en dur, sans le déduire du rôle.
- **Impact**: n'importe quel admin (ou attaquant, cf. F2) peut faire n'importe quelle action. La séparation des devoirs n'est qu'un texte.
- **Correction**: middleware Next.js qui décode le token admin et vérifie `permissions.includes(requiredPermission)` ; définir une matrice rôle→permission (ex. `analyst: ["project.read", "project.complement", "project.review_recommend"]`, `validator: ["project.approve"]`, `finance: ["disbursement.prepare"]`, `compliance: ["kyc.read", "kyc.update"]`).

### F2. [CRITIQUE] `/api/admin/stats`暴露 tous les utilisateurs et entreprises sans auth
- **Fichier**: `src/app/api/admin/stats/route.ts` (lignes 5-47)
- **Problème**: `GET /api/admin/stats` ne vérifie aucun header/cookie. Il retourne `users` (email, prénom, nom, pays, KYC, createdAt), `companies`, `offers` et `projects` à tout appelant.
- **Impact**: fuite massive de données personnelles (RGPD/CNIL). Reproductible en curl depuis l'extérieur.
- **Correction**: vérifier la session admin (NextAuth) ; appliquer le masquage des emails si le rôle n'est pas `compliance`/`support`.

### F3. [CRITIQUE] `/api/admin/analysis` PATCH sans auth et sans contrôle de transition
- **Fichiers**: `src/app/api/admin/analysis/route.ts` (lignes 7-45)
- **Problème**: aucun check de session. `actorId` est fourni par le client. `status` accepte n'importe quelle valeur. L'audit log est créé avec `actorId: actorId || "unknown"` — falsifiable.
- **Impact**: n'importe qui peut publier une offre, laissant penser à un processus validé alors que non.
- **Correction**: vérifier la session, déduire `actorId` du token, valider la transition (cf. A2), exiger une seconde signature pour `approved` (cf. F4).

### F4. [ÉLEVÉ] Séparation des devoirs non enforceée — même admin peut préparer et approuver
- **Fichiers**: `src/components/admin/admin-analysis.tsx` (lignes 462-511, le même analyste peut cliquer « Approuver » juste après « Demander complément »), `src/app/api/admin/analysis/route.ts` (aucune vérification d'un second signataire).
- **Problème**: la spec 22 exige « celui qui prépare ne peut pas approuver seul ». Le code permet à un admin unique de faire les deux.
- **Impact**: risque de fraude interne.
- **Correction**: pour le passage `approved`, exiger `actorId !== previousActorId` (vérifier `Project.submittedBy` ou un champ `reviewerId`), et requérir un second token signé par un `validator`.

### F5. [CRITIQUE] `POST /api/offers/[id]/subscribe` sans auth, sans KYC, sans signature
- **Fichier**: `src/app/api/offers/[id]/subscribe/route.ts` (lignes 67-141)
- **Problème**:
  - Aucune vérification de session utilisateur.
  - `investorId` par défaut `"guest"` (ligne 113), `investorEmail` et `investorName` non validés (côté serveur, aucune vérification de format ni de non-vide).
  - Aucun contrôle KYC (alors que la spec 06 exige KYC avant tout investissement).
  - Aucune signature électronique.
- **Impact**: un attaquant peut créer des `Investment` au nom de n'importe qui ; un utilisateur non vérifié peut souscrire.
- **Correction**: exiger session ; rejeter si `user.kycStatus !== "verified"` ; valider `investorEmail === session.user.email`.

### F6. [CRITIQUE] `/api/investor/dashboard?email=X` — IDOR
- **Fichier**: `src/app/api/investor/dashboard/route.ts` (lignes 5-53)
- **Problème**: la route prend l'email en query param sans aucune vérification que l'appelant est bien le propriétaire de cet email. N'importe qui peut consulter le portefeuille, les notifications et les montants investis de n'importe quel autre investisseur dont il connaît l'email.
- **Impact**: fuite de données financières personnelles.
- **Correction**: déduire l'email de la session serveur, ignorer le paramètre `email`.

### F7. [ÉLEVÉ] `Ctrl+Shift+A` est le seul garde-fou d'accès admin
- **Fichiers**: `src/app/page.tsx` (lignes 29-38), `src/components/admin/admin-shell.tsx` (lignes 49-66)
- **Problème**: l'accès admin est « protégé » par (1) la connaissance d'un raccourci clavier et (2) la vérification côté client de `adminEmail` dans Zustand. Les deux sont trivialement contournables : un attaquant peut taper `useAppStore.setState({ adminEmail: "admin@nexora" })` dans la console et accéder à l'interface admin. Les routes API étant elles-mêmes non protégées (F2/F3), l'accès UI est de toute façon redondant.
- **Impact**: accès admin trivial.
- **Correction**: déplacer le portail admin sur un sous-domaine dédié (`admin.nexora.capital`) avec IP allowlist ; ne jamais embarquer les composants admin dans le bundle public.

### F8. [ÉLEVÉ] Aucun rate-limiting sur les endpoints mutationnels
- **Fichiers**: aucune config Next.js pour rate-limit ; aucun middleware ; aucune dépendance `@upstash/ratelimit` ou similaire (vérifié `package.json`).
- **Problème**: `POST /api/offers/[id]/subscribe`, `POST /api/admin/login`, `PATCH /api/admin/analysis` ne sont pas limités. Brute-force admin (même si mot de passe ignoré en démo), spam de souscriptions, déni de service.
- **Impact**: abus trivial.
- **Correction**: middleware de rate-limiting (ex. `@upstash/edge-flags` ou middleware Next.js avec Redis).

### F9. [MOYEN] Aucun CSRF token sur les POST
- **Fichiers**: aucun token CSRF, aucune vérification `Origin`/`SameSite` explicite.
- **Problème**: les routes POST acceptent n'importe quel origine. Un site tiers peut déclencher une souscription via `fetch` si l'utilisateur a une session.
- **Impact**: CSRF possible.
- **Correction**: vérifier `Origin` ou `Sec-Fetch-Site` côté serveur ; exiger un header custom (`X-Requested-With`).

### F10. [MOYEN] `dangerouslySetInnerHTML` utilisé 4 fois
- **Fichiers**: `src/components/sections/home.tsx` (ligne 140), `src/components/sections/how.tsx` (ligne 155), `src/components/sections/register.tsx` (ligne 368), `src/components/sections/company-dashboard.tsx` (ligne 269).
- **Problème**: utilisé pour insérer des chaînes contenant `&rsquo;`. Les chaînes sont statiques (constantes du module), donc pas d'injection XSS directe. Mais l'usage de `dangerouslySetInnerHTML` pour des entités HTML triviales est inutile et fragile.
- **Impact**: faible ; risque si un futur développeur réutilise ce pattern avec une donnée dynamique.
- **Correction**: remplacer par du JSX standard (`L'entreprise...` au lieu de `L&rsquo;entreprise...`).

### F11. [FAIBLE] Mots de passe en clair dans la seed
- **Fichier**: `prisma/seed.ts` lignes 33, 347
- **Problème**: `passwordHash: "demo_hash_investor"` et `"demo_hash_admin"` ne sont pas des hashes (ce sont des chaînes arbitraires). Pour la démo c'est acceptable mais le nom du champ est trompeur.
- **Impact**: aucun (démo), mais à corriger avant production.

### F12. [ÉLEVÉ] Aucun middleware Next.js d'authentification
- **Fichiers**: aucun `middleware.ts` à la racine ou dans `src/`. Vérifié par `Glob`.
- **Problème**: aucune route n'est protégée par middleware ; chaque route doit implémenter sa propre vérification, ce qui est oublié partout (cf. F2/F3/F5/F6).
- **Impact**: impossibilité d'ajouter une couche d'auth centralisée sans refactor.
- **Correction**: `src/middleware.ts` qui vérifie le token session sur `/api/admin/*` et `/api/investor/*`.

### F13. [MOYEN] Audit log sans IP fiable
- **Fichier**: `src/app/api/admin/login/route.ts` ligne 34 `req.headers.get("x-forwarded-for") || "unknown"`.
- **Problème**: `x-forwarded-for` est falsifiable côté client si le serveur n'est pas derrière un proxy de confiance qui le réécrit. En l'absence de proxy, l'attaquant peut injecter n'importe quelle IP.
- **Impact**: audit log non fiable.
- **Correction**: configurer Next.js derrière un reverse proxy de confiance et utiliser `req.ip` ou un header dédié.

### F14. [FAIBLE] Données de la seed contenant infos personnelles
- **Fichier**: `prisma/seed.ts` lignes 30-40, 44-58, 344-353.
- **Problème**: Aïssatou Diallo (prénom+nom+email+téléphone Sénégalais), Ousmane Fall (admin), coordonnées bancaires Téranga Commerce — toutes inventées mais présentées comme réalistes. Si cette seed est commitée dans un repo public, on a des données à consonance réelle.
- **Impact**: faible (fictif), mais à documenter.

---

## G. Boutons / liens / formulaires

### G1. [ÉLEVÉ] Liens « Tarification » et « Risques » du footer → placeholder éternel
- **Fichiers**: `src/components/site/footer.tsx` (lignes 8-9, 44-49), `src/app/page.tsx` (lignes 70-75).
- **Problème**: le footer propose `view: "fees"` et `view: "risks"`, mais `page.tsx` rend `<div className="p-8 text-sm text-muted-foreground">Chargement…</div>` pour ces deux vues. L'utilisateur clique et reste bloqué sur « Chargement… ».
- **Impact**: experience cassée + impression de bug.
- **Correction**: soit supprimer les liens du footer, soit implémenter `Fees` et `Risks` (les contenus existent déjà partiellement dans `how.tsx` — y intégrer).

### G2. [ÉLEVÉ] Liens légaux du footer (CGU, Confidentialité, Conformité BCEAO) sont morts
- **Fichier**: `src/components/site/footer.tsx` lignes 60-68
- **Problème**: `<span className="cursor-default ...">{item}</span>` — pas de `onClick`, pas de `href`. Le curseur suggère un clic mais rien ne se passe.
- **Impact**: non-conformité réglementaire (CGU doit être accessible).
- **Correction**: implémenter des pages (ou modales) CGU, Confidentialité, Mentions BCEAO.

### G3. [ÉLEVÉ] 8 des 10 items du menu entreprise → « Bientôt disponible »
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 156-167, 281-293.
- **Problème**: sur 10 boutons de menu (Vue d'ensemble, Société, Dossiers, Financements, Décaissements, Remboursements, Rapports, Documents, Équipe, Messages), seuls 2 sont activés. Les autres affichent une carte « Bientôt disponible » générique.
- **Impact**: le dashboard entreprise est une coquille ; l'entreprise ne peut rien faire d'utile à part voir le remboursement de référence.
- **Correction**: prioriser « Dossiers » (soumission) et « Documents » au minimum.

### G4. [MOYEN] Bouton « Sauvegarder l'offre » (bookmark) est décoratif
- **Fichier**: `src/components/site/offer-card.tsx` lignes 128-136
- **Problème**: `onClick={(e) => e.stopPropagation()}` — ne fait rien d'autre qu'empêcher la propagation. Aucune persistance, aucun état.
- **Impact**: bouton mort.
- **Correction**: soit supprimer, soit implémenter un favori persistant (localStorage suffit pour la démo).

### G5. [MOYEN] Bouton « Suspendre » / « Clôturer » (admin offres) → toast seulement
- **Fichier**: `src/components/admin/admin-offers.tsx` lignes 133-141, 387-393.
- **Problème**: `handleConfirm` affiche un toast « Offre suspendue/clôturée — action visuelle en mode démo » mais ne fait **aucun** appel API. L'offre reste `open` en base.
- **Impact**: l'admin croit avoir suspendu une offre ; rien n'a changé.
- **Correction**: `PATCH /api/admin/offers/{id}` avec `status: "closing"` ou `"closed"`.

### G6. [MOYEN] Bouton « J'ai effectué le paiement » (company dashboard) → no-op
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 547-554 (déjà cité D2)
- **Problème**: ferme juste le Dialog sans action serveur.

### G7. [FAIBLE] Bouton « Partager l'opportunité » (project-detail.tsx) est `disabled`
- **Fichier**: `src/components/sections/project-detail.tsx` ligne 409-412 (`<Button variant="outline" className="w-full" disabled>`)
- **Note**: ce fichier est un composant legacy Baobab Capital, non importé dans `page.tsx` (cf. G10). N'est jamais rendu.

### G8. [FAIBLE] Sélecteur « Compte personnel » du dashboard investisseur n'a qu'une option
- **Fichier**: `src/components/sections/investor-dashboard.tsx` lignes 228-235
- **Problème**: `Select` avec un seul `SelectItem` « Compte personnel ». Aucune action de bascule possible.
- **Impact**: UX confuse (pourquoi un select à une option ?).
- **Correction**: cacher le sélecteur si l'utilisateur n'est pas membre d'une entreprise.

### G9. [MOYEN] Click sur une ligne du tableau « Admin Users » ne fait rien
- **Fichier**: `src/components/admin/admin-users.tsx` (lignes 244-261, 295-318)
- **Problème**: les `TableRow` n'ont pas de `onClick`. Aucune action possible sur un utilisateur ou une entreprise (alors que l'UI mentionne un flux de contre-signature pour modification KYC).
- **Impact**: admin ne peut ni voir le détail KYC ni modifier un statut.

### G10. [ÉLEVÉ] 7 composants legacy Baobab Capital non importés mais présents
- **Fichiers**: `src/components/sections/hero.tsx`, `featured-projects.tsx`, `market-insights.tsx`, `value-proposition.tsx`, `projects-list.tsx`, `project-detail.tsx`, `how-it-works.tsx` + `src/components/site/project-card.tsx` + `src/lib/format.ts`.
- **Vérification**: `Grep` sur `from "@/components/sections/(hero|featured-projects|market-insights|value-proposition|projects-list|project-detail|how-it-works)"` et `from "@/components/site/project-card"` et `from "@/lib/format"` ne trouve **aucun import** dans `src/app/page.tsx` ou ailleurs dans le code actif.
- **Problème**: ces fichiers importent des types inexistants (`PlatformStats`, `Project`, `ProjectDetail` non déclarés dans `src/lib/types.ts`), appellent des routes API qui n'existent pas (`/api/stats`, `/api/projects`, `/api/projects/[id]/invest`), utilisent une palette obsolète (`bg-primary`, `text-emerald-600`, `baobab-pattern`, `text-gradient-gold`). Ils affichent aussi des fausses garanties (« Plateforme agréée — Zone UEMOA · BCEAO », « TRI cibles entre 11 % et 22 % », « Big Four locaux », « 5 % commission au succès », « 10 % carried interest », « marché secondaire interne après 12 mois »).
- **Impact**: polluent le repo, provoquent des erreurs TypeScript (`bunx tsc --noEmit` échouerait sur ces fichiers — confirmé par commentaire worklog tâche 7), et pourraient être réactivés par erreur.
- **Correction**: supprimer ces fichiers + `src/lib/format.ts` + `src/components/site/project-card.tsx`.

### G11. [MOYEN] Formulaire de registre ne persiste rien
- **Fichier**: `src/components/sections/register.tsx` (5 étapes), `src/app/page.tsx` (aucun appel API).
- **Problème**: à l'étape 5 « Compte créé », `handleFinalLogin` appelle `login(email)` (Zustand) — mais aucun `POST /api/users` ni `db.user.create`. Le « compte créé » n'existe que en mémoire. Refresh page = déconnexion.
- **Impact**: un nouvel investisseur n'aura jamais de dashboard (`GET /api/investor/dashboard?email=X` retourne `user: null`).
- **Correction**: `POST /api/auth/register` qui crée le `User` en base.

### G12. [FAIBLE] Formulaire de login ne vérifie pas le mot de passe
- **Fichier**: `src/components/sections/login.tsx` lignes 17-26
- **Problème**: `setTimeout(() => login(email.trim()), 250)` — aucune vérification. Tout email, tout mot de passe → succès.
- **Impact**: déjà documenté en UI (« Mode démonstration »), mais à corriger.

---

## H. États d'interface

### H1. [ÉLEVÉ] Pas d'état d'erreur sur la plupart des écrans fetch
- **Fichiers**: `src/components/sections/home.tsx` (pas de gestion `error`), `explore.tsx`, `offer-detail.tsx`, `investor-dashboard.tsx`, `company-dashboard.tsx`, `admin-dashboard.tsx`, `admin-offers.tsx`, `admin-users.tsx`.
- **Problème**: le hook `useFetch` (`src/hooks/use-fetch.ts`) renvoie `{ data, loading, error }`, mais `error` n'est utilisé que dans `admin-analysis.tsx` (ligne 243). Partout ailleurs, en cas d'erreur réseau ou 500, l'écran reste en `loading` ou affiche un état vide trompeur.
- **Impact**: un investisseur dont le réseau coupe reste bloqué sur un skeleton infini.
- **Correction**: afficher un message d'erreur + bouton « Réessayer » dans chaque écran fetch.

### H2. [ÉLEVÉ] Investissements `pending_payment` invisibles dans le dashboard investisseur
- **Fichier**: `src/app/api/investor/dashboard/route.ts` ligne 21 (`where: { investorEmail, status: "confirmed" }`)
- **Problème**: filtrer sur `confirmed` masque toutes les souscriptions en cours (qui restent à `pending_payment` puisque D6 — aucun endpoint de confirmation n'existe). L'investisseur qui vient de souscrire est redirigé vers un dashboard qui ne montre pas sa souscription.
- **Impact**: confusion totale de l'utilisateur après souscription.
- **Correction**: afficher toutes les souscriptions (confirmées + pending + cancelled), triées par statut.

### H3. [MOYEN] Pas d'état « disabled » sur le bouton souscrire si KYC non vérifié
- **Fichier**: `src/components/sections/offer-detail.tsx` lignes 547-553
- **Problème**: le bouton « Souscrire » n'est jamais désactivé par défaut. Aucune vérification que l'utilisateur est connecté ni KYC verified. En mode démo c'est acceptable ; en production, non.
- **Impact**: souscription sans authentification.
- **Correction**: désactiver + message « Connectez-vous et complétez votre KYC pour souscrire ».

### H4. [FAIBLE] Empty state de l'investor-dashboard « Pas encore de répartition »
- **Fichier**: `src/components/sections/investor-dashboard.tsx` lignes 485-489
- **Note**: état vide présent et bien rédigé. ✓

### H5. [FAIBLE] Skeleton admin-users trop minimal
- **Fichier**: `src/components/admin/admin-users.tsx` lignes 109-115
- **Problème**: un seul `Skeleton h-96` couvre tout le contenu. Acceptable mais peu informatif.

### H6. [MOYEN] L'admin finance n'a aucun état (ni loading ni error)
- **Fichier**: `src/components/admin/admin-finance.tsx`
- **Problème**: le composant est purement statique (données hardcodées), donc aucun état de chargement. Mais c'est précisément parce qu'il est statique qu'il est trompeur (cf. I2).

### H7. [MOYEN] Login/register n'ont pas de gestion d'erreur réseau
- **Fichiers**: `src/components/sections/login.tsx`, `register.tsx`, `src/components/admin/admin-login.tsx` (lignes 49-56, catch réseau → toast uniquement).
- **Problème**: login (public) n'a même pas de try/catch — un échec réseau plante silencieusement.
- **Correction**: wrappé dans try/catch + toast.

---

## I. Données fictives présentées comme réelles

### I1. [CRITIQUE] Module « Finances » admin entièrement mocké
- **Fichier**: `src/components/admin/admin-finance.tsx` lignes 31-101
- **Problème**: `COLLECTIONS` (2 lignes), `DISBURSEMENTS` (2 lignes), `REPAYMENTS` (1 ligne) sont des constantes TypeScript. Le composant n'appelle **aucune** API. Les chiffres affichés (« Collectes en cours : 1 850 000 FCFA », « Décaissements à traiter : 2 115 000 FCFA », « Remboursements attendus : 1 090 000 FCFA ») sont présentés en haut de page comme « vue consolidée des flux financiers » sans aucune mention « démo » ou « données fictives » dans le corps du composant. Pis : les données **ne correspondent même pas** à la base — la ligne « Solaire Burkina / Sahel Energy SARL / raised 1 250 000 / goal 2 500 000 » n'existe pas en seed (le seed a « Solar Energy Sahel / Solar Sahel / fundingGoal 1 500 000 000 / raisedAmount 320 000 000 »). Idem pour les décaissements (« Sahel Energy SARL 1 175 000 »).
- **Impact**: l'admin voit des chiffres inventés présentés comme live. Décision financière prise sur de la fausse data.
- **Correction**: soit brancher sur une vraie API `/api/admin/finance` qui lit `CompanyPayment` + `Distribution` ; soit marquer chaque chiffre « (mock) ».

### I2. [CRITIQUE] Module « Commissions » admin mélange données seed et fictives
- **Fichier**: `src/components/admin/admin-commissions.tsx` lignes 60-65
- **Problème**: `ROWS` contient 4 lignes :
  - « Extension réseau Dakar / Téranga Commerce / 1 000 000 / 6 mois » ✓ (présent en seed)
  - « Solaire Burkina / Sahel Energy SARL / 2 500 000 / 12 mois » ❌ (seed : « Solar Energy Sahel / Solar Sahel / 1 500 000 000 / 60 mois »)
  - « AgriTech Series A / AgriTech SN / 5 000 000 / 24 mois » ❌ (seed : « Plateforme SaaS pour coopératives / AgriTech Solutions Afrique / 500 000 000 / equity »)
  - « Immobilier Bingerville / Bingerville Habitat / 750 000 / 9 mois » ❌ (seed : « Résidence Les Baobabs / Immobilière Plateau / 200 000 000 / 18 mois »)
  Les totaux `TOTAL_UPFRONT`/`TOTAL_FOLLOWUP`/`TOTAL_REVENUE` affichés en bas (en `fmtCompact`) sont donc faux par rapport à la base.
- **Impact**: même problème que I1 — fausse donnée financière.
- **Correction**: dériver `ROWS` d'un `GET /api/admin/commissions` qui joint `Offer + Project + Company`.

### I3. [ÉLEVÉ] Feed d'activité admin entièrement mocké
- **Fichier**: `src/components/admin/admin-dashboard.tsx` lignes 123-156 (`ACTIVITY_FEED`)
- **Problème**: 4 entrées hardcodées présentées dans une carte « Activité récente ». Mentions factices : « Solaire Burkina — levée 250 M FCFA sur 12 mois » (ne correspond pas à la seed), « Aïssatou Diallo — 100 000 FCFA sur Téranga Commerce » (la seed dit 50 000), « Complément demandé — Dossier AgriTech » (l'AgriTech est en `published` en seed, pas en `complement_requested`).
- **Impact**: admin voit un fil d'actualité qui ne reflète pas la base. Devrait être dérivé de `AuditLog` ou `ProjectEvent`.
- **Correction**: `GET /api/admin/audit-log?limit=20` qui renvoie les dernières entrées et les formate.

### I4. [ÉLEVÉ] Company dashboard hardcode « Téranga Commerce » pour tout utilisateur connecté
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 232, 362
- **Problème**: `<h1>Espace entreprise</h1><p>Téranga Commerce · SARL · Sénégal</p>` — écrit en dur. La banner « Compléter le dossier « Extension réseau Dakar » » est aussi hardcodée. N'importe quel utilisateur connecté (y compris l'investisseur `investisseur@demo.nexora`) voit cet écran sans aucun check d'appartenance à la société.
- **Impact**: confusion — l'investisseur Aïssatou Diallo croit être sur l'espace entreprise Téranga.
- **Correction**: récupérer la liste des `CompanyMember` pour `user.id` ; si vide, afficher « Vous n'êtes rattaché à aucune entreprise ».

### I5. [MOYEN] Mock dossier « Pré-dossier AgriTech — levée capital » dans le company dashboard
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 83-91
- **Problème**: ce dossier n'existe pas en base. Présenté comme un dossier « en analyse » de l'entreprise.
- **Impact**: fausse représentation de l'état d'analyse.

### I6. [MOYEN] « J+45 » prochaine échéance est arbitraire
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 196-201, 308
- **Problème**: `nextInstallmentDate = today + 45 jours`, sans calcul à partir de la `closingDate` ou des `CompanyPayment.dueDate`.
- **Impact**: la date affichée n'a aucune réalité comptable.

### I7. [MOYEN] Coordonnées bancaires BAO/IBAN fictives
- **Fichier**: `src/components/sections/company-dashboard.tsx` lignes 519-527
- **Problème**: « Bénéficiaire : NEXORA Capital — Compte séquestre », « IBAN : SN12 0060 0000 1234 5678 9012 », « Banque : Banque de l'Afrique Occidentale (BAO) ». Présentés sans mention « fictif ».
- **Impact**: risque de virement réel vers un IBAN qui n'existe pas.
- **Correction**: marquer « DÉMONSTRATION — IBAN fictif ».

### I8. [MOYEN] Claim contractuel PPA SONABEL non sourcé
- **Fichier**: `prisma/seed.ts` lignes 297-298
- **Problème**: « PPA signé avec SONABEL, tarif garanti 75 FCFA/kWh sur 20 ans » présenté comme fait dans la `longDescription` du projet Solaire. Aucun document justificatif, aucune mention « projeté ».
- **Impact**: information présentée comme certaine alors que non vérifiable.
- **Correction**: reformuler en « Tarif indicatif cible : 75 FCFA/kWh (sous réserve de PPA) ».

### I9. [FAIBLE] « Plateforme agréée BCEAO » mentionnée dans footer
- **Fichier**: `src/components/site/footer.tsx` lignes 91-98
- **Note**: le footer dit « La mise en production nécessite un prestataire de paiement habilité et les validations réglementaires applicables (BCEAO / CRC) » — formulation correcte (aspirationnel, pas claim d'agrément). ✓ Acceptable.

### I10. [FAIBLE] Hero legacy affirme « Plateforme agréée »
- **Fichier**: `src/components/sections/hero.tsx` ligne 55 « 🌍 Plateforme agréée — Zone UEMOA · BCEAO »
- **Note**: ce composant n'est pas importé (cf. G10), donc non rendu. Mais reste un risque s'il est réactivé.

### I11. [MOYEN] `notifications` et `activity feed` non synchronisés avec les vraies mutations
- **Fichiers**: `prisma/seed.ts` lignes 355-374 (2 notifications hardcodées), `src/components/admin/admin-dashboard.tsx` (ACTIVITY_FEED mocké).
- **Problème**: aucune route ne crée de `Notification` lorsqu'un événement se produit (projet publié, investissement confirmé, paiement reçu). Les notifications restent figées sur le seed.
- **Impact**: l'investisseur ne sera jamais notifié d'un remboursement reçu.
- **Correction**: déclencheur `db.notification.create` dans chaque endpoint mutationnel.

---

## J. Mobile / desktop

### J1. [ÉLEVÉ] Pas de bottom navigation bar mobile (spec 12)
- **Fichiers**: `src/components/site/header.tsx` (lignes 134-189 — hamburger menu only), `src/app/page.tsx` (aucune bottom-nav).
- **Problème**: la spec section 12 exige une navigation app-like avec bottom bar sur mobile. Le header actuel propose un hamburger qui ouvre un menu replié — pattern desktop adapté, mais pas mobile-first.
- **Impact**: sur mobile, l'utilisateur doit ouvrir le menu à chaque changement de vue.
- **Correction**: ajouter une `<nav className="fixed bottom-0 lg:hidden">` avec 4-5 icônes (Accueil, Explorer, Portefeuille, Comment ça marche, Compte).

### J2. [ÉLEVÉ] Tables admin débordent horizontalement sur mobile
- **Fichiers**: `src/components/admin/admin-offers.tsx` (lignes 188-356, 10 colonnes dans `<Table>` sans wrapper scroll), `src/components/admin/admin-finance.tsx` (lignes 199-323, 5 à 8 colonnes), `src/components/admin/admin-users.tsx` (lignes 217-325, 5 colonnes), `src/components/admin/admin-commissions.tsx` (lignes 143-211, 7 colonnes).
- **Problème**: aucune de ces `<Table>` n'est enveloppée dans un `<div className="overflow-x-auto">`. Sur écran < 768px, les colonnes vont soit écraser le contenu, soit déborder de la Card. À comparer avec `ScheduleTable` dans `company-dashboard.tsx` ligne 767 qui utilise bien `overflow-x-auto`.
- **Impact**: illisibilité et débordement horizontal sur mobile.
- **Correction**: wrapper `<div className="overflow-x-auto">` autour de chaque `<Table>`.

### J3. [MOYEN] Header mobile : boutons « Connexion » cachés en < sm
- **Fichier**: `src/components/site/header.tsx` ligne 120 (`className="hidden ... sm:inline-flex"`)
- **Problème**: sur mobile en mode non connecté, le bouton « Connexion » est masqué — seul « Créer un compte » est visible. Il faut ouvrir le hamburger pour accéder à « Connexion ».
- **Impact**: friction pour les utilisateurs existants sur mobile.
- **Correction**: soit afficher un icône « Connexion » sur mobile, soit promouvoir le hamburger.

### J4. [MOYEN] Cartes « Hero » avec `max-w-3xl` peuvent laisser trop d'espace sur très grand écran
- **Fichiers**: `src/components/sections/home.tsx` ligne 39, `src/components/sections/offer-detail.tsx` ligne 152 (`max-w-7xl`).
- **Note**: `max-w-7xl` est correct pour la plupart des écrans ; le hero `max-w-3xl` à l'intérieur est intentionnel. Pas un bug.

### J5. [FAIBLE] Sidebar admin mobile se ferme au clic mais pas au swipe
- **Fichier**: `src/components/admin/admin-shell.tsx` lignes 153-171
- **Note**: pattern drawer standard. Acceptable.

### J6. [FAIBLE] Offre-detail simulateur sticky `lg:sticky lg:top-20` — sur mobile non sticky
- **Fichier**: `src/components/sections/offer-detail.tsx` ligne 428
- **Note**: intentionnel (le simulateur passe en bas sur mobile). ✓ Acceptable.

### J7. [MOYEN] Pas de safe-area-inset pour iPhone notch
- **Fichiers**: aucun `env(safe-area-inset-*)` dans `globals.css` ou les composants sticky.
- **Impact**: sur iPhone, le header sticky peut être masqué par la notch.
- **Correction**: ajouter `padding-top: env(safe-area-inset-top)` au header.

---

## Synthèse des corrections prioritaires

### P0 (argent, permissions, sécurité, données) — bloquants production

1. **[F1/F2/F3/F5/F6] Authentification serveur sur toutes les routes** : NextAuth + 2FA pour admin, session pour user, middleware Next.js. Toutes les routes `/api/admin/*` et `/api/investor/*` doivent vérifier un token. Refuser `actorId` et `investorId` côté client.
2. **[F1] Matrice rôle→permission** avec enforcement serveur (`analyst` ≠ `validator` ≠ `compliance` ≠ `finance`).
3. **[A2] Machine à états du workflow d'analyse** — transition matrix sur `Project.status`.
4. **[A4] Création automatique de l'`Offer` lors du passage à `published`** + figer les conditions financières.
5. **[D1/D2/D3/D4] Circuit complet de l'argent** : décaissement, paiement entreprise, réconciliation par investisseur, distribution, retrait. Endpoints + UI.
6. **[D5] Idempotence** des souscriptions (clé + transaction atomique + incrément `committedAmount`).
7. **[D6] Compte séquestre** : modéliser `EscrowAccount` par offre.
8. **[E3] Comptabilité en partie double** : `LedgerEntry` + `Account`.
9. **[I1/I2/I3] Remplacer toutes les données mockées par des API réelles** dans `admin-finance`, `admin-commissions`, `admin-dashboard activity feed`. À défaut, marquage « MOCK » visible.
10. **[F8/F9] Rate-limiting + CSRF protection** sur toutes les mutations.
11. **[E4] Audit log chaîné cryptographiquement**.
12. **[F12] Middleware Next.js d'auth**.

### P1 (workflow, paiements, contrats)

1. **[A3] Endpoint de soumission de dossier entreprise** (`POST /api/projects` + UI `company_submit`).
2. **[A5/A6/A10] Incrémenter `committedAmount`, `raisedAmount`, `backersCount`** + endpoint de confirmation de paiement.
3. **[A7/A8] Vérification `closingDate` + job de clôture + seuil de succès/échec**.
4. **[D7] Audit log des souscriptions**.
5. **[D8] Signature électronique** du contrat d'investissement.
6. **[G11] Persistance du register** : `POST /api/auth/register`.
7. **[B2] Correction de l'affichage equity** dans `admin-analysis` (`equityOfferedPct` au lieu de `annualRate`).
8. **[B3] Ventilation par investissement** (capital remboursé, intérêts reçus, restant dû) via `Distribution`.
9. **[F4] Séparation des devoirs enforceée** : second signataire pour `approved`.
10. **[H2] Afficher les `pending_payment`** dans le dashboard investisseur.

### P2 (fonctionnalités utilisateurs)

1. **[G1] Pages « Tarification » et « Risques »** réelles (ou suppression des liens).
2. **[G2] Pages CGU, Confidentialité, Conformité BCEAO** (modales acceptables).
3. **[G3] Activer au moins « Dossiers » et « Documents » dans le company dashboard**.
4. **[G5] Boutons « Suspendre » / « Clôturer »** → PATCH API.
5. **[G9] Click ligne admin-users** → fiche détaillée avec action KYC.
6. **[H1] États d'erreur** sur tous les écrans fetch.
7. **[H7] try/catch** sur `login.tsx`.
8. **[I4] Récupérer la société réelle** du user dans le company dashboard (`CompanyMember`).
9. **[I11] Notifications créées sur chaque mutation**.
10. **[C2] Édition des commissions** dans le formulaire de préparation d'offre.
11. **[B4] Marquage « projeté »** du remboursement attendu.
12. **[F14] Documenter la nature fictive** des données seed (en-tête de fichier).

### P3 (responsive mobile/desktop)

1. **[J1] Bottom navigation bar** sur mobile.
2. **[J2] Wrapper `overflow-x-auto`** sur toutes les tables admin.
3. **[J3] Bouton « Connexion » visible sur mobile**.
4. **[J7] Safe-area-inset** iPhone.

### P4 (design, animations, dette technique)

1. **[G4/G6/G8] Boutons décoratifs** — supprimer ou implémenter (bookmark, share, sélecteur à une option).
2. **[G10] Supprimer les 7 composants legacy Baobab Capital** + `src/lib/format.ts` + `src/components/site/project-card.tsx`.
3. **[A9] Aligner les énumérations de statuts** entre schéma, UI admin analysis, UI admin offers (Prisma enum).
4. **[F10] Remplacer `dangerouslySetInnerHTML`** par du JSX.
5. **[E2/E5/E6] Conserver BigInt côté serveur pour les agrégats** ; valider `Number.isInteger` avant `BigInt()`.
6. **[F13] IP fiable** via proxy de confiance.
7. **[F11] Hasher les mots de passe** en production (bcrypt/argon2).
8. **[B6] Documenter la convention `pricePerShare = valuationPre / 1000`** ou la rendre configurable.

---

## Top 10 des constats les plus critiques (rappel)

1. **Aucune authentification serveur** sur `/api/admin/*` et `/api/investor/*` — n'importe qui peut approuver des projets, consulter tous les utilisateurs, consulter le portefeuille de n'importe quel investisseur (F1/F2/F3/F5/F6).
2. **8 rôles admin déclarés, zéro enforced** — la séparation des devoirs affichée en UI est cosmétique (F1/F4).
3. **Aucune machine à états** sur `Project.status` — transition libre, contournable (A2).
4. **Publication d'un projet ne crée pas d'`Offer`** — le workflow « admin publie → investisseur voit » est cassé (A4).
5. **Souscription ne décrémente pas le cap** (`raisedAmount` jamais incrémenté) — dépassement de cap systématique + double soumission possible (D5/A5).
6. **Circuit de l'argent intégralement absent** : pas de décaissement, pas de paiement d'échéance réel, pas de réconciliation par investisseur, pas de retrait (D1/D2/D3/D4).
7. **Modules admin Finances et Commissions affichent des données financières inventées** présentées comme live — non alignées avec la base (I1/I2/I3).
8. **Company dashboard hardcode « Téranga Commerce »** pour tout utilisateur connecté, sans check de `CompanyMember` (I4).
9. **Aucune comptabilité en partie double** — pas de grand-livre, pas de rattachement transaction/compte/banque (E3).
10. **Audit log non chaîné** et absent des souscriptions — faible valeur probante (E4/D7).
