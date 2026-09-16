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
  PENDING: { label: "En attente", classes: "border-amber-600/15 bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmé", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  VERIFIED: { label: "Vérifié", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  PAID: { label: "Payé", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  APPROVED: { label: "Approuvé", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  ACTIVE: { label: "Actif", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  COMPLETED: { label: "Terminé", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  REJECTED: { label: "Rejeté", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  CANCELLED: { label: "Annulé", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  FAILED: { label: "Échoué", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  EXPIRED: { label: "Expiré", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  DRAFT: { label: "Brouillon", classes: "border-[#101010]/8 bg-[#F5F5F3] text-[#101010]/60" },
  IN_REVIEW: { label: "En révision", classes: "border-blue-600/15 bg-blue-50 text-blue-700" },
  SUBMITTED: { label: "Soumis", classes: "border-blue-600/15 bg-blue-50 text-blue-700" },
  UNDER_REVIEW: { label: "En analyse", classes: "border-blue-600/15 bg-blue-50 text-blue-700" },
  COMPLEMENT_REQUESTED: { label: "Complément demandé", classes: "border-amber-600/15 bg-amber-50 text-amber-700" },
  PUBLISHED: { label: "Offre publiée", classes: "border-[#B6FF00]/45 bg-[#EFFBDD] text-[#101010]" },
  CLOSED_SUCCESS: { label: "Collecte réussie", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  CLOSED_FAIL: { label: "Collecte échouée", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  UPCOMING: { label: "À venir", classes: "border-[#101010]/8 bg-[#F5F5F3] text-[#101010]/60" },
  DUE: { label: "À régler", classes: "border-amber-600/15 bg-amber-50 text-amber-700" },
  PARTIAL: { label: "Partiel", classes: "border-amber-600/15 bg-amber-50 text-amber-700" },
  LATE: { label: "En retard", classes: "border-[#C62828]/14 bg-[#C62828]/8 text-[#C62828]" },
  EXECUTED: { label: "Exécuté", classes: "border-[#166534]/14 bg-[#166534]/8 text-[#166534]" },
  VERIFICATION: { label: "En vérification", classes: "border-blue-600/15 bg-blue-50 text-blue-700" },
};

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status as Status] || {
    label: status,
    classes: "border-[#101010]/8 bg-[#F5F5F3] text-[#101010]/60",
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
