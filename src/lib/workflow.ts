// ============================================================================
// MACHINE À ÉTATS — Workflow d'analyse des projets
// ============================================================================
// Spec section 8 : un projet ne doit jamais se retrouver dans deux états
// incompatibles. On définit ici les transitions autorisées.
// Spec section 2 : l'entreprise ne publie jamais directement.

export const PROJECT_STATUSES = [
  "draft",                 // brouillon (entreprise édite)
  "submitted",             // soumis (entreprise a cliqué "Soumettre")
  "under_review",          // en analyse (admin a pris le dossier)
  "complement_requested",  // admin demande des compléments → retour entreprise
  "rejected",              // refusé (décision finale)
  "approved",              // validé par l'analyse
  "offer_prepared",        // admin a préparé l'offre
  "offer_confirmed",       // entreprise a confirmé les conditions finales
  "published",             // publié (offre visible) — Offer créée
  "funding",               // en collecte
  "funded",                // collecte réussie
  "repaying",              // en remboursement
  "completed",             // clôturé (remboursé intégralement)
  "defaulted",             // en défaut
  "closed",                // clôturé (avec perte ou après recouvrement)
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "rejected"],
  submitted: ["under_review", "complement_requested", "rejected"],
  under_review: ["complement_requested", "approved", "rejected"],
  complement_requested: ["under_review", "rejected"],
  approved: ["offer_prepared", "rejected"],
  offer_prepared: ["offer_confirmed"],
  offer_confirmed: ["published"],
  published: ["funding", "closed"],
  funding: ["funded", "closed"],
  funded: ["repaying", "closed"],
  repaying: ["completed", "defaulted", "closed"],
  completed: ["closed"],
  defaulted: ["closed", "repaying"],
  closed: [],
  rejected: [],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

// Rôles autorisés par transition
export const TRANSITION_ROLES: Record<string, string[]> = {
  // L'entreprise soumet son propre dossier (depuis le draft)
  "draft→submitted": ["company"],
  "submitted→under_review": ["analyst", "compliance", "superadmin"],
  "submitted→complement_requested": ["analyst", "compliance", "superadmin"],
  "submitted→rejected": ["analyst", "compliance", "superadmin"],
  "under_review→complement_requested": ["analyst", "compliance", "superadmin"],
  "under_review→approved": ["analyst", "compliance", "validator", "superadmin"],
  "under_review→rejected": ["analyst", "compliance", "validator", "superadmin"],
  "complement_requested→under_review": ["company"],
  "complement_requested→rejected": ["company", "analyst", "superadmin"],
  "approved→offer_prepared": ["analyst", "superadmin"],
  "approved→rejected": ["compliance", "superadmin"],
  "offer_prepared→offer_confirmed": ["company"],
  "offer_confirmed→published": ["compliance", "validator", "superadmin"],
  "published→funding": ["system"],
  "funding→funded": ["system", "superadmin"],
  "funding→closed": ["superadmin"],
  "funded→repaying": ["finance", "superadmin"],
  "funded→closed": ["superadmin"],
  "repaying→completed": ["finance", "superadmin"],
  "repaying→defaulted": ["finance", "compliance", "superadmin"],
  "repaying→closed": ["superadmin"],
  "completed→closed": ["finance", "superadmin"],
  "defaulted→closed": ["superadmin"],
  "defaulted→repaying": ["finance", "superadmin"],
};

export function canActorTransition(
  from: string,
  to: string,
  actorRole: string
): boolean {
  if (!canTransition(from, to)) return false;
  const key = `${from}→${to}`;
  const allowed = TRANSITION_ROLES[key];
  if (!allowed) return false;
  return allowed.includes(actorRole) || actorRole === "superadmin";
}

// Vérifie si un projet peut être modifié par l'entreprise
export function isEditableByCompany(status: string): boolean {
  return ["draft", "complement_requested"].includes(status);
}

// Vérifie si une offre est visible publiquement
export function isOfferVisible(status: string): boolean {
  return ["published", "funding", "funded", "repaying", "completed"].includes(status);
}
