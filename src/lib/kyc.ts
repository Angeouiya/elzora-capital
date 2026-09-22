import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SessionAdmin } from "@/lib/auth";

export const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const KYC_IDENTITY_TYPES = ["national_id", "passport", "residence_permit"] as const;
export const KYC_SOURCES_OF_FUNDS = [
  "salary",
  "business",
  "savings",
  "inheritance",
  "investment_income",
  "other",
] as const;
export const KYC_DOCUMENT_KINDS = ["identity_front", "identity_back", "proof_address"] as const;

export type KycDocumentKind = (typeof KYC_DOCUMENT_KINDS)[number];

export function getKycBucket(): R2Bucket | null {
  const env = getCloudflareContext().env as CloudflareEnv & { KYC_DOCUMENTS?: R2Bucket };
  return env.KYC_DOCUMENTS ?? null;
}

export function canReadKyc(admin: SessionAdmin): boolean {
  return (
    ["superadmin", "compliance", "auditor"].includes(admin.role) ||
    admin.permissions.includes("all") ||
    admin.permissions.includes("kyc:read") ||
    admin.permissions.includes("kyc:decide")
  );
}

export function canDecideKyc(admin: SessionAdmin): boolean {
  return (
    ["superadmin", "compliance"].includes(admin.role) ||
    admin.permissions.includes("all") ||
    admin.permissions.includes("kyc:decide")
  );
}

export function isKycSubmissionStatus(status: string): boolean {
  return ["incomplete", "rejected", "refresh"].includes(status);
}

export function cleanIdentityNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function hashIdentityNumber(userId: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${userId}:${cleanIdentityNumber(value)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeFileName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 120) || "document";
}

export function validateKycFile(file: File): string | null {
  if (file.size < 1) return "Le fichier est vide.";
  if (file.size > KYC_MAX_FILE_SIZE) return "Le fichier dépasse 5 Mo.";
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
    return "Format non accepté. Utilisez PDF, JPG, PNG ou WebP.";
  }
  return null;
}

export function hasValidMagic(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
