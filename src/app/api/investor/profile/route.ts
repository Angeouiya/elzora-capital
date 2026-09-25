import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import {
  INVESTOR_PROFILE_VERSION,
  investorAttentionLevel,
  investorProfileExpiresAt,
  isInvestorProfileCurrent,
  validateInvestorProfileInput,
} from "@/lib/investor-profile";

interface InvestorProfileRow extends Record<string, unknown> {
  experience: string;
  objective: string;
  horizon: string;
  investableCapitalRange: string;
  lossCapacity: string;
  riskComfort: string;
  understandsCapitalLoss: number;
  understandsIlliquidity: number;
  attentionLevel: string;
  version: string;
  completedAt: string;
  expiresAt: string;
  updatedAt: string;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const profile = await findProfile(session.userId);
  return NextResponse.json(profileResponse(profile), { headers: noStore });
}

export async function PUT(req: Request) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: noStore });
  }

  const body = await req.json().catch(() => null);
  const validation = validateInvestorProfileInput(body);
  if (!validation.ok) {
    const acknowledgementMissing = validation.code === "RISK_ACKNOWLEDGEMENT_REQUIRED";
    return NextResponse.json(
      {
        error: acknowledgementMissing
          ? "Confirmez votre compréhension de la perte possible et de l'absence de revente garantie."
          : "Complétez toutes les réponses avant de continuer.",
        code: validation.code,
      },
      { status: 422, headers: noStore }
    );
  }

  const database = getD1();
  const now = isoNow();
  const expiresAt = investorProfileExpiresAt(new Date(now));
  const attentionLevel = investorAttentionLevel(validation.value);
  const profileId = crypto.randomUUID();

  await database.batch([
    database
      .prepare(
        `INSERT INTO InvestorProfile
           (id, userId, experience, objective, horizon, investableCapitalRange,
            lossCapacity, riskComfort, understandsCapitalLoss, understandsIlliquidity,
            attentionLevel, version, completedAt, expiresAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET
           experience = excluded.experience,
           objective = excluded.objective,
           horizon = excluded.horizon,
           investableCapitalRange = excluded.investableCapitalRange,
           lossCapacity = excluded.lossCapacity,
           riskComfort = excluded.riskComfort,
           understandsCapitalLoss = 1,
           understandsIlliquidity = 1,
           attentionLevel = excluded.attentionLevel,
           version = excluded.version,
           completedAt = excluded.completedAt,
           expiresAt = excluded.expiresAt,
           updatedAt = excluded.updatedAt`
      )
      .bind(
        profileId,
        session.userId,
        validation.value.experience,
        validation.value.objective,
        validation.value.horizon,
        validation.value.investableCapitalRange,
        validation.value.lossCapacity,
        validation.value.riskComfort,
        attentionLevel,
        INVESTOR_PROFILE_VERSION,
        now,
        expiresAt,
        now,
        now
      ),
    database
      .prepare(
        `INSERT INTO AuditLog
           (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
         VALUES (?, 'user', ?, 'investor_profile_updated', 'User', ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        session.userId,
        session.userId,
        JSON.stringify({ version: INVESTOR_PROFILE_VERSION, attentionLevel, expiresAt }),
        requestIp(req),
        now
      ),
  ]);

  const stored = await findProfile(session.userId);
  return NextResponse.json(profileResponse(stored), { headers: noStore });
}

async function findProfile(userId: string) {
  return getD1()
    .prepare(
      `SELECT experience, objective, horizon, investableCapitalRange,
              lossCapacity, riskComfort, understandsCapitalLoss,
              understandsIlliquidity, attentionLevel, version,
              completedAt, expiresAt, updatedAt
       FROM InvestorProfile WHERE userId = ? LIMIT 1`
    )
    .bind(userId)
    .first<InvestorProfileRow>();
}

function profileResponse(profile: InvestorProfileRow | null) {
  const complete = isInvestorProfileCurrent(profile);
  return {
    complete,
    needsRefresh: Boolean(profile) && !complete,
    profile: profile
      ? {
          experience: profile.experience,
          objective: profile.objective,
          horizon: profile.horizon,
          investableCapitalRange: profile.investableCapitalRange,
          lossCapacity: profile.lossCapacity,
          riskComfort: profile.riskComfort,
          understandsCapitalLoss: Boolean(profile.understandsCapitalLoss),
          understandsIlliquidity: Boolean(profile.understandsIlliquidity),
          attentionLevel: profile.attentionLevel,
          version: profile.version,
          completedAt: profile.completedAt,
          expiresAt: profile.expiresAt,
          updatedAt: profile.updatedAt,
        }
      : null,
  };
}
