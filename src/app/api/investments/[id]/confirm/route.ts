import { NextResponse } from "next/server";

/**
 * Investor-triggered payment confirmation is deliberately disabled.
 *
 * A payment may only become confirmed after an authenticated, signed and
 * idempotent callback from the contracted payment provider. Until that
 * provider is configured, subscriptions remain in `pending_payment` and no
 * ledger or fundraising balance is mutated.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Confirmation de paiement indisponible",
      message:
        "La confirmation est effectuée automatiquement après validation par le prestataire de paiement.",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
