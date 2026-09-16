import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

function strongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();
    if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code) || !strongPassword(password)) {
      return NextResponse.json({ error: "Informations de réinitialisation invalides." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.verificationCode || user.verificationCode !== code) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash, verificationCode: null } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "PASSWORD_RESET_COMPLETED", entity: "User", entityId: user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
