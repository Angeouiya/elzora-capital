import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const offerId = req.nextUrl.searchParams.get("offerId");
    if (!offerId) return NextResponse.json({ error: "offerId requis" }, { status: 400 });

    const repayments = await prisma.repayment.findMany({
      where: { offerId },
      orderBy: { scheduleDate: "asc" },
    });
    return NextResponse.json(repayments);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
