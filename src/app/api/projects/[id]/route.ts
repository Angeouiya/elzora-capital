import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ser } from "@/lib/serialize";
import { requireUser } from "@/lib/auth";

// ============================================================================
// GET /api/projects/[id]
// ----------------------------------------------------------------------------
// Détail d'un projet : l'utilisateur doit être membre de la société propriétaire.
// Sinon 403. Inclut les events timeline + documents.
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      company: true,
      timeline: { orderBy: { createdAt: "desc" }, take: 50 },
      documents: { orderBy: { uploadedAt: "desc" } },
      offer: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Vérification d'appartenance
  const membership = await db.companyMember.findFirst({
    where: { userId: session.userId, companyId: project.companyId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Accès refusé à ce projet" },
      { status: 403 }
    );
  }

  return NextResponse.json({ project: ser(project) });
}
