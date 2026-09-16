import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type ProfileUpdate = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  language?: string;
};

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

    const body = (await req.json()) as Record<string, unknown>;
    const data: ProfileUpdate = {};

    if ("firstName" in body) {
      const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
      if (firstName.length < 2 || firstName.length > 80) {
        return NextResponse.json({ error: "Prénom invalide." }, { status: 400 });
      }
      data.firstName = firstName;
    }

    if ("lastName" in body) {
      const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
      if (lastName.length < 2 || lastName.length > 80) {
        return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
      }
      data.lastName = lastName;
    }

    if ("phone" in body) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (phone && phone.replace(/\D/g, "").length < 8) {
        return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
      }
      data.phone = phone || null;
    }

    if ("language" in body) {
      if (body.language !== "fr" && body.language !== "en") {
        return NextResponse.json({ error: "Langue non prise en charge." }, { status: 400 });
      }
      data.language = body.language;
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
