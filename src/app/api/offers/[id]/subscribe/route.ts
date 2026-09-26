import { NextRequest, NextResponse } from "next/server";
import { getUserSession, requireUser } from "@/lib/auth";
import { getD1, isoNow, requestIp } from "@/lib/d1";
import { computeInvestorInterest } from "@/lib/finance";
import { LEGAL_VERSIONS } from "@/lib/legal";
import { getBankTransferConfig, getPaymentCapabilities } from "@/lib/payment-capabilities";
import { getCountry } from "@/lib/countries";
import {
  createPayDunyaCheckout,
  getPayDunyaCheckoutUrl,
  getPayDunyaConfig,
} from "@/lib/payments/paydunya";
import {
  calculateInvestmentSharePct,
  calculateOfferAllocationPct,
  createSubscriptionEvidence,
  type SubscriptionOfferTerms,
} from "@/lib/subscription-evidence";
import {
  declaredInvestableCapitalMax,
  isInvestorProfileCurrent,
} from "@/lib/investor-profile";
import { effectivePrivateMaximum } from "@/lib/private-offer-access";
import {
  assessCollectionPayment,
  PAYMENT_POLICY_VERSION,
  paymentPolicySummary,
  type CollectionPaymentMethod,
} from "@/lib/payment-policy";
import {
  consumeApprovedComplianceCase,
  findApprovedComplianceCase,
  hashPaymentIp,
  loadPaymentUsage,
  recordBlockedAttempt,
  recordReviewCase,
} from "@/lib/payment-compliance";

interface OfferTermsRow extends SubscriptionOfferTerms {
  status: string;
  visibility: string;
  isDemo: number;
  privateMaxInvestment: number | null;
  committedAmount: number;
}

interface InvestorRow {
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: string;
  phone: string | null;
  country: string;
  profileCompletedAt: string | null;
  profileExpiresAt: string | null;
  investableCapitalRange: string | null;
  documentCountry: string | null;
  sourceOfFunds: string | null;
  politicallyExposed: number | null;
  actingForSelf: number | null;
}

interface InvestmentRow extends Record<string, unknown> {
  id: string;
  offerId: string;
  projectId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  signatureHash: string | null;
  paymentConfirmedAt: string | null;
  reflectionEndsAt: string | null;
  refundableUntil: string | null;
  createdAt: string;
  updatedAt: string;
  paymentRef: string | null;
  paymentMethod: CollectionPaymentMethod | null;
}

