import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function createCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) ?? {};
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    let demoCode: string | undefined;

    if (user) {
      const code = createCode();
      await prisma.user.update({ where: { id: user.id }, data: { verificationCode: code } });
      await prisma.auditLog.create({
        data: { userId: user.id, action: "PASSWORD_RESET_REQUEST", entity: "User", entityId: user.id, details: "Code de réinitialisation généré" },
      });
      if (process.env.NODE_ENV !== "production") demoCode = code;
    }

    return NextResponse.json({
      message: "Si un compte est associé à cette adresse, un code de récupération a été envoyé.",
      deliveryConfigured: process.env.NODE_ENV === "production",
      ...(demoCode ? { demoCode } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
