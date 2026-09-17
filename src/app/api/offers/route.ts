import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const country = searchParams.get("country");
  const instrument = searchParams.get("instrument");

  const offers = await db.offer.findMany({
    where: { status: "open" },
    include: { project: { include: { company: true } } },
    orderBy: { publishedAt: "desc" },
  });

  let filtered = offers;
  if (sector && sector !== "all")
    filtered = filtered.filter((o) => o.project.sector === sector);
  if (country && country !== "all")
    filtered = filtered.filter((o) => o.project.country === country);
  if (instrument && instrument !== "all")
    filtered = filtered.filter((o) => o.project.instrumentType === instrument);

  return NextResponse.json({ offers: ser(filtered) });
}
