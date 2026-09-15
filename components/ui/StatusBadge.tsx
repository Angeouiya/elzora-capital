type Status =
  | "PENDING"
  | "CONFIRMED"
  | "VERIFIED"
  | "PAID"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "DRAFT"
  | "IN_REVIEW"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "COMPLEMENT_REQUESTED"
  | "PUBLISHED"
  | "CLOSED_SUCCESS"
  | "CLOSED_FAIL"
  | "UPCOMING"
  | "DUE"
  | "PARTIAL"
  | "LATE"
  | "EXECUTED"
  | "VERIFICATION";

const statusConfig: Record<Status, { label: string; classes: string }> = {
  PENDING: { label: "En attente", classes: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmé", classes: "bg-[#166534]/10 text-[#166534]" },
  VERIFIED: { label: "Vérifié", classes: "bg-[#166534]/10 text-[#166534]" },
  PAID: { label: "Payé", classes: "bg-[#166534]/10 text-[#166534]" },
  APPROVED: { label: "Approuvé", classes: "bg-[#166534]/10 text-[#166534]" },
  ACTIVE: { label: "Actif", classes: "bg-[#166534]/10 text-[#166534]" },
  COMPLETED: { label: "Terminé", classes: "bg-[#166534]/10 text-[#166534]" },
  REJECTED: { label: "Rejeté", classes: "bg-[#C62828]/10 text-[#C62828]" },
  CANCELLED: { label: "Annulé", classes: "bg-[#C62828]/10 text-[#C62828]" },
  FAILED: { label: "Échoué", classes: "bg-[#C62828]/10 text-[#C62828]" },
  EXPIRED: { label: "Expiré", classes: "bg-[#C62828]/10 text-[#C62828]" },
  DRAFT: { label: "Brouillon", classes: "bg-[#F5F5F3] text-[#101010]/60" },
  IN_REVIEW: { label: "En révision", classes: "bg-blue-50 text-blue-700" },
  // Dossiers projet
  SUBMITTED: { label: "Soumis", classes: "bg-blue-50 text-blue-700" },
  UNDER_REVIEW: { label: "En analyse", classes: "bg-blue-50 text-blue-700" },
  COMPLEMENT_REQUESTED: { label: "Complément demandé", classes: "bg-amber-50 text-amber-700" },
  // Offres / collecte
  PUBLISHED: { label: "Offre publiée", classes: "bg-[#EFFBDD] text-[#101010] font-medium" },
  CLOSED_SUCCESS: { label: "Collecte réussie", classes: "bg-[#166534]/10 text-[#166534]" },
  CLOSED_FAIL: { label: "Collecte échouée", classes: "bg-[#C62828]/10 text-[#C62828]" },
  // Remboursements
  UPCOMING: { label: "À venir", classes: "bg-[#F5F5F3] text-[#101010]/60" },
  DUE: { label: "À régler", classes: "bg-amber-50 text-amber-700" },
  PARTIAL: { label: "Partiel", classes: "bg-amber-50 text-amber-700" },
  LATE: { label: "En retard", classes: "bg-[#C62828]/10 text-[#C62828]" },
  // Décaissements
  EXECUTED: { label: "Exécuté", classes: "bg-[#166534]/10 text-[#166534]" },
  VERIFICATION: { label: "En vérification", classes: "bg-blue-50 text-blue-700" },
};

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status as Status] || {
    label: status,
    classes: "bg-[#F5F5F3] text-[#101010]/60",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
