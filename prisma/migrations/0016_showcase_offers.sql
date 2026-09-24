-- Données de démonstration publiques, déterministes et sans accès utilisateur.
-- Elles permettent de présenter un marché vivant sans toucher aux comptes réels.

INSERT OR IGNORE INTO "User" (
  "id", "email", "passwordHash", "firstName", "lastName", "country",
  "language", "consentMarketing", "kycStatus", "twoFactorEnabled", "createdAt", "updatedAt"
) VALUES (
  'showcase-user', 'showcase@nexora.invalid', 'disabled', 'Équipe', 'Démonstration', 'SN',
  'fr', 0, 'verified', 0, '2026-09-01T09:00:00.000Z', '2026-09-01T09:00:00.000Z'
);

INSERT OR IGNORE INTO "Company" (
  "id", "legalName", "tradeName", "legalForm", "country", "address", "registrationNo",
  "taxId", "activity", "foundedYear", "verificationStatus", "verifiedAt",
  "verifiedBankAccount", "bankAccountVerifiedAt", "createdAt", "updatedAt"
) VALUES
  (
    'showcase-company-sunu', 'Sunu Énergie Décentralisée SA', 'Sunu Énergie', 'SA', 'CI',
    'Zone industrielle de Vridi, Abidjan', 'CI-ABJ-2021-B-41082', 'CI-NE-4810227-K',
    'Solutions solaires et équipements énergétiques', 2018, 'verified', '2026-08-18T10:00:00.000Z',
    'Compte professionnel vérifié', '2026-08-18T10:00:00.000Z', '2026-08-01T09:00:00.000Z', '2026-09-01T09:00:00.000Z'
  ),
  (
    'showcase-company-naya', 'Naya Froid et Logistique SARL', 'Naya Logistique', 'SARL', 'SN',
    'Pôle urbain de Diamniadio, Dakar', 'SN-DKR-2020-B-28917', 'NINEA-009381725',
    'Chaîne du froid et logistique alimentaire', 2020, 'verified', '2026-08-20T10:00:00.000Z',
    'Compte professionnel vérifié', '2026-08-20T10:00:00.000Z', '2026-08-02T09:00:00.000Z', '2026-09-01T09:00:00.000Z'
  ),
  (
    'showcase-company-kora', 'Kora Santé Industries SAS', 'Kora Santé', 'SAS', 'BJ',
    'Zone économique spéciale de Glo-Djigbé, Abomey-Calavi', 'BJ-RCCM-2022-B-17304', 'IFU-3202201876441',
    'Fabrication de consommables médicaux', 2019, 'verified', '2026-08-22T10:00:00.000Z',
    'Compte professionnel vérifié', '2026-08-22T10:00:00.000Z', '2026-08-03T09:00:00.000Z', '2026-09-01T09:00:00.000Z'
  );

