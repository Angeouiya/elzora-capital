import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const offer = await db.offer.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true,
          documents: true,
          timeline: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
      investments: {
        where: { status: "confirmed" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  return NextResponse.json({ offer: ser(offer) });
}
