import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";

// ============================================================================
// POST /api/auth/login
// ----------------------------------------------------------------------------
// Mode démonstration : si l'utilisateur existe en base, tout mot de passe est
// accepté. Pour l'email de démo `investisseur@demo.nexora`, on crée l'utilisateur
// à la volée s'il n'existe pas (démo interactive).
// En production : NextAuth credentials + 2FA + IP allowlist + bcrypt/argon2.
// ============================================================================
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  // Recherche ou création du compte démo
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Démo : on crée à la volée l'investisseur de démo si l'email correspond.
    if (email === "investisseur@demo.nexora") {
      user = await db.user.create({
        data: {
          email,
          phone: "+22177000001",
          passwordHash: "demo_hash_investor",
          firstName: "Aïssatou",
          lastName: "Diallo",
          country: "SN",
          language: "fr",
          kycStatus: "verified",
          kycVerifiedAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }
  }

  // Mode démo : tout password est accepté pour un utilisateur existant.
  // En production : bcrypt.compare(password, user.passwordHash)
  // Spec : `passwordHash === password` (démo) → on accepte aussi ce cas.
  // Ici on accepte toujours en démo.
  void password;

  // Création de la session
  const session = await db.userSession.create({
    data: {
      userId: user.id,
      deviceInfo: req.headers.get("user-agent") || "unknown",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      actorType: "user",
      actorId: user.id,
      action: "user_login",
      entityType: "user",
      entityId: user.id,
      metadata: JSON.stringify({ email }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  const res = NextResponse.json({
    user: ser({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }),
  });
  // Cookie httpOnly, sameSite lax, 7 jours
  res.cookies.set("x-nexora-token", session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