INSERT OR IGNORE INTO "Project" (
  "id", "companyId", "submittedBy", "title", "description", "longDescription",
  "sector", "country", "city", "imageUrl", "instrumentType", "fundingGoal",
  "companyContribution", "annualRate", "ratePeriod", "durationMonths", "repaymentType",
  "gracePeriodMonths", "equityOfferedPct", "valuationPre", "minInvestment", "maxInvestment",
  "budgetDetail", "repaymentSource", "risksIdentified", "status", "submittedAt", "reviewedAt",
  "publishedAt", "createdAt", "updatedAt"
) VALUES
  (
    'showcase-project-sunu', 'showcase-company-sunu', 'showcase-user',
    'Mini-réseaux solaires pour commerces de proximité',
    'Déployer 24 unités solaires avec stockage afin de sécuriser l’activité de 310 commerces à Abidjan et Bouaké.',
    'Sunu Énergie assemble et maintient des solutions solaires destinées aux petites entreprises. Le programme finance les équipements, les batteries et la mise en service de vingt-quatre mini-réseaux. Les contrats clients existants couvrent une part significative de la capacité prévue et les encaissements sont mensuels.',
    'Énergie', 'CI', 'Abidjan',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1600&q=84',
    'debt', 180000000, 28000000, 11.5, 'annual', 30, 'amortized', 3, NULL, NULL, 250000, 15000000,
    'Panneaux et onduleurs : 92 M ; batteries : 48 M ; installation : 24 M ; réserve opérationnelle : 16 M.',
    'Abonnements énergétiques mensuels et contrats de maintenance pluriannuels.',
    'Variation du coût des équipements importés, rythme de raccordement et risque de retard de paiement de certains clients.',
    'funding', '2026-08-05T09:00:00.000Z', '2026-08-24T09:00:00.000Z', '2026-09-05T09:00:00.000Z',
    '2026-08-05T09:00:00.000Z', '2026-09-05T09:00:00.000Z'
  ),
  (
    'showcase-project-naya', 'showcase-company-naya', 'showcase-user',
    'Plateforme frigorifique pour les filières locales',
    'Étendre une chaîne du froid mutualisée entre producteurs, marchés urbains et réseaux de restauration au Sénégal.',
    'Naya Logistique exploite des chambres froides et une flotte légère sous température contrôlée. Le financement porte sur une nouvelle plateforme à Diamniadio, quatre véhicules et un dispositif numérique de suivi des livraisons. Des lettres d’intention ont été obtenues auprès de coopératives et de restaurateurs.',
    'Transport', 'SN', 'Dakar',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=84',
    'debt', 95000000, 17000000, 10.25, 'annual', 24, 'amortized', 2, NULL, NULL, 100000, 8000000,
    'Chambres froides : 41 M ; véhicules : 34 M ; suivi numérique : 8 M ; fonds de roulement : 12 M.',
    'Contrats de stockage, prestations de transport et abonnements logistiques récurrents.',
    'Saisonnalité des volumes, coût de l’énergie, maintenance des équipements et concentration initiale de la clientèle.',
    'funding', '2026-08-08T09:00:00.000Z', '2026-08-26T09:00:00.000Z', '2026-09-08T09:00:00.000Z',
    '2026-08-08T09:00:00.000Z', '2026-09-08T09:00:00.000Z'
  ),
  (
    'showcase-project-kora', 'showcase-company-kora', 'showcase-user',
    'Unité régionale de consommables médicaux',
    'Installer une ligne de production de consommables à usage unique pour cliniques, pharmacies et distributeurs régionaux.',
    'Kora Santé développe une production locale de consommables essentiels aujourd’hui majoritairement importés. Le projet finance une ligne semi-automatisée, le laboratoire qualité et la certification des premiers produits. L’entreprise ouvre son capital pour accélérer son déploiement dans trois pays.',
    'Industrie', 'BJ', 'Cotonou',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&q=84',
    'equity', 320000000, 65000000, NULL, NULL, NULL, NULL, NULL, 18, 1450000000, 500000, 25000000,
    'Ligne de production : 178 M ; laboratoire : 52 M ; certification : 28 M ; lancement commercial et trésorerie : 62 M.',
    'Croissance du chiffre d’affaires issue des contrats de distribution et des appels d’offres privés.',
    'Délais de certification, montée en charge industrielle, pression sur les matières premières et absence de liquidité garantie des titres.',
    'funding', '2026-08-10T09:00:00.000Z', '2026-08-29T09:00:00.000Z', '2026-09-10T09:00:00.000Z',
    '2026-08-10T09:00:00.000Z', '2026-09-10T09:00:00.000Z'
  );

INSERT OR IGNORE INTO "Offer" (
  "id", "projectId", "version", "fundingGoal", "minInvestment", "maxInvestment",
  "annualRate", "ratePeriod", "durationMonths", "repaymentType", "equityOfferedPct", "valuationPre",
  "upfrontCommissionPct", "annualFollowUpPct", "raisedAmount", "committedAmount", "backersCount",
  "publishedAt", "closingDate", "visibility", "status", "createdAt"
) VALUES
  (
    'showcase-offer-sunu', 'showcase-project-sunu', 1, 180000000, 250000, 15000000,
    11.5, 'annual', 30, 'amortized', NULL, NULL, 6, 2, 112000000, 6500000, 84,
    '2026-09-05T09:00:00.000Z', '2028-12-31T23:59:59.000Z', 'public', 'open', '2026-09-05T09:00:00.000Z'
  ),
  (
    'showcase-offer-naya', 'showcase-project-naya', 1, 95000000, 100000, 8000000,
    10.25, 'annual', 24, 'amortized', NULL, NULL, 6, 2, 43500000, 4200000, 61,
    '2026-09-08T09:00:00.000Z', '2028-12-31T23:59:59.000Z', 'public', 'open', '2026-09-08T09:00:00.000Z'
  ),
  (
    'showcase-offer-kora', 'showcase-project-kora', 1, 320000000, 500000, 25000000,
    NULL, NULL, NULL, NULL, 18, 1450000000, 6, 2, 176000000, 12000000, 109,
    '2026-09-10T09:00:00.000Z', '2028-12-31T23:59:59.000Z', 'public', 'open', '2026-09-10T09:00:00.000Z'
  );
