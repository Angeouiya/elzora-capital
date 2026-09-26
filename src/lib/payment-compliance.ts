import { isoNow } from "@/lib/d1";
import type {
  CollectionPaymentMethod,
  PaymentPolicyAssessment,
  PaymentUsageSnapshot,
} from "@/lib/payment-policy";
import { PAYMENT_POLICY_VERSION } from "@/lib/payment-policy";

interface UsageRow {
  dailyTotal: number;
  monthlyTotal: number;
  dailyCount: number;
  monthlyCount: number;
  recent15mCount: number;
  allMethods24hCount: number;
  distinctMethods24h: number;
}

export interface ApprovedComplianceCase {
  id: string;
}

export async function loadPaymentUsage(
  database: D1Database,
  userId: string,
  method: CollectionPaymentMethod,
  now = isoNow()
): Promise<PaymentUsageSnapshot> {
  const row = await database
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('allowed','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-24 hours') THEN amount ELSE 0 END), 0) AS dailyTotal,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('allowed','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-30 days') THEN amount ELSE 0 END), 0) AS monthlyTotal,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('allowed','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-24 hours') THEN 1 ELSE 0 END), 0) AS dailyCount,
         COALESCE(SUM(CASE WHEN method = ? AND status IN ('allowed','provider_pending','confirmed') AND datetime(createdAt) >= datetime(?, '-30 days') THEN 1 ELSE 0 END), 0) AS monthlyCount,
         COALESCE(SUM(CASE WHEN datetime(createdAt) >= datetime(?, '-15 minutes') THEN 1 ELSE 0 END), 0) AS recent15mCount,
         COALESCE(SUM(CASE WHEN datetime(createdAt) >= datetime(?, '-24 hours') THEN 1 ELSE 0 END), 0) AS allMethods24hCount,
         COUNT(DISTINCT CASE WHEN datetime(createdAt) >= datetime(?, '-24 hours') THEN method END) AS distinctMethods24h
       FROM PaymentAttempt WHERE userId = ?`
    )
    .bind(method, now, method, now, method, now, method, now, now, now, now, userId)
    .first<UsageRow>();
  return {
    dailyTotal: Number(row?.dailyTotal || 0),
    monthlyTotal: Number(row?.monthlyTotal || 0),
    dailyCount: Number(row?.dailyCount || 0),
    monthlyCount: Number(row?.monthlyCount || 0),
    recent15mCount: Number(row?.recent15mCount || 0),
    allMethods24hCount: Number(row?.allMethods24hCount || 0),
    distinctMethods24h: Number(row?.distinctMethods24h || 0),
  };
}

export async function hashPaymentIp(userId: string, ipAddress: string): Promise<string | null> {
  if (!ipAddress || ipAddress === "unknown") return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userId}:${ipAddress}`)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function findApprovedComplianceCase(
  database: D1Database,
  input: { userId: string; offerId: string; method: CollectionPaymentMethod; amount: number },
  now = isoNow()
): Promise<ApprovedComplianceCase | null> {
  return database
    .prepare(
      `SELECT id FROM ComplianceCase
       WHERE userId = ? AND offerId = ? AND method = ? AND amount = ?
         AND status = 'approved' AND datetime(approvalExpiresAt) > datetime(?)
       ORDER BY updatedAt DESC LIMIT 1`
    )
    .bind(input.userId, input.offerId, input.method, input.amount, now)
    .first<ApprovedComplianceCase>();
}

export async function consumeApprovedComplianceCase(
  database: D1Database,
  caseId: string,
  now = isoNow()
): Promise<boolean> {
  const result = await database
    .prepare(
      `UPDATE ComplianceCase SET status = 'consumed', consumedAt = ?, updatedAt = ?
       WHERE id = ? AND status = 'approved' AND datetime(approvalExpiresAt) > datetime(?)`
    )
    .bind(now, now, caseId, now)
    .run();
  return Number(result.meta.changes || 0) === 1;
}

export async function recordBlockedAttempt(
  database: D1Database,
  input: {
    userId: string;
    offerId: string;
    method: CollectionPaymentMethod;
    amount: number;
    country: string;
    assessment: PaymentPolicyAssessment;
    ipHash: string | null;
    userAgent: string | null;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = isoNow();
  await database.batch([
    database
      .prepare(
        `INSERT INTO PaymentAttempt
           (id, userId, offerId, method, amount, currency, country, decision, status,
            riskScore, reasons, policyVersion, ipHash, userAgent, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'XOF', ?, 'block', 'blocked', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.userId, input.offerId, input.method, input.amount, input.country,
        input.assessment.riskScore, JSON.stringify(input.assessment.reasons), PAYMENT_POLICY_VERSION,
        input.ipHash, input.userAgent, now, now),
    database
      .prepare(
        `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, createdAt)
         VALUES (?, 'user', ?, 'payment.blocked', 'PaymentAttempt', ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), input.userId, id, JSON.stringify({ method: input.method, amount: input.amount, code: input.assessment.code, reasons: input.assessment.reasons, policyVersion: PAYMENT_POLICY_VERSION }), now),
  ]);
  return id;
}

export async function recordReviewCase(
  database: D1Database,
  input: {
    userId: string;
    offerId: string;
    method: CollectionPaymentMethod;
    amount: number;
    country: string;
    assessment: PaymentPolicyAssessment;
    ipHash: string | null;
    userAgent: string | null;
  }
): Promise<string> {
  const existing = await database
    .prepare(
      `SELECT id FROM ComplianceCase WHERE userId = ? AND offerId = ? AND method = ? AND amount = ?
       AND status IN ('open','reviewing') ORDER BY createdAt DESC LIMIT 1`
    )
    .bind(input.userId, input.offerId, input.method, input.amount)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const attemptId = crypto.randomUUID();
  const caseId = crypto.randomUUID();
  const now = isoNow();
  const severity = input.assessment.riskScore >= 70 ? "critical" : input.assessment.riskScore >= 40 ? "high" : "standard";
  await database.batch([
    database
      .prepare(
        `INSERT INTO PaymentAttempt
           (id, userId, offerId, method, amount, currency, country, decision, status,
            riskScore, reasons, policyVersion, ipHash, userAgent, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'XOF', ?, 'review', 'review', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(attemptId, input.userId, input.offerId, input.method, input.amount, input.country,
        input.assessment.riskScore, JSON.stringify(input.assessment.reasons), PAYMENT_POLICY_VERSION,
        input.ipHash, input.userAgent, now, now),
    database
      .prepare(
        `INSERT INTO ComplianceCase
           (id, paymentAttemptId, userId, offerId, method, amount, severity, riskScore,
            reasons, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
      )
      .bind(caseId, attemptId, input.userId, input.offerId, input.method, input.amount,
        severity, input.assessment.riskScore, JSON.stringify(input.assessment.reasons), now, now),
    database
      .prepare(
        `INSERT INTO AuditLog (id, actorType, actorId, action, entityType, entityId, metadata, createdAt)
         VALUES (?, 'system', NULL, 'compliance_case.opened', 'ComplianceCase', ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), caseId, JSON.stringify({ attemptId, method: input.method, amount: input.amount, riskScore: input.assessment.riskScore, policyVersion: PAYMENT_POLICY_VERSION }), now),
    database
      .prepare(
        `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
         VALUES (?, ?, 'verification', 'Vérification du paiement',
                 'Votre demande est en cours de vérification. Aucun montant n''a été débité.', 0, 'investor_dashboard', ?)`
      )
      .bind(crypto.randomUUID(), input.userId, now),
  ]);
  return caseId;
}
