import { hasValidMagic } from "@/lib/kyc";

export const PROJECT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const PROJECT_MAX_DOCUMENTS = 40;
export const PROJECT_MAX_GALLERY_IMAGES = 8;
export const PROJECT_DOCUMENT_KINDS = [
  "cover",
  "gallery",
  "registration_document",
  "financial_statements",
  "bank_statements",
  "business_plan",
  "tax_document",
  "contract",
  "guarantee",
  "pitch_deck",
  "financial_forecast",
  "permit_license",
  "impact_evidence",
  "other",
] as const;

export const PROJECT_MULTI_FILE_KINDS = ["gallery", "other"] as const;
export const PROJECT_INVESTOR_DOCUMENT_KINDS = [
  "pitch_deck",
  "financial_forecast",
  "permit_license",
  "impact_evidence",
] as const;

export const PROJECT_OFFICE_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
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
  const imageOnly = kind === "cover" || kind === "gallery";
  const allowed = imageOnly
    ? imageTypes
    : [...imageTypes, "application/pdf", ...PROJECT_OFFICE_CONTENT_TYPES];
  if (!allowed.includes(file.type)) {
    return imageOnly
      ? "Utilisez une image JPG, PNG ou WebP."
      : "Format non accepté. Utilisez PDF, DOCX, XLSX, JPG, PNG ou WebP.";
  }
  if (kind === "cover" && file.size > 5 * 1024 * 1024) return "La couverture dépasse 5 Mo.";
  return null;
}

export function hasValidProjectFileMagic(bytes: Uint8Array, contentType: string) {
  if (hasValidMagic(bytes, contentType)) return true;
  if (PROJECT_OFFICE_CONTENT_TYPES.includes(contentType as (typeof PROJECT_OFFICE_CONTENT_TYPES)[number])) {
    const isOpenXml =
      contentType.includes("openxmlformats") &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(bytes[2]);
    const isLegacyOffice =
      !contentType.includes("openxmlformats") &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0;
    return isOpenXml || isLegacyOffice;
  }
  return false;
}

export function isInvestorProjectDocumentKind(kind: string) {
  return PROJECT_INVESTOR_DOCUMENT_KINDS.includes(
    kind as (typeof PROJECT_INVESTOR_DOCUMENT_KINDS)[number]
  );
}
