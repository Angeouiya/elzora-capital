import { NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth";

/**
 * Manual confirmation is intentionally forbidden. A company repayment will
 * only be distributed after a signed, idempotent provider webhook has proved
 * that the funds were effectively received.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdmin(req);
    requirePermission(admin, "payment:confirm");
  } catch (error) {
    return NextResponse.json(
      { error: String(error).includes("FORBIDDEN") ? "Permission refusée" : "Non authentifié" },
      { status: String(error).includes("FORBIDDEN") ? 403 : 401 }
    );
  }

  await params;
  return NextResponse.json(
    {
      error:
        "La confirmation manuelle est désactivée. Seul le retour signé du prestataire de paiement pourra confirmer et distribuer cette échéance.",
      code: "SIGNED_PROVIDER_CONFIRMATION_REQUIRED",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
