import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument, type LegalDocumentKind } from "@/components/legal/legal-document";

const DOCUMENTS: LegalDocumentKind[] = ["terms", "privacy", "compliance"];

export function generateStaticParams() {
  return DOCUMENTS.map((document) => ({ document }));
}

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  const titles: Record<string, string> = {
    terms: "Conditions · Terms · NEXORA Capital",
    privacy: "Confidentialité · Privacy · NEXORA Capital",
    compliance: "Réglementation · Compliance · NEXORA Capital",
  };
  return { title: titles[document] ?? "Informations légales · NEXORA Capital" };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!DOCUMENTS.includes(document as LegalDocumentKind)) notFound();
  return <LegalDocument document={document as LegalDocumentKind} />;
}
