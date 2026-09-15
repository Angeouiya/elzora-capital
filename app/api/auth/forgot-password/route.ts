import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/auth/forgot-password — Demande de récupération de compte (§07).
 * Ne révèle jamais l'existence ou non d'un compte (réponse générique).
 * Mode démonstration : aucun email réel n'est envoyé.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUEST",
          entity: "User",
          entityId: user.id,
          details: "Demande de récupération de mot de passe",
        },
      });
    }

    // Réponse identique que le compte existe ou non.
    return NextResponse.json({
      message:
        "Si un compte est associé à cette adresse, des instructions de récupération ont été envoyées. Mode démonstration : aucun email réel n'est envoyé.",
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
