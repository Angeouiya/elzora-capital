// ============================================================================
// AUTHENTIFICATION SERVEUR — Token simple signé (session en DB)
// ============================================================================
// En production : NextAuth credentials + 2FA + IP allowlist + rotation.
// Ici : token opaque stocké en DB (UserSession), vérifié sur chaque API.
// Le frontend envoie le token via cookie httpOnly (déposé par /api/auth/login).

import { db } from "./db";

export interface SessionUser {
  userId: string;
  email: string;
  role: "investor" | "company_member";
  companyId?: string | null;
}

export interface SessionAdmin {
  adminId: string;
  email: string;
  role: string;
  permissions: string[];
}

// --- Portail principal ---
// In API routes, pass the Request so we can read cookies from headers.
export async function getUserSession(req?: Request): Promise<SessionUser | null> {
  const token = readTokenFromRequest(req, "x-nexora-token");
  if (!token) return null;
  const session = await db.userSession.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session || session.revoked) return null;
  const age = Date.now() - session.lastActiveAt.getTime();
  if (age > 7 * 24 * 60 * 60 * 1000) return null;
  await db.userSession.update({
    where: { id: token },
    data: { lastActiveAt: new Date() },
  }).catch(() => {});
  return {
    userId: session.userId,
    email: session.user.email,
    role: "investor",
  };
}

export async function requireUser(req?: Request): Promise<SessionUser> {
  const s = await getUserSession(req);
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

// --- Portail admin ---
export async function getAdminSession(req?: Request): Promise<SessionAdmin | null> {
  const token = readTokenFromRequest(req, "x-nexora-admin-token");
  if (!token) return null;
  const admin = await db.adminUser.findUnique({ where: { id: token } });
  if (!admin || !admin.active) return null;
  const age = admin.lastLoginAt ? Date.now() - admin.lastLoginAt.getTime() : Infinity;
  if (age > 8 * 60 * 60 * 1000) return null;
  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: safeParse(admin.permissions),
  };
}

export async function requireAdmin(req?: Request): Promise<SessionAdmin> {
  const s = await getAdminSession(req);
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export function requirePermission(admin: SessionAdmin, perm: string): void {
  if (admin.permissions.includes("all") || admin.permissions.includes(perm)) return;
  throw new Error("FORBIDDEN:" + perm);
}

// --- Utilitaire : lit un cookie depuis les headers d'une Request ---
function readTokenFromRequest(req: Request | undefined, name: string): string | null {
  if (!req) return null;
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1] || "") : null;
}

function safeParse(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}
