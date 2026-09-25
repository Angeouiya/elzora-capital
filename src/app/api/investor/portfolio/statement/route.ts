import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  buildPortfolioStatementPdf,
  ensurePortfolioStatement,
  hashPortfolioStatementSnapshot,
  type PortfolioStatementSnapshot,
} from "@/lib/portfolio-statement";

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const database = getD1();
  try {
    const statement = await ensurePortfolioStatement(database, session.userId, locale);
    const snapshot = JSON.parse(statement.snapshot) as PortfolioStatementSnapshot;
    const contentHash = await hashPortfolioStatementSnapshot(snapshot);
    if (contentHash !== statement.contentHash) {
      return NextResponse.json(
        { error: "L'intégrité du relevé n'a pas pu être confirmée." },
        { status: 500 }
      );
    }
    const pdf = await buildPortfolioStatementPdf(
      snapshot,
      contentHash,
      statement.statementNumber,
      statement.issuedAt,
      locale
    );
    const now = isoNow();
    await database.batch([
      database
        .prepare(
          `UPDATE PortfolioStatement
           SET lastDownloadedAt = ?, downloadCount = downloadCount + 1, updatedAt = ?
           WHERE id = ?`
        )
        .bind(now, now, statement.id),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'portfolio_statement_downloaded',
                   'PortfolioStatement', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          statement.id,
          JSON.stringify({
            statementNumber: statement.statementNumber,
            contentHash,
            periodEnd: statement.periodEnd,
            locale,
          }),
          requestIp(req),
          now
        ),
    ]);

    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="releve-${statement.statementNumber}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("portfolio_statement_download_failed", error);
    return NextResponse.json(
      { error: "Le relevé de portefeuille n'a pas pu être généré." },
      { status: 500 }
    );
  }
}
