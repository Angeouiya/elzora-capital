"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Download,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileCheck,
  FileQuestion,
  Receipt,
  ScrollText,
  CreditCard,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

/* ---------------------------------- Types --------------------------------- */

interface KYCDocument {
  id: string;
  type: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  verifiedAt: string | null;
  note: string | null;
}

/* -------------------------------- Constants ------------------------------- */

const kycTypeLabels: Record<string, string> = {
  IDENTITY: "Pièce d'identité",
  PROOF_ADDRESS: "Justificatif de domicile",
  BANK_STATEMENT: "Relevé bancaire",
  TAX_ID: "Numéro fiscal",
  REGISTRATION: "Registre de commerce",
  SELFIE: "Photo d'identité",
  FINANCIAL: "États financiers",
  BUSINESS_PLAN: "Business plan",
};

/* -------------------------------- Component ------------------------------- */

export default function DocumentsPage() {
  const [kycDocs, setKycDocs] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kyc")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const data: KYCDocument[] = await res.json();
        if (!cancelled) setKycDocs(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = (id: string) => {
    setDownloadingId(id);
    setTimeout(() => setDownloadingId(null), 1500);
  };

  /* KYC status overview */
  const kycVerified = kycDocs.some((d) => d.status === "VERIFIED");
  const kycPending = kycDocs.some((d) => d.status === "PENDING");
  const kycRejected = kycDocs.some((d) => d.status === "REJECTED");

  /* Simulated contract documents */
  const contracts = [
    {
      id: "c1",
      name: "Contrat d'investissement — Agro-Alliance SARL",
      date: "12 mars 2025",
      type: "Contrat",
    },
    {
      id: "c2",
      name: "Contrat d'investissement — Sahel Logistique",
      date: "28 janvier 2025",
      type: "Contrat",
    },
    {
      id: "c3",
      name: "Contrat d'investissement — Atelier Nova",
      date: "5 novembre 2024",
      type: "Contrat",
    },
  ];

  const attestations = [
    {
      id: "a1",
      name: "Attestation d'investissement Q1 2025",
      date: "31 mars 2025",
      type: "Attestation",
    },
    {
      id: "a2",
      name: "Attestation fiscale 2024",
      date: "15 février 2025",
      type: "Attestation",
    },
  ];

  const releves = [
    {
      id: "r1",
      name: "Relevé de portefeuille T1 2025",
      date: "1 avril 2025",
      type: "Relevé",
    },
    {
      id: "r2",
      name: "Relevé de portefeuille T4 2024",
      date: "5 janvier 2025",
      type: "Relevé",
    },
    {
      id: "r3",
      name: "Relevé annuel 2024",
      date: "10 janvier 2025",
      type: "Relevé",
    },
  ];

  const renderDocumentRow = (doc: { id: string; name: string; date: string; type: string }) => (
    <div
      key={doc.id}
      className="flex items-center justify-between p-4 rounded-lg bg-[#F5F5F3]/60 hover:bg-[#F5F5F3] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-lg bg-white border border-[#101010]/8 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-[#101010]/50" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#101010] truncate">{doc.name}</p>
          <p className="text-xs text-[#101010]/50">{doc.date}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon={<Download className="h-3.5 w-3.5" />}
        onClick={() => handleDownload(doc.id)}
        loading={downloadingId === doc.id}
      >
        <span className="hidden sm:inline">Télécharger</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#101010]/8">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[#101010]/60 hover:bg-[#F5F5F3] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold text-[#101010]">Documents</h1>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-6xl mx-auto px-4 sm:px-6">
        {/* KYC Section */}
        <Card className="mb-8">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                  kycVerified
                    ? "bg-[#166534]/10"
                    : kycRejected
                      ? "bg-[#C62828]/10"
                      : "bg-amber-50"
                }`}
              >
                {kycVerified ? (
                  <ShieldCheck className="h-5 w-5 text-[#166534]" />
                ) : kycRejected ? (
                  <ShieldAlert className="h-5 w-5 text-[#C62828]" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">Vérification KYC</CardTitle>
                <CardDescription>
                  {kycVerified
                    ? "Votre identité est vérifiée"
                    : kycRejected
                      ? "Certains documents ont été rejetés"
                      : kycPending
                        ? "Documents en cours de vérification"
                        : "Aucun document soumis"}
                </CardDescription>
              </div>
            </div>
            {kycVerified ? (
              <Badge variant="success">Vérifié</Badge>
            ) : kycRejected ? (
              <Badge variant="danger">Action requise</Badge>
            ) : kycPending ? (
              <Badge variant="warning">En cours</Badge>
            ) : (
              <Badge variant="default">Non soumis</Badge>
            )}
          </CardHeader>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-[#F5F5F3]" />
              ))}
            </div>
          ) : kycDocs.length > 0 ? (
            <div className="space-y-2">
              {kycDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F3]/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {doc.status === "VERIFIED" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#166534] shrink-0" />
                    ) : doc.status === "REJECTED" ? (
                      <XCircle className="h-4 w-4 text-[#C62828] shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#101010] truncate">
                        {kycTypeLabels[doc.type] || doc.type}
                      </p>
                      <p className="text-xs text-[#101010]/50 truncate">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-[#101010]/50">
                      {new Date(doc.uploadedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileQuestion className="h-8 w-8 text-[#101010]/20 mx-auto mb-3" />
              <p className="text-sm text-[#101010]/50 mb-3">
                Soumettez vos documents pour compléter votre vérification.
              </p>
              <Link href="/verification">
                <Button variant="secondary" size="sm" icon={<Upload className="h-3.5 w-3.5" />}>
                  Compléter mon KYC
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Contracts */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ScrollText className="h-5 w-5 text-[#101010]/40" />
            <h2 className="text-lg font-semibold text-[#101010]">Contrats</h2>
            <Badge variant="default">{contracts.length}</Badge>
          </div>
          <div className="space-y-2">{contracts.map(renderDocumentRow)}</div>
        </section>

        {/* Attestations */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="h-5 w-5 text-[#101010]/40" />
            <h2 className="text-lg font-semibold text-[#101010]">Attestations</h2>
            <Badge variant="default">{attestations.length}</Badge>
          </div>
          <div className="space-y-2">{attestations.map(renderDocumentRow)}</div>
        </section>

        {/* Relevés */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-[#101010]/40" />
            <h2 className="text-lg font-semibold text-[#101010]">Relevés</h2>
            <Badge variant="default">{releves.length}</Badge>
          </div>
          <div className="space-y-2">{releves.map(renderDocumentRow)}</div>
        </section>
      </main>
    </div>
  );
}
