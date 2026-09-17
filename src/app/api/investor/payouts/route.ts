import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";
import { postLedgerEntry, genIdemKey, getBalance } from "@/lib/ledger";

// ============================================================================
// GET /api/investor/payouts
// ----------------------------------------------------------------------------
// Liste les demandes de retrait de l'investisseur courant.
// ============================================================================
export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Solde disponible (wallet)
  const availableBalance = await getBalance("investor_wallet", session.userId);

  const payouts = await db.payout.findMany({
    where: {
      investorType: "individual",
      investorId: session.userId,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    payouts: ser(payouts),
    availableBalance: ser({ amount: availableBalance }),
  });
}

// ============================================================================
// POST /api/investor/payouts
// Body: { amount, beneficiaryAccount }
// ----------------------------------------------------------------------------
// Demande de retrait depuis le wallet investisseur.
// - requireUser(req)
// - Vérifie solde via getBalance("investor_wallet", userId)
// - Idempotence : pas de demande identique (même montant) dans les 5 dernières min
// - Crée Payout (status="pending", fees=0, netAmount=amount)
// - Ledger: investor_wallet → investor_external
// - Notification
// ============================================================================
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const amount = toBigIntSafe(body.amount);
  const beneficiaryAccount = String(body.beneficiaryAccount || "");
  if (!amount || amount <= 0n) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }
  if (!beneficiaryAccount) {
    return NextResponse.json(
      { error: "Compte bénéficiaire requis" },
      { status: 400 }
    );
  }

  // Vérification du solde disponible
  const balance = await getBalance("investor_wallet", session.userId);
  if (amount > balance) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  // Idempotence : pas de demande identique dans les 5 dernières minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await db.payout.findFirst({
    where: {
      investorType: "individual",
      investorId: session.userId,
      amount,
      status: "pending",
      createdAt: { gte: fiveMinAgo },
    },
  });
  if (recent) {
    return NextResponse.json({
      payout: ser(recent),
      idempotent: true,
      message: "Une demande similaire est déjà en cours de traitement.",
    });
  }

  // Création du payout (0% de commission investisseur)
  const payout = await db.payout.create({
    data: {
      investorType: "individual",
      investorId: session.userId,
      amount,
      fees: 0n,
      netAmount: amount,
      status: "pending",
      beneficiaryAccount,
    },
  });

  // Ledger : investor_wallet → investor_external
  const payIdem = genIdemKey("wtd", payout.id);
  await postLedgerEntry(
    {
      accountType: "investor_wallet",
      accountId: session.userId,
      amount,
      counterpartyType: "investor_external",
      counterpartyId: session.userId,
      sourceType: "payout",
      sourceId: payout.id,
      description: `Retrait demandé - ${amount} FCFA vers ${beneficiaryAccount}`,
      idemKey: payIdem,
    },
    {
      accountType: "investor_external",
      accountId: session.userId,
      amount,
      counterpartyType: "investor_wallet",
      counterpartyId: session.userId,
      sourceType: "payout",
      sourceId: payout.id,
      description: `Versement en cours - ${amount} FCFA`,
      idemKey: payIdem + ":credit",
    }
  );

  // AuditLog
  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: session.userId,
      action: "payout_requested",
      entityType: "payout",
      entityId: payout.id,
      metadata: JSON.stringify({
        amount: amount.toString(),
        beneficiaryAccount,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // Notification
  await db.notification.create({
    data: {
      userId: session.userId,
      type: "payment",
      title: "Demande de retrait enregistrée",
      message: `Votre demande de retrait de ${amount} FCFA a été enregistrée. Versement en cours de traitement par notre partenaire.`,
      actionUrl: "investor_dashboard",
    },
  });

  return NextResponse.json({
    payout: ser(payout),
    notice:
      "Versement en cours de traitement par notre partenaire. " +
      "Vous recevrez une notification dès que le virement sera effectué.",
  });
}

function toBigIntSafe(v: unknown): bigint | null {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isInteger(v)) return null;
    return BigInt(v);
  }
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return BigInt(n);
  }
  return null;
}
