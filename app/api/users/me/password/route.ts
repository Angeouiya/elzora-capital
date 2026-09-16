import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function strongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { currentPassword, newPassword } = await req.json();
    if (typeof currentPassword !== "string" || !strongPassword(newPassword)) {
      return NextResponse.json({ error: "Mot de passe invalide. Utilisez au moins 8 caractères avec lettres et chiffres." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    const password = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
