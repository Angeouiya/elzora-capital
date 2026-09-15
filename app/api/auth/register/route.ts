import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * POST /api/auth/register — Création de compte (§06 du cahier des charges).
 * Parcours : particulier ou entreprise, coordonnées, identifiants, conditions.
 * En mode démonstration, un code de confirmation du contact est généré et
 * renvoyé dans la réponse pour permettre la vérification sans envoi d'email réel.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      country,
      accountType, // INDIVIDUAL | COMPANY
      companyName,
      companyLegalForm,
      companyGoal, // INVEST | BORROW | BOTH
      marketingConsent,
    } = body ?? {};

    // --- Validations serveur ---
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins une lettre et un chiffre." },
        { status: 400 }
      );
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
    }

    const type = accountType === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
    if (type === "COMPANY" && (!companyName || typeof companyName !== "string")) {
      return NextResponse.json(
        { error: "Le nom de la société est requis pour un compte entreprise." },
        { status: 400 }
      );
    }

    // Contrôle des doublons (§06)
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    // Code de confirmation du contact (mode démonstration)
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hash,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() : null,
        country: country || "CI",
        role: type === "COMPANY" ? "ENTERPRISE" : "INVESTOR",
        accountType: type,
        kycStatus: "PENDING",
        verificationCode,
      },
    });

    if (type === "COMPANY") {
      await prisma.company.create({
        data: {
          name: String(companyName).trim(),
          legalForm: companyLegalForm || "SARL",
          country: country || "CI",
          goal: companyGoal === "INVEST" || companyGoal === "BORROW" || companyGoal === "BOTH" ? companyGoal : null,
          status: "DRAFT",
          userId: user.id,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "INSCRIPTION",
        title: "Bienvenue sur Nexora Capital",
        message:
          type === "COMPANY"
            ? "Votre compte entreprise est créé. L'inscription de votre représentant ne valide pas automatiquement la société : complétez la vérification pour débloquer les usages financiers."
            : "Votre compte est créé. Complétez la vérification de votre identité pour pouvoir investir.",
        read: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        entity: "User",
        entityId: user.id,
        details: `Création de compte ${type}`,
      },
    });

    return NextResponse.json(
      {
        userId: user.id,
        accountType: type,
        // Mode démonstration : le code est renvoyé pour simuler la réception par email/SMS.
        demoCode: verificationCode,
        marketingConsent: marketingConsent === true,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
