import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1 } from "@/lib/d1";
import { getPaymentCapabilities } from "@/lib/payment-capabilities";

interface CompanyPaymentRow extends Record<string, unknown> {
  id: string;
  projectId: string;
  installmentNo: number;
  dueDate: string;
  capitalDue: number;
  interestDue: number;
  followUpFeeDue: number;
  totalDue: number;
  status: string;
  paidAt: string | null;
  paidAmount: number;
  remaining: number;
  paymentRef: string | null;
  createdAt: string;
}

interface ProjectRow extends Record<string, unknown> {
  id: string;
  title: string;
  companyId: string;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const database = getD1();
  const capabilities = getPaymentCapabilities();
  const [payments, projects] = await Promise.all([
    database
      .prepare(
        `SELECT cp.id, cp.projectId, cp.installmentNo, cp.dueDate,
                cp.capitalDue, cp.interestDue, cp.followUpFeeDue, cp.totalDue,
                cp.status, cp.paidAt, cp.paidAmount, cp.remaining,
                cp.paymentRef, cp.createdAt
         FROM CompanyPayment cp
         JOIN Project p ON p.id = cp.projectId
         JOIN CompanyMember cm ON cm.companyId = p.companyId
         WHERE cm.userId = ?
         ORDER BY cp.dueDate ASC`
      )
      .bind(session.userId)
      .all<CompanyPaymentRow>(),
    database
      .prepare(
        `SELECT DISTINCT p.id, p.title, p.companyId
         FROM Project p
         JOIN CompanyMember cm ON cm.companyId = p.companyId
         WHERE cm.userId = ?
         ORDER BY p.createdAt DESC`
      )
      .bind(session.userId)
      .all<ProjectRow>(),
  ]);

  return NextResponse.json(
    {
      payments: payments.results,
      projects: projects.results,
      collectionsEnabled: capabilities.collectionsEnabled,
      providerName: capabilities.providerName,
      collectionMethods: capabilities.collectionMethods,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/**
 * A company cannot self-certify a repayment. The future provider adapter will
 * create a signed card or Mobile Money collection intent, and a verified
 * webhook will be the only entry point allowed to move this payment forward.
 */
export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const capabilities = getPaymentCapabilities();
  return NextResponse.json(
    {
      error: capabilities.collectionsEnabled
        ? "L'adaptateur du prestataire de paiement n'est pas encore disponible. Aucun paiement n'a été enregistré."
        : "Les paiements par carte et Mobile Money sont en cours d'activation avec un prestataire agréé. Aucun paiement n'a été enregistré.",
      code: capabilities.collectionsEnabled
        ? "PAYMENT_ADAPTER_NOT_AVAILABLE"
        : "COLLECTIONS_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}
