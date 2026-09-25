import { hasValidMagic } from "@/lib/kyc";

export const PROJECT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const PROJECT_DOCUMENT_KINDS = [
  "cover",
  "registration_document",
  "financial_statements",
  "bank_statements",
  "business_plan",
  "tax_document",
  "contract",
  "guarantee",
  "other",
] as const;

export type ProjectDocumentKind = (typeof PROJECT_DOCUMENT_KINDS)[number];

export const ESSENTIAL_PROJECT_DOCUMENTS = [
  "registration_document",
  "financial_statements",
  "bank_statements",
  "business_plan",
] as const;

export function canManageProjectDocuments(mandate: string) {
  return ["submit", "sign", "manage"].includes(mandate);
}

export function isEditableProjectStatus(status: string) {
  return ["draft", "complement_requested"].includes(status);
}

export function validateProjectFile(file: File, kind: ProjectDocumentKind): string | null {
  if (file.size < 1) return "Le fichier est vide.";
  if (file.size > PROJECT_MAX_FILE_SIZE) return "Le fichier dépasse 10 Mo.";
  const imageTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowed = kind === "cover" ? imageTypes : [...imageTypes, "application/pdf"];
  if (!allowed.includes(file.type)) {
    return kind === "cover"
      ? "La couverture doit être une image JPG, PNG ou WebP."
      : "Format non accepté. Utilisez PDF, JPG, PNG ou WebP.";
  }
  if (kind === "cover" && file.size > 5 * 1024 * 1024) return "La couverture dépasse 5 Mo.";
  return null;
}

export function hasValidProjectFileMagic(bytes: Uint8Array, contentType: string) {
  return hasValidMagic(bytes, contentType);
}
