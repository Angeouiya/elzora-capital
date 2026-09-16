import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["IDENTITY","PROOF_ADDRESS","BANK_STATEMENT","TAX_ID","REGISTRATION","SELFIE","FINANCIAL","BUSINESS_PLAN"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true, accountType: true, kycDocuments: { orderBy: { uploadedAt: "desc" } } },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const body = await req.json();
    const type = typeof body.type === "string" ? body.type : "";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const fileSize = Math.round(Number(body.fileSize || 0));
    if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ error: "Type de document non autorisé." }, { status: 400 });
    if (!fileName || fileName.length > 180) return NextResponse.json({ error: "Nom de fichier invalide." }, { status: 400 });
    if (!Number.isFinite(fileSize) || fileSize < 0 || fileSize > MAX_FILE_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 400 });

    const previous = await prisma.kYCDocument.findFirst({
      where: { userId: session.user.id, type, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { uploadedAt: "desc" },
    });
    const doc = previous
      ? await prisma.kYCDocument.update({ where: { id: previous.id }, data: { fileName, fileSize: fileSize || null, status: "PENDING", note: null, uploadedAt: new Date(), verifiedAt: null } })
      : await prisma.kYCDocument.create({ data: { userId: session.user.id, type, fileName, fileSize: fileSize || null } });
    await prisma.user.update({ where: { id: session.user.id }, data: { kycStatus: "IN_PROGRESS" } });
    await prisma.auditLog.create({ data: { userId: session.user.id, action: "KYC_DOCUMENT_SUBMITTED", entity: "KYCDocument", entityId: doc.id, details: type } });
    return NextResponse.json(doc, { status: previous ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
