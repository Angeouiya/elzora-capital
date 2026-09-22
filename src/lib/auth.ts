import { getD1, isoNow } from "./d1";

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

interface UserSessionRow {
  userId: string;
  lastActiveAt: string;
  revoked: number;
  email: string;
}

interface AdminSessionRow {
  id: string;
  email: string;
  role: string;
  permissions: string;
  active: number;
  lastLoginAt: string | null;
}

export async function getUserSession(req?: Request): Promise<SessionUser | null> {
  const token = readTokenFromRequest(req, "x-nexora-token");
  if (!token) return null;
  const database = getD1();
  const session = await database
    .prepare(
      `SELECT s.userId, s.lastActiveAt, s.revoked, u.email
       FROM UserSession s JOIN User u ON u.id = s.userId
       WHERE s.id = ? LIMIT 1`
    )
    .bind(token)
    .first<UserSessionRow>();

  if (!session || Boolean(session.revoked)) return null;
  const lastActive = new Date(session.lastActiveAt).getTime();
  if (!Number.isFinite(lastActive) || Date.now() - lastActive > 7 * 24 * 60 * 60 * 1000) return null;
  await database.prepare(`UPDATE UserSession SET lastActiveAt = ? WHERE id = ?`).bind(isoNow(), token).run();
  return { userId: session.userId, email: session.email, role: "investor" };
}

export async function requireUser(req?: Request): Promise<SessionUser> {
  const session = await getUserSession(req);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getAdminSession(req?: Request): Promise<SessionAdmin | null> {
  const token = readTokenFromRequest(req, "x-nexora-admin-token");
  if (!token) return null;
  const admin = await getD1()
    .prepare(`SELECT id, email, role, permissions, active, lastLoginAt FROM AdminUser WHERE id = ? LIMIT 1`)
    .bind(token)
    .first<AdminSessionRow>();
  if (!admin || !Boolean(admin.active) || !admin.lastLoginAt) return null;
  const lastLogin = new Date(admin.lastLoginAt).getTime();
  if (!Number.isFinite(lastLogin) || Date.now() - lastLogin > 8 * 60 * 60 * 1000) return null;
  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: safeParse(admin.permissions),
  };
}

export async function requireAdmin(req?: Request): Promise<SessionAdmin> {
  const session = await getAdminSession(req);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function requirePermission(admin: SessionAdmin, permission: string): void {
  if (admin.permissions.includes("all") || admin.permissions.includes(permission)) return;
  throw new Error(`FORBIDDEN:${permission}`);
}

export function readTokenFromRequest(req: Request | undefined, name: string): string | null {
  if (!req) return null;
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] || "") : null;
}

function safeParse(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string") ? parsed : [];
  } catch {
    return [];
  }
}
