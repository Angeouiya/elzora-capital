import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";

// ============================================================================
// POST /api/admin/login
// ----------------------------------------------------------------------------
// Authentification admin SÉPARÉE du portail principal (token cookie
// `x-nexora-admin-token` distinct de `x-nexora-token`).
//
// Mode démonstration : tout mot de passe est accepté pour un AdminUser actif
// existant. En production : NextAuth credentials + 2FA + IP allowlist +
// bcrypt/argon2 + rotation des tokens.
//
// Le retour n'inclut JAMAIS le passwordHash ni la liste des permissions
// brute (seul le rôle est renvoyé ; les permissions restent serveur-side).
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

  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.active) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  // Mode démo : tout password est accepté pour un admin actif existant.
  // En production : bcrypt.compare(password, admin.passwordHash)
  // Le spec demande : "verify password against AdminUser.passwordHash
  // (demo: accept if user exists and active)" + "Keep accepting admin@nexora
  // + any password in demo mode".
  // On accepte également passwordHash === password pour la démo.
  void password;

  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      actorType: "admin",
      actorId: admin.id,
      action: "admin_login",
      entityType: "admin_user",
      entityId: admin.id,
      metadata: JSON.stringify({ email, role: admin.role }),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // On ne renvoie PAS le passwordHash ni les permissions brutes.
  const safeAdmin = {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: admin.role,
  };

  const res = NextResponse.json({
    admin: ser(safeAdmin),
    notice:
      "Accès administrateur. Toutes les actions sont tracées dans le journal d'audit.",
  });
  // Cookie admin httpOnly — 8h (court)
  res.cookies.set("x-nexora-admin-token", admin.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
