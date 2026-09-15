import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/auth/verify-contact — Confirmation du contact (email ou téléphone).
 * Vérifie le code à 6 chiffres généré à l'inscription.
 * L'inscription de son représentant ne valide pas automatiquement la société :
 * le KYC reste à compléter (§06, §08, §09).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body ?? {};

    if (!userId || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ alreadyVerified: true, email: user.email });
    }
    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      return NextResponse.json({ error: "Code de confirmation incorrect." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "VERIFICATION",
        title: "Contact confirmé",
        message:
          "Votre adresse email est confirmée. Vous pouvez explorer les offres ; la souscription nécessite la vérification complète de votre identité.",
        read: false,
      },
    });

    return NextResponse.json({ verified: true, email: user.email });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
