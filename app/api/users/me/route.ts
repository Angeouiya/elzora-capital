import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const editable = new Set(["firstName", "lastName", "phone", "language"]);

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        kycStatus: true,
        accountType: true,
        country: true,
        language: true,
        avatar: true,
        twoFactor: true,
        emailVerified: true,
        createdAt: true,
        company: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const data: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(body ?? {})) {
      if (!editable.has(key)) continue;
      if (key === "phone") {
        const phone = typeof value === "string" ? value.trim() : "";
        if (phone && phone.replace(/\D/g, "").length < 8) {
          return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
        }
        data.phone = phone || null;
        continue;
      }
      if (key === "language") {
        const language = value === "en" ? "en" : value === "fr" ? "fr" : "";
        if (!language) return NextResponse.json({ error: "Langue non prise en charge." }, { status: 400 });
        data.language = language;
        continue;
      }
      const text = typeof value === "string" ? value.trim() : "";
      if (text.length < 2 || text.length > 80) {
        return NextResponse.json({ error: `${key} invalide.` }, { status: 400 });
      }
      data[key] = text;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "Aucune modification autorisée." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        kycStatus: true,
        accountType: true,
        country: true,
        language: true,
        emailVerified: true,
        createdAt: true,
        company: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: session.user.id,
        details: Object.keys(data).join(", "),
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
