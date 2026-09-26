import { NextRequest, NextResponse } from "next/server";
import { requireUser, readTokenFromRequest } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isStrongPassword } from "@/lib/password-policy";

interface AccountRow extends Record<string, unknown> {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  kycStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  passwordHash: string;
}

interface IdentityRow extends Record<string, unknown> {
  provider: string;
}

interface SessionRow extends Record<string, unknown> {
  id: string;
  deviceInfo: string;
  createdAt: string;
  lastActiveAt: string;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const database = getD1();
  const currentSessionId = readTokenFromRequest(req, "x-nexora-token");
  const [account, sessions, identities] = await Promise.all([
    database
      .prepare(
        `SELECT id, email, phone, firstName, lastName, country, language,
                kycStatus, createdAt, lastLoginAt, passwordHash
         FROM User WHERE id = ? LIMIT 1`
      )
      .bind(session.userId)
      .first<AccountRow>(),
    database
      .prepare(
        `SELECT id, deviceInfo, createdAt, lastActiveAt
         FROM UserSession
         WHERE userId = ? AND revoked = 0
         ORDER BY lastActiveAt DESC`
      )
      .bind(session.userId)
      .all<SessionRow>(),
    database
      .prepare(`SELECT provider FROM ExternalIdentity WHERE userId = ? ORDER BY provider ASC`)
      .bind(session.userId)
      .all<IdentityRow>(),
  ]);

  if (!account) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404, headers: noStore });
  }

  const { passwordHash, ...safeAccount } = account;
  return NextResponse.json(
    {
      account: {
        ...safeAccount,
        passwordEnabled: passwordHash.startsWith("pbkdf2_sha256$"),
        loginMethods: identities.results.map((entry) => entry.provider),
      },
      sessions: sessions.results.map((item) => ({
        ...item,
        current: item.id === currentSessionId,
      })),
    },
    { headers: noStore }
  );
}

export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400, headers: noStore });
  }

  const database = getD1();
  const operation = body.operation === "password" ? "password" : "profile";
  const now = isoNow();
  const ipAddress = requestIp(req);

  if (operation === "profile") {
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    const lastName = String(body.lastName || "").trim().slice(0, 80);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const language = body.language === "en" ? "en" : "fr";
    if (!firstName || !lastName || !/^[+()\d\s.-]{7,40}$/.test(phone)) {
      return NextResponse.json(
        { error: "Vérifiez votre nom et votre numéro de téléphone." },
        { status: 400, headers: noStore }
      );
    }

    await database.batch([
      database
        .prepare(
          `UPDATE User
           SET firstName = ?, lastName = ?, phone = ?, language = ?, updatedAt = ?
           WHERE id = ?`
        )
        .bind(firstName, lastName, phone, language, now, session.userId),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           VALUES (?, 'user', ?, 'account_profile_updated', 'user', ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          session.userId,
          JSON.stringify({ fields: ["firstName", "lastName", "phone", "language"] }),
          ipAddress,
          now
        ),
    ]);
    return NextResponse.json(
      { account: { firstName, lastName, phone, language } },
      { headers: noStore }
    );
  }

  const currentPassword = String(body.currentPassword || "");
  const nextPassword = String(body.nextPassword || "");
  if (!isStrongPassword(nextPassword) || currentPassword.length > 200) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 10 caractères et combiner trois types de caractères." },
      { status: 400, headers: noStore }
    );
  }
  const account = await database
    .prepare(`SELECT passwordHash FROM User WHERE id = ? LIMIT 1`)
    .bind(session.userId)
    .first<{ passwordHash: string }>();
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return NextResponse.json(
      { error: "Le mot de passe actuel est incorrect." },
      { status: 403, headers: noStore }
    );
  }

  const nextHash = await hashPassword(nextPassword);
  const currentSessionId = readTokenFromRequest(req, "x-nexora-token");
  await database.batch([
    database
      .prepare(`UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?`)
      .bind(nextHash, now, session.userId),
    database
      .prepare(`UPDATE UserSession SET revoked = 1 WHERE userId = ? AND id <> ?`)
      .bind(session.userId, currentSessionId || ""),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'account_password_changed', 'user', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        session.userId,
        JSON.stringify({ otherSessionsRevoked: true }),
        ipAddress,
        now
      ),
  ]);

  return NextResponse.json(
    { ok: true, message: "Mot de passe modifié. Les autres appareils ont été déconnectés." },
    { headers: noStore }
  );
}

export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400, headers: noStore });
  }
  const sessionId = String(body.sessionId || "").trim();
  const currentSessionId = readTokenFromRequest(req, "x-nexora-token");
  if (!sessionId || sessionId === currentSessionId) {
    return NextResponse.json(
      { error: "Cette connexion est actuellement utilisée." },
      { status: 409, headers: noStore }
    );
  }

  const database = getD1();
  const now = isoNow();
  const result = await database
    .prepare(
      `UPDATE UserSession SET revoked = 1, lastActiveAt = ?
       WHERE id = ? AND userId = ? AND revoked = 0`
    )
    .bind(now, sessionId, session.userId)
    .run();
  if ((result.meta.changes || 0) !== 1) {
    return NextResponse.json({ error: "Connexion introuvable" }, { status: 404, headers: noStore });
  }
  await database
    .prepare(
      `INSERT INTO AuditLog
         (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
       VALUES (?, 'user', ?, 'account_session_revoked', 'user_session', ?, '{}', ?, ?)`
    )
    .bind(crypto.randomUUID(), session.userId, sessionId, requestIp(req), now)
    .run();

  return NextResponse.json({ ok: true }, { headers: noStore });
}
