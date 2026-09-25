import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  buildInvestmentContractPdf,
  ensureInvestmentContract,
  hashInvestmentContractSnapshot,
  type InvestmentContractSnapshot,
} from "@/lib/investment-contract";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const database = getD1();
  const investment = await database
    .prepare(
      `SELECT id, status, paymentConfirmedAt
       FROM Investment WHERE id = ? AND investorId = ? LIMIT 1`
    )
    .bind(id, session.userId)
    .first<{ id: string; status: string; paymentConfirmedAt: string | null }>();
  if (!investment) return NextResponse.json({ error: "Souscription introuvable" }, { status: 404 });
  if (investment.status !== "confirmed" || !investment.paymentConfirmedAt) {
    return NextResponse.json(
      { error: "Le contrat sera disponible après confirmation du paiement." },
      { status: 409 }
    );
  }

  try {
    const contract = await ensureInvestmentContract(database, investment.id);
    const snapshot = JSON.parse(contract.snapshot) as InvestmentContractSnapshot;
    const contentHash = await hashInvestmentContractSnapshot(snapshot);
    if (contentHash !== contract.contentHash) {
      return NextResponse.json({ error: "L'intégrité du contrat n'a pas pu être confirmée." }, { status: 500 });
    }
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "fr";
    const pdf = await buildInvestmentContractPdf(snapshot, contentHash, locale);
    const now = isoNow();
    await database.batch([
      database
        .prepare(
          `UPDATE InvestmentContract
           SET lastDownloadedAt = ?, downloadCount = downloadCount + 1, updatedAt = ?
           WHERE id = ?`
        )
        .bind(now, now, contract.id),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'investment_contract_downloaded',
                   'InvestmentContract', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          contract.id,
          JSON.stringify({
            investmentId: investment.id,
            contractNumber: contract.contractNumber,
            contentHash,
            locale,
          }),
          requestIp(req),
          now
        ),
    ]);

    const responseBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(responseBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat-${contract.contractNumber}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("investment_contract_download_failed", error);
    return NextResponse.json({ error: "Le contrat n'a pas pu être généré." }, { status: 500 });
  }
}