async function findOffer(id: string, userId?: string | null): Promise<OfferTermsRow | null> {
  return getD1()
    .prepare(
      `SELECT o.id, o.projectId, o.status, o.visibility, o.isDemo, o.closingDate,
              o.version, o.fundingGoal, o.committedAmount, o.minInvestment, o.maxInvestment,
              o.annualRate, o.ratePeriod, o.durationMonths, o.repaymentType,
              o.equityOfferedPct, o.valuationPre, o.upfrontCommissionPct,
              o.annualFollowUpPct,
              (SELECT i.maxInvestment FROM PrivateOfferInvitation i
               WHERE i.offerId = o.id AND i.userId = ? AND i.status = 'accepted'
               ORDER BY i.acceptedAt DESC LIMIT 1) AS privateMaxInvestment,
              p.instrumentType, p.title
       FROM Offer o
       JOIN Project p ON p.id = o.projectId
       WHERE o.id = ? AND (
         (o.visibility = 'public' AND (
           o.isDemo = 1 OR EXISTS (
             SELECT 1 FROM RegulatoryReview r
             WHERE r.projectId = o.projectId
               AND r.decision = 'cleared'
               AND r.distributionScope = 'public_offering'
               AND r.marketAuthorityPath = 'visa_obtained'
               AND r.corporateActsStatus = 'confirmed'
               AND r.paymentSafeguardingStatus = 'confirmed'
               AND r.beneficialOwnersStatus = 'confirmed'
               AND r.riskDisclosureStatus = 'confirmed'
               AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
               AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
               AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
               AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
               AND r.countryOpinionRef IS NOT NULL
               AND TRIM(r.countryOpinionRef) <> ''
               AND r.authorityReference IS NOT NULL
               AND TRIM(r.authorityReference) <> ''
               AND r.reviewedBy IS NOT NULL
               AND r.reviewedBy <> r.preparedBy
               AND r.reviewedAt IS NOT NULL
           )
         )) OR
         (o.visibility = 'restricted' AND o.isDemo = 0 AND EXISTS (
           SELECT 1 FROM RegulatoryReview r
           WHERE r.projectId = o.projectId
             AND r.decision = 'cleared'
             AND r.distributionScope = 'restricted_private'
             AND r.marketAuthorityPath IN ('private_route_confirmed', 'authority_clearance')
             AND r.corporateActsStatus = 'confirmed'
             AND r.paymentSafeguardingStatus = 'confirmed'
             AND r.beneficialOwnersStatus = 'confirmed'
             AND r.riskDisclosureStatus = 'confirmed'
             AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
             AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
             AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
             AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
             AND r.countryOpinionRef IS NOT NULL
             AND TRIM(r.countryOpinionRef) <> ''
             AND r.reviewedBy IS NOT NULL
             AND r.reviewedBy <> r.preparedBy
             AND r.reviewedAt IS NOT NULL
         ) AND EXISTS (
           SELECT 1 FROM PrivateOfferInvitation i
           WHERE i.offerId = o.id AND i.userId = ? AND i.status = 'accepted'
         ))
       )
       LIMIT 1`
    )
    .bind(userId || null, id, userId || null)
    .first<OfferTermsRow>();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getUserSession(req).catch(() => null);
  const amount = parseMoney(req.nextUrl.searchParams.get("amount"));
  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const offer = await findOffer(id, session?.userId);
  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  const offerAllocationPct = calculateOfferAllocationPct(amount, offer.fundingGoal);
  const sharePct = calculateInvestmentSharePct(
    amount,
    offer.fundingGoal,
    offer.instrumentType,
    offer.equityOfferedPct
  );
  if (offer.instrumentType === "debt") {
    const interest = computeInvestorInterest(
      BigInt(amount),
      offer.annualRate || 0,
      offer.ratePeriod === "annual" ? "annual" : "total",
      offer.durationMonths || 0
    );
    return NextResponse.json({
      instrument: "debt",
      sharePct,
      offerAllocationPct,
      expectedRepayment: amount + Number(interest),
      investorInterest: Number(interest),
      projectionLabel: "Projection contractuelle, sous réserve de remboursement par l'entreprise",
      paymentPolicy: paymentPolicySummary(),
    });
  }

  return NextResponse.json({
    instrument: "equity",
    sharePct,
    companyOwnershipPct: sharePct,
    offerAllocationPct,
    note: "La valeur et la liquidité des titres ne sont pas garanties.",
    paymentPolicy: paymentPolicySummary(),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const amount = parseMoney(body.amount);
  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }
  const paymentMethod = parsePaymentMethod(body.paymentMethod);
  if (!paymentMethod) {
    return NextResponse.json(
      { error: "Choisissez la carte bancaire, le Mobile Money ou le virement bancaire.", code: "PAYMENT_METHOD_REQUIRED" },
      { status: 422 }
    );
  }
  if (
    body.acceptTerms !== true ||
    body.acceptRisks !== true ||
    body.signatureIntent !== true ||
    body.agreementVersion !== LEGAL_VERSIONS.subscription
  ) {
    return NextResponse.json(
      {
        error: "Veuillez lire et accepter le bulletin de souscription ainsi que les risques.",
        code: "SUBSCRIPTION_ACCEPTANCE_REQUIRED",
      },
      { status: 422 }
    );
  }
  const locale = body.locale === "en" ? "en" : "fr";

  const { id } = await params;
  const database = getD1();
  const [offer, investor] = await Promise.all([
    findOffer(id, session.userId),
    database
      .prepare(
        `SELECT u.firstName, u.lastName, u.email, u.phone, u.country, u.kycStatus,
                ip.completedAt AS profileCompletedAt, ip.expiresAt AS profileExpiresAt,
                ip.investableCapitalRange,
                kp.documentCountry, kp.sourceOfFunds, kp.politicallyExposed, kp.actingForSelf
         FROM User u
         LEFT JOIN InvestorProfile ip ON ip.userId = u.id
         LEFT JOIN KycProfile kp ON kp.userId = u.id
         WHERE u.id = ? LIMIT 1`
      )
      .bind(session.userId)
      .first<InvestorRow>(),
  ]);

  if (!offer) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!investor) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (Number(offer.isDemo) === 1) {
    return NextResponse.json(
      {
        error: "Cette présentation est un exemple et n’accepte aucun versement.",
        code: "DEMO_OFFER",
      },
      { status: 403 }
    );
  }
  if (investor.kycStatus !== "verified") {
    return NextResponse.json(
      {
        error: "Vérification d'identité requise",
        code: "KYC_REQUIRED",
        message: "Finalisez la vérification de votre identité avant de souscrire.",
      },
      { status: 403 }
    );
  }
  if (!isInvestorProfileCurrent({ completedAt: investor.profileCompletedAt, expiresAt: investor.profileExpiresAt })) {
    return NextResponse.json(
      {
        error: "Votre projet d’investissement doit être complété avant de souscrire.",
        code: "INVESTOR_PROFILE_REQUIRED",
        message: "Répondez à six questions simples depuis votre espace personnel, puis reprenez votre souscription.",
      },
      { status: 403 }
    );
  }
  if (offer.status !== "open" || new Date(offer.closingDate).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Cette offre n'est plus ouverte" }, { status: 409 });
  }
  const permittedMaximum = effectivePrivateMaximum(
    offer.maxInvestment === null ? null : Number(offer.maxInvestment),
    offer.visibility === "restricted"
      ? offer.privateMaxInvestment === null
        ? null
        : Number(offer.privateMaxInvestment)
      : null
  );
  if (amount < Number(offer.minInvestment)) {
    return NextResponse.json(
      { error: `Montant minimum : ${Number(offer.minInvestment).toLocaleString("fr-FR")} FCFA` },
      { status: 400 }
    );
  }
  if (permittedMaximum !== null && amount > permittedMaximum) {
    return NextResponse.json(
      { error: `Montant maximum : ${permittedMaximum.toLocaleString("fr-FR")} FCFA` },
      { status: 400 }
    );
  }

  const existing = await database
    .prepare(
      `SELECT * FROM Investment
       WHERE offerId = ? AND investorId = ? AND status IN ('pending_payment', 'payment_pending')
       LIMIT 1`
    )
    .bind(id, session.userId)
    .first<InvestmentRow>();
  if (existing) {
    if (Number(existing.amount) !== amount) {
      return NextResponse.json(
        {
          error: `Un engagement de ${Number(existing.amount).toLocaleString("fr-FR")} FCFA est déjà en attente pour cette offre.`,
          code: "PENDING_INVESTMENT_EXISTS",
          existingAmount: Number(existing.amount),
        },
        { status: 409 }
      );
    }
    if (existing.paymentMethod !== paymentMethod) {
      return NextResponse.json(
        {
          error: "Un engagement existe déjà avec un autre moyen de paiement. Annulez-le depuis votre espace avant d'en choisir un nouveau.",
          code: "PENDING_PAYMENT_METHOD_LOCKED",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  const [capitalRow, offerCapitalRow] = await Promise.all([
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS activeCapital
         FROM Investment
         WHERE investorId = ? AND status IN ('pending_payment', 'payment_pending', 'confirmed')`
      )
      .bind(session.userId)
      .first<{ activeCapital: number }>(),
    database
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS offerCapital
         FROM Investment
         WHERE offerId = ? AND investorId = ?
           AND status IN ('pending_payment', 'payment_pending', 'confirmed')`
      )
      .bind(id, session.userId)
      .first<{ offerCapital: number }>(),
  ]);
  const activeCapital = Number(capitalRow?.activeCapital || 0);
  const projectedCapital = existing ? activeCapital : activeCapital + amount;
  const currentOfferCapital = Number(offerCapitalRow?.offerCapital || 0);
  const projectedOfferCapital = existing ? currentOfferCapital : currentOfferCapital + amount;
  const privateMaximum = offer.visibility === "restricted" && offer.privateMaxInvestment !== null
    ? Number(offer.privateMaxInvestment)
    : null;
  if (privateMaximum !== null && projectedOfferCapital > privateMaximum) {
    return NextResponse.json(
      {
        error: "Ce montant dépasse le plafond prévu dans votre invitation.",
        code: "PRIVATE_INVITATION_LIMIT",
        privateMaximum,
        projectedOfferCapital,
      },
      { status: 422 }
    );
  }
  const declaredCapacityMax = declaredInvestableCapitalMax(investor.investableCapitalRange);
  if (declaredCapacityMax !== null && projectedCapital > declaredCapacityMax) {
    return NextResponse.json(
      {
        error: "Ce montant dépasse la somme que vous avez indiquée comme disponible pour investir.",
        code: "AMOUNT_EXCEEDS_DECLARED_CAPACITY",
        message: "Choisissez un montant plus faible ou actualisez vos réponses depuis votre espace personnel.",
        declaredCapacityMax,
        projectedCapital,
      },
      { status: 422 }
    );
  }

  if (existing) {
    try {
      const signedInvestment = await ensureSubscriptionEvidence(req, existing, offer, locale);
      return paymentResponse(signedInvestment, offer, investor, true);
    } catch (error) {
      console.error("subscription_evidence_upgrade_failed", error instanceof Error ? error.message : "unknown_error");
      return NextResponse.json(
        { error: "La validation électronique n'a pas pu être enregistrée." },
        { status: 503 }
      );
    }
  }

  const complianceNow = isoNow();
  const ipHash = await hashPaymentIp(session.userId, requestIp(req));
  const paymentUserAgent = req.headers.get("user-agent")?.slice(0, 512) || null;
  const approvedCase = await findApprovedComplianceCase(database, {
    userId: session.userId,
    offerId: id,
    method: paymentMethod,
    amount,
  }, complianceNow);

  let paymentAssessment = assessCollectionPayment({ amount, method: paymentMethod });
  if (!approvedCase) {
    const usage = await loadPaymentUsage(database, session.userId, paymentMethod, complianceNow);
    paymentAssessment = assessCollectionPayment({
      amount,
      method: paymentMethod,
      usage,
      risk: {
        country: investor.country,
        documentCountry: investor.documentCountry,
        sourceOfFunds: investor.sourceOfFunds,
        politicallyExposed: Boolean(investor.politicallyExposed),
        actingForSelf: investor.actingForSelf === null ? undefined : Boolean(investor.actingForSelf),
      },
    });
    if (paymentAssessment.decision === "block") {
      await recordBlockedAttempt(database, {
        userId: session.userId,
        offerId: id,
        method: paymentMethod,
        amount,
        country: investor.country,
        assessment: paymentAssessment,
        ipHash,
        userAgent: paymentUserAgent,
      });
      return NextResponse.json(
        {
          error: paymentAssessment.reasons[0] || "Cette opération dépasse une limite de sécurité.",
          code: paymentAssessment.code,
          reasons: paymentAssessment.reasons,
          policy: paymentAssessment.policy,
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (paymentAssessment.decision === "review") {
      const caseId = await recordReviewCase(database, {
        userId: session.userId,
        offerId: id,
        method: paymentMethod,
        amount,
        country: investor.country,
        assessment: paymentAssessment,
        ipHash,
        userAgent: paymentUserAgent,
      });
      return NextResponse.json(
        {
          code: "PAYMENT_REVIEW_REQUIRED",
          caseId,
          message: "Votre demande est transmise à l'équipe pour vérification. Aucun montant n'a été débité.",
          reasons: paymentAssessment.reasons,
        },
        { status: 202, headers: { "Cache-Control": "no-store" } }
      );
    }
  } else {
    if (!(await consumeApprovedComplianceCase(database, approvedCase.id, complianceNow))) {
      return NextResponse.json(
        { error: "L'autorisation doit être renouvelée avant de poursuivre.", code: "PAYMENT_REVIEW_REQUIRED" },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }
    paymentAssessment = { ...paymentAssessment, decision: "allow", code: "PAYMENT_ALLOWED", reasons: [] };
  }

  const investmentId = crypto.randomUUID();
  const now = isoNow();
  const reflectionPeriodDays = getCountry(investor.country)?.reflectionPeriodDays ?? 14;
  const reflectionEndsAt = new Date(
    Date.now() + reflectionPeriodDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const sharePct = calculateInvestmentSharePct(
    amount,
    offer.fundingGoal,
    offer.instrumentType,
    offer.equityOfferedPct
  );
  const investorName = `${investor.firstName} ${investor.lastName}`.trim();
  const evidence = await createSubscriptionEvidence({
    investmentId,
    investorId: session.userId,
    investorEmail: investor.email,
    amount,
    sharePct,
    signedAt: now,
    locale,
    offer,
  });
  const userAgent = req.headers.get("user-agent")?.slice(0, 512) || null;
  const ipAddress = requestIp(req);
  const paymentAttemptId = crypto.randomUUID();

  try {
    const results = await database.batch([
      database
        .prepare(
          `INSERT INTO Investment
             (id, offerId, projectId, investorType, investorId, investorName, investorEmail,
              amount, sharePct, status, signedAt, signatureHash, paymentMethod,
              reflectionEndsAt, refundableUntil, createdAt, updatedAt)
           SELECT ?, o.id, o.projectId, 'individual', ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?
           FROM Offer o
           WHERE o.id = ?
             AND o.status = 'open'
             AND o.isDemo = 0
             AND (
               (o.visibility = 'public' AND EXISTS (
               SELECT 1 FROM RegulatoryReview r
               WHERE r.projectId = o.projectId
                 AND r.decision = 'cleared'
                 AND r.distributionScope = 'public_offering'
                 AND r.marketAuthorityPath = 'visa_obtained'
                 AND r.corporateActsStatus = 'confirmed'
                 AND r.paymentSafeguardingStatus = 'confirmed'
                 AND r.beneficialOwnersStatus = 'confirmed'
                 AND r.riskDisclosureStatus = 'confirmed'
                 AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
                 AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
                 AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
                 AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
                 AND r.countryOpinionRef IS NOT NULL
                 AND TRIM(r.countryOpinionRef) <> ''
                 AND r.authorityReference IS NOT NULL
                 AND TRIM(r.authorityReference) <> ''
                 AND r.reviewedBy IS NOT NULL
                 AND r.reviewedBy <> r.preparedBy
                 AND r.reviewedAt IS NOT NULL
               )) OR
               (o.visibility = 'restricted' AND EXISTS (
                 SELECT 1 FROM RegulatoryReview r
                 WHERE r.projectId = o.projectId
                   AND r.decision = 'cleared'
                   AND r.distributionScope = 'restricted_private'
                   AND r.marketAuthorityPath IN ('private_route_confirmed', 'authority_clearance')
                   AND r.corporateActsStatus = 'confirmed'
                   AND r.paymentSafeguardingStatus = 'confirmed'
                   AND r.beneficialOwnersStatus = 'confirmed'
                   AND r.riskDisclosureStatus = 'confirmed'
                   AND r.corporateApprovalRef IS NOT NULL AND TRIM(r.corporateApprovalRef) <> ''
                   AND r.paymentProviderName IS NOT NULL AND TRIM(r.paymentProviderName) <> ''
                   AND r.paymentProviderApprovalRef IS NOT NULL AND TRIM(r.paymentProviderApprovalRef) <> ''
                   AND r.fundSafeguardingRef IS NOT NULL AND TRIM(r.fundSafeguardingRef) <> ''
                   AND r.countryOpinionRef IS NOT NULL
                   AND TRIM(r.countryOpinionRef) <> ''
                   AND r.reviewedBy IS NOT NULL
                   AND r.reviewedBy <> r.preparedBy
                   AND r.reviewedAt IS NOT NULL
               ) AND EXISTS (
                 SELECT 1 FROM PrivateOfferInvitation i
                 WHERE i.offerId = o.id
                   AND i.userId = ?
                   AND i.status = 'accepted'
                   AND (i.maxInvestment IS NULL OR i.maxInvestment >= (
                     SELECT COALESCE(SUM(inv.amount), 0) + ?
                     FROM Investment inv
                     WHERE inv.offerId = o.id
                       AND inv.investorId = ?
                       AND inv.status IN ('pending_payment', 'payment_pending', 'confirmed')
                   ))
               ))
             )
             AND datetime(o.closingDate) > datetime(?)
             AND o.committedAmount + ? <= o.fundingGoal`
        )
        .bind(
          investmentId,
          session.userId,
          investorName,
          investor.email,
          amount,
          sharePct,
          now,
          evidence.signedPayloadHash,
          paymentMethod,
          reflectionEndsAt,
          reflectionEndsAt,
          now,
          now,
          id,
          session.userId,
          amount,
          session.userId,
          now,
          amount
        ),
      database
        .prepare(
          `INSERT INTO SubscriptionEvidence
             (id, investmentId, offerId, investorId, offerVersion,
              agreementVersion, termsVersion, riskVersion, agreementSnapshot,
              agreementHash, signedPayloadHash, signatureMethod, locale,
              termsAcceptedAt, riskAcceptedAt, signedAt, ipAddress, userAgent, createdAt)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'authenticated_clickwrap', ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          investmentId,
          id,
          session.userId,
          offer.version,
          LEGAL_VERSIONS.subscription,
          LEGAL_VERSIONS.terms,
          LEGAL_VERSIONS.risk,
          evidence.agreementSnapshot,
          evidence.agreementHash,
          evidence.signedPayloadHash,
          locale,
          now,
          now,
          now,
          ipAddress,
          userAgent,
          now,
          investmentId
        ),
      database
        .prepare(
          `INSERT INTO PaymentAttempt
             (id, userId, offerId, investmentId, method, amount, currency, country,
              decision, status, riskScore, reasons, policyVersion, ipHash, userAgent,
              createdAt, updatedAt)
           SELECT ?, ?, ?, ?, ?, ?, 'XOF', ?, 'allow', 'allowed', ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          paymentAttemptId,
          session.userId,
          id,
          investmentId,
          paymentMethod,
          amount,
          investor.country,
          paymentAssessment.riskScore,
          JSON.stringify(paymentAssessment.reasons),
          PAYMENT_POLICY_VERSION,
          ipHash,
          paymentUserAgent,
          now,
          now,
          investmentId
        ),
      database
        .prepare(
          `UPDATE Offer SET committedAmount = committedAmount + ?
           WHERE id = ? AND EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(amount, id, investmentId),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'investment_subscribed', 'investment', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          investmentId,
          JSON.stringify({
            offerId: id,
            amount,
            sharePct,
            agreementVersion: LEGAL_VERSIONS.subscription,
            agreementHash: evidence.agreementHash,
            signatureMethod: "authenticated_clickwrap",
            paymentStatus: "awaiting_provider",
            paymentMethod,
            paymentPolicyVersion: PAYMENT_POLICY_VERSION,
            reflectionPeriodDays,
          }),
          ipAddress,
          now,
          investmentId
        ),
      database
        .prepare(
          `INSERT INTO Notification (id, userId, type, title, message, read, actionUrl, createdAt)
           SELECT ?, ?, 'investment', 'Souscription enregistrée', ?, 0, 'investor_dashboard', ?
           WHERE EXISTS (SELECT 1 FROM Investment WHERE id = ?)`
        )
        .bind(
          crypto.randomUUID(),
          session.userId,
          `Votre engagement de ${amount.toLocaleString("fr-FR")} FCFA pour « ${offer.title} » est en attente de paiement.`,
          now,
          investmentId
        ),
    ]);

    if ((results[0].meta.changes || 0) !== 1) {
      return NextResponse.json({ error: "Montant indisponible ou offre clôturée" }, { status: 409 });
    }
  } catch (error) {
    const concurrent = await database
      .prepare(
        `SELECT * FROM Investment
         WHERE offerId = ? AND investorId = ? AND status IN ('pending_payment', 'payment_pending')
         LIMIT 1`
      )
      .bind(id, session.userId)
      .first<InvestmentRow>();
    if (concurrent) return paymentResponse(concurrent, offer, investor, true);
    console.error("investment_subscribe_failed", error);
    return NextResponse.json({ error: "Souscription temporairement indisponible" }, { status: 503 });
  }

  const investment = await database
    .prepare(`SELECT * FROM Investment WHERE id = ? LIMIT 1`)
    .bind(investmentId)
    .first<InvestmentRow>();
  if (!investment) {
    return NextResponse.json({ error: "Souscription non enregistrée" }, { status: 503 });
  }
  return paymentResponse(investment, offer, investor, false);
}

async function paymentResponse(
  investment: InvestmentRow,
  offer: OfferTermsRow,
  investor: InvestorRow,
  idempotent: boolean
) {
  if (!investment.signedAt || !investment.signatureHash) {
    return NextResponse.json(
      { error: "La validation électronique doit être enregistrée avant le paiement." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }
  const evidence = await getD1()
    .prepare(
      `SELECT id FROM SubscriptionEvidence
       WHERE investmentId = ? AND signedPayloadHash = ? LIMIT 1`
    )
    .bind(investment.id, investment.signatureHash)
    .first<{ id: string }>();
  if (!evidence) {
    return NextResponse.json(
      { error: "La preuve de souscription doit être validée avant le paiement." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  const capabilities = getPaymentCapabilities();
  const config = getPayDunyaConfig();

  if (investment.paymentMethod === "bank_transfer") {
    const bankTransfer = getBankTransferConfig();
    if (bankTransfer) {
      const now = isoNow();
      await getD1()
        .prepare(
          `UPDATE PaymentAttempt SET status = 'provider_pending', updatedAt = ?
           WHERE investmentId = ? AND status = 'allowed'`
        )
        .bind(now, investment.id)
        .run();
      return NextResponse.json(
        {
          investment: normalizeInvestment({ ...investment, status: "payment_pending" }),
          idempotent,
          payment: {
            status: "bank_instructions_ready",
            availableMethods: ["bank_transfer"],
            provider: bankTransfer.bankName,
            instructions: {
              bankName: bankTransfer.bankName,
              beneficiary: bankTransfer.beneficiary,
              accountReference: bankTransfer.accountReference,
              transferReference: investment.id,
              amount: Number(investment.amount),
              currency: "XOF",
            },
            message: "Utilisez exactement la référence indiquée. La souscription sera confirmée après rapprochement bancaire.",
          },
        },
        { status: idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        investment: normalizeInvestment(investment),
        idempotent,
        payment: {
          status: "awaiting_bank_setup",
          availableMethods: [],
          message: "Votre demande est autorisée. Les coordonnées bancaires seront affichées dès validation du compte de collecte.",
        },
      },
      { status: idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (capabilities.collectionsEnabled && config) {
    try {
      let paymentRef = investment.paymentRef;
      let checkoutUrl: string;

      if (paymentRef) {
        checkoutUrl = getPayDunyaCheckoutUrl(paymentRef, config.mode);
      } else {
        const origin = config.publicAppUrl;
        const checkout = await createPayDunyaCheckout(config, {
        amount: Number(investment.amount),
        description: `Souscription à l'offre « ${offer.title} »`,
        itemName: "Souscription d'investissement privé",
        customer: {
          name: investment.investorName,
          email: investment.investorEmail,
          phone: investor.phone,
        },
        customData: {
          flow: "investment",
          investmentId: investment.id,
          offerId: investment.offerId,
          paymentMethod: investment.paymentMethod || "card",
          paymentPolicyVersion: PAYMENT_POLICY_VERSION,
        },
        callbackUrl: `${origin}/api/payments/paydunya/webhook`,
        returnUrl: `${origin}/?payment=return`,
        cancelUrl: `${origin}/?payment=cancelled`,
        });

        const now = isoNow();
        await getD1()
        .prepare(
          `UPDATE Investment
           SET paymentRef = ?, status = 'payment_pending', updatedAt = ?
           WHERE id = ? AND paymentRef IS NULL AND status = 'pending_payment'`
        )
        .bind(checkout.token, now, investment.id)
        .run();

        await getD1()
          .prepare(
            `UPDATE PaymentAttempt SET status = 'provider_pending', providerRef = ?, updatedAt = ?
             WHERE investmentId = ? AND status = 'allowed'`
          )
          .bind(checkout.token, now, investment.id)
          .run();

        const stored = await getD1()
        .prepare(`SELECT paymentRef FROM Investment WHERE id = ? LIMIT 1`)
        .bind(investment.id)
        .first<{ paymentRef: string | null }>();
        if (!stored?.paymentRef) {
          throw new Error("La transaction n'a pas pu être enregistrée");
        }
        paymentRef = stored.paymentRef;
        checkoutUrl =
          paymentRef === checkout.token
            ? checkout.checkoutUrl
            : getPayDunyaCheckoutUrl(paymentRef, config.mode);
      }

      return NextResponse.json(
        {
          investment: normalizeInvestment({ ...investment, paymentRef, status: "payment_pending" }),
          idempotent,
          payment: {
            status: "ready",
            availableMethods: capabilities.collectionMethods,
            checkoutUrl,
            provider: "PayDunya",
            message: "Choisissez la carte bancaire ou le Mobile Money sur la page de paiement sécurisée.",
          },
        },
        { status: idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      console.error(
        "payment_checkout_create_failed",
        error instanceof Error ? error.message : "unknown_error"
      );
      return NextResponse.json(
        {
          error: "Le paiement sécurisé est momentanément indisponible. Votre engagement reste enregistré.",
          code: "PAYMENT_PROVIDER_UNAVAILABLE",
          investment: normalizeInvestment(investment),
        },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  return NextResponse.json(
    {
      investment: normalizeInvestment(investment),
      idempotent,
      payment: {
        status: "awaiting_provider",
        availableMethods: [],
        message:
          "Votre engagement est enregistré. Le paiement sera proposé après activation du prestataire carte et Mobile Money.",
      },
      nextSteps: [
        "Lire le récapitulatif et les risques",
        "Conserver le justificatif de validation électronique",
        "Régler via un prestataire de paiement habilité",
        "Recevoir la confirmation automatique des fonds",
      ],
    },
    { status: idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } }
  );
}

async function ensureSubscriptionEvidence(
  req: NextRequest,
  investment: InvestmentRow,
  offer: OfferTermsRow,
  locale: "fr" | "en"
): Promise<InvestmentRow> {
  const database = getD1();
  const stored = await database
    .prepare(
      `SELECT signedAt, signedPayloadHash
       FROM SubscriptionEvidence WHERE investmentId = ? LIMIT 1`
    )
    .bind(investment.id)
    .first<{ signedAt: string; signedPayloadHash: string }>();

  if (stored) {
    if (
      investment.signedAt !== stored.signedAt ||
      investment.signatureHash !== stored.signedPayloadHash
    ) {
      await database
        .prepare(
          `UPDATE Investment SET signedAt = ?, signatureHash = ?, updatedAt = ?
           WHERE id = ? AND status IN ('pending_payment', 'payment_pending')`
        )
        .bind(stored.signedAt, stored.signedPayloadHash, isoNow(), investment.id)
        .run();
    }
  } else {
    const signedAt = isoNow();
    const evidence = await createSubscriptionEvidence({
      investmentId: investment.id,
      investorId: investment.investorId,
      investorEmail: investment.investorEmail,
      amount: Number(investment.amount),
      sharePct: Number(investment.sharePct),
      signedAt,
      locale,
      offer,
    });
    await database.batch([
      database
        .prepare(
          `INSERT OR IGNORE INTO SubscriptionEvidence
             (id, investmentId, offerId, investorId, offerVersion,
              agreementVersion, termsVersion, riskVersion, agreementSnapshot,
              agreementHash, signedPayloadHash, signatureMethod, locale,
              termsAcceptedAt, riskAcceptedAt, signedAt, ipAddress, userAgent, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'authenticated_clickwrap', ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          investment.id,
          investment.offerId,
          investment.investorId,
          offer.version,
          LEGAL_VERSIONS.subscription,
          LEGAL_VERSIONS.terms,
          LEGAL_VERSIONS.risk,
          evidence.agreementSnapshot,
          evidence.agreementHash,
          evidence.signedPayloadHash,
          locale,
          signedAt,
          signedAt,
          signedAt,
          requestIp(req),
          req.headers.get("user-agent")?.slice(0, 512) || null,
          signedAt
        ),
      database
        .prepare(
          `UPDATE Investment
           SET signedAt = (SELECT signedAt FROM SubscriptionEvidence WHERE investmentId = ?),
               signatureHash = (SELECT signedPayloadHash FROM SubscriptionEvidence WHERE investmentId = ?),
               updatedAt = ?
           WHERE id = ? AND status IN ('pending_payment', 'payment_pending')
             AND EXISTS (SELECT 1 FROM SubscriptionEvidence WHERE investmentId = ?)`
        )
        .bind(investment.id, investment.id, signedAt, investment.id, investment.id),
      database
        .prepare(
          `INSERT INTO AuditLog
             (id, actorType, actorId, action, entityType, entityId, metadata, ipAddress, createdAt)
           SELECT ?, 'user', ?, 'subscription_evidence_recorded', 'investment', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM SubscriptionEvidence WHERE investmentId = ?)`
        )
        .bind(
          crypto.randomUUID(),
          investment.investorId,
          investment.id,
          JSON.stringify({
            agreementVersion: LEGAL_VERSIONS.subscription,
            agreementHash: evidence.agreementHash,
            signatureMethod: "authenticated_clickwrap",
          }),
          requestIp(req),
          signedAt,
          investment.id
        ),
    ]);
  }

  const signedInvestment = await database
    .prepare(`SELECT * FROM Investment WHERE id = ? LIMIT 1`)
    .bind(investment.id)
    .first<InvestmentRow>();
  if (!signedInvestment?.signedAt || !signedInvestment.signatureHash) {
    throw new Error("subscription_evidence_missing");
  }
  return signedInvestment;
}

function normalizeInvestment(row: InvestmentRow) {
  return {
    ...row,
    amount: Number(row.amount),
    sharePct: Number(row.sharePct),
  };
}

function parseMoney(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isSafeInteger(amount) ? amount : null;
}

function parsePaymentMethod(value: unknown): CollectionPaymentMethod | null {
  return value === "card" || value === "mobile_money" || value === "bank_transfer" ? value : null;
}
