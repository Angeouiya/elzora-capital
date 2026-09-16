import { test, expect, type Browser, type BrowserContext } from "@playwright/test";

const baseURL = process.env.VISUAL_BASE_URL ?? "http://localhost:3000";
const password = "password123";

async function login(
  browser: Browser,
  email: string,
  expectedPath: string,
  admin = false
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}${admin ? "/admin/connexion" : "/connexion"}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  // Le tout premier écran compilé par Next.js en mode dev peut avoir son DOM prêt
  // quelques instants avant l'hydratation React. On attend donc la stabilisation
  // réseau puis on valide la session côté serveur au lieu de dépendre uniquement
  // de la vitesse de la redirection client.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /se connecter/i }).click();

  await expect
    .poll(
      async () => {
        const response = await context.request.get(`${baseURL}/api/auth/session`);
        if (!response.ok()) return "";
        const session = (await response.json()) as { user?: { email?: string } } | null;
        return session?.user?.email ?? "";
      },
      { timeout: 25_000, intervals: [250, 500, 1000] }
    )
    .toBe(email);

  if (!new URL(page.url()).pathname.startsWith(expectedPath)) {
    await page.goto(`${baseURL}${expectedPath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  }
  expect(new URL(page.url()).pathname.startsWith(expectedPath)).toBeTruthy();
  await page.close();
  return context;
}

async function body<T>(response: { json(): Promise<unknown> }): Promise<T> {
  return (await response.json()) as T;
}

test("complete financing lifecycle keeps financial controls separated", async ({ browser }) => {
  test.setTimeout(4 * 60_000);

  const enterprise = await login(browser, "entreprise@nexora.ci", "/entreprise/dashboard");
  const investor = await login(browser, "investisseur@nexora.ci", "/dashboard");
  const admin1 = await login(browser, "admin@nexora.ci", "/admin/dashboard", true);
  const admin2 = await login(browser, "admin2@nexora.ci", "/admin/dashboard", true);

  try {
    const projectResponse = await enterprise.request.post(`${baseURL}/api/projects`, {
      data: {
        title: "CI — financement contrôlé",
        description: "Dossier synthétique créé par le test de bout en bout pour contrôler le cycle financier.",
        sector: "Commerce & Distribution",
        country: "CI",
        city: "Abidjan",
        totalAmount: 150000,
        ownContribution: 50000,
        requestedAmount: 100000,
        usageDescription: "Achat de stock avec rotation courte.",
        budget: JSON.stringify({
          lines: [{ label: "Stock", amount: 150000 }],
          conditions: {
            type: "DEBT",
            rate: 800,
            ratePeriod: "TOTAL",
            duration: 6,
            minTicket: 10000,
            maxTicket: 100000,
            minimumGoal: 10000,
            paymentFrequency: "MONTHLY",
            repaymentMode: "BULLET",
            graceMonths: 0,
            interestBase: "ORIGINAL_PRINCIPAL",
            earlyRepayment: "ALLOWED",
            guaranteeSummary: "Engagement contractuel de l'entreprise",
            guaranteeRank: "Non privilégié",
          },
          forecasts: {
            expectedRevenue: 50000,
            repaymentSource: "Revenus d'exploitation",
            revenueDetails: "Rotation de stock et encaissements clients.",
          },
        }),
      },
    });
    expect(projectResponse.status()).toBe(201);
    const project = await body<{ id: string }>(projectResponse);

    const submitResponse = await enterprise.request.post(`${baseURL}/api/projects/${project.id}/submit`);
    expect(submitResponse.ok()).toBeTruthy();
    expect((await body<{ status: string }>(submitResponse)).status).toBe("SUBMITTED");

    const approveResponse = await admin1.request.post(`${baseURL}/api/projects/${project.id}/approve`);
    expect(approveResponse.ok()).toBeTruthy();
    expect((await body<{ status: string }>(approveResponse)).status).toBe("APPROVED");

    const structureResponse = await admin1.request.post(`${baseURL}/api/admin/offers`, {
      data: { projectId: project.id },
    });
    expect(structureResponse.status()).toBe(201);
    const offer = await body<{ id: string; status: string; targetAmount: number }>(structureResponse);
    expect(offer.status).toBe("DRAFT");
    expect(offer.targetAmount).toBe(100000);

    const confirmTermsResponse = await enterprise.request.post(`${baseURL}/api/offers/${offer.id}/confirm`);
    expect(confirmTermsResponse.ok()).toBeTruthy();
    expect((await body<{ status: string }>(confirmTermsResponse)).status).toBe("OFFER_CONFIRMED");

    const now = new Date();
    const closing = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const publishResponse = await admin1.request.patch(`${baseURL}/api/admin/offers/${offer.id}`, {
      data: { action: "publish", startDate: now.toISOString(), endDate: closing.toISOString() },
    });
    expect(publishResponse.ok()).toBeTruthy();
    expect((await body<{ status: string }>(publishResponse)).status).toBe("PUBLISHED");

    const reserveResponse = await investor.request.post(`${baseURL}/api/investments`, {
      data: { offerId: offer.id, amount: 10000, method: "TRANSFER" },
    });
    expect(reserveResponse.status()).toBe(201);
    const reservation = await body<{
      id: string;
      status: string;
      payment: { id: string; status: string };
    }>(reserveResponse);
    expect(reservation.status).toBe("PENDING");
    expect(reservation.payment.status).toBe("PENDING");

    const beforeConfirm = await investor.request.get(`${baseURL}/api/offers/${offer.id}`);
    expect((await body<{ collectedAmount: number }>(beforeConfirm)).collectedAmount).toBe(0);

    const confirmPaymentResponse = await admin1.request.post(
      `${baseURL}/api/payments/${reservation.payment.id}/confirm`
    );
    expect(confirmPaymentResponse.ok()).toBeTruthy();

    const afterConfirm = await investor.request.get(`${baseURL}/api/offers/${offer.id}`);
    expect((await body<{ collectedAmount: number }>(afterConfirm)).collectedAmount).toBe(10000);

    const closeResponse = await admin1.request.patch(`${baseURL}/api/admin/offers/${offer.id}`, {
      data: { action: "close" },
    });
    expect(closeResponse.ok()).toBeTruthy();
    expect((await body<{ status: string }>(closeResponse)).status).toBe("CLOSED_SUCCESS");

    const disbursementRequest = await enterprise.request.post(`${baseURL}/api/disbursements`, {
      data: { offerId: offer.id, amount: 9400 },
    });
    expect(disbursementRequest.status()).toBe(201);
    const disbursement = await body<{ id: string; status: string }>(disbursementRequest);
    expect(disbursement.status).toBe("PENDING");

    const approveDisbursement = await admin1.request.post(
      `${baseURL}/api/disbursements/${disbursement.id}/approve`
    );
    expect(approveDisbursement.ok()).toBeTruthy();

    const sameActorExecution = await admin1.request.post(
      `${baseURL}/api/disbursements/${disbursement.id}/execute`
    );
    expect(sameActorExecution.status()).toBe(409);

    const secondActorExecution = await admin2.request.post(
      `${baseURL}/api/disbursements/${disbursement.id}/execute`
    );
    expect(secondActorExecution.ok()).toBeTruthy();
    const execution = await body<{ scheduleCreated: boolean }>(secondActorExecution);
    expect(execution.scheduleCreated).toBeTruthy();

    const repaymentsResponse = await enterprise.request.get(`${baseURL}/api/repayments?offerId=${offer.id}`);
    expect(repaymentsResponse.ok()).toBeTruthy();
    const repayments = await body<Array<{ id: string; status: string }>>(repaymentsResponse);
    expect(repayments.length).toBeGreaterThan(0);
    const firstRepayment = repayments[0];

    const declareRepayment = await enterprise.request.post(
      `${baseURL}/api/repayments/${firstRepayment.id}/pay`
    );
    expect(declareRepayment.ok()).toBeTruthy();
    expect((await body<{ status: string }>(declareRepayment)).status).toBe("VERIFICATION");

    const reconcileRepayment = await admin1.request.post(
      `${baseURL}/api/admin/repayments/${firstRepayment.id}/confirm`
    );
    expect(reconcileRepayment.ok()).toBeTruthy();
    expect((await body<{ status: string }>(reconcileRepayment)).status).toBe("PAID");

    const distributionsResponse = await investor.request.get(`${baseURL}/api/distributions`);
    expect(distributionsResponse.ok()).toBeTruthy();
    const distributions = await body<Array<{ id: string; investmentId: string; repaymentId: string; status: string }>>(
      distributionsResponse
    );
    const distribution = distributions.find(
      (row) => row.investmentId === reservation.id && row.repaymentId === firstRepayment.id
    );
    expect(distribution).toBeTruthy();
    expect(distribution?.status).toBe("AVAILABLE");

    const withdrawalRequest = await investor.request.post(`${baseURL}/api/distributions/withdraw`, {
      data: { distributionIds: [distribution!.id] },
    });
    expect(withdrawalRequest.ok()).toBeTruthy();

    const pendingWithdrawalRows = await investor.request.get(`${baseURL}/api/distributions`);
    const pendingRows = await body<Array<{ id: string; status: string }>>(pendingWithdrawalRows);
    expect(pendingRows.find((row) => row.id === distribution!.id)?.status).toBe("WITHDRAWAL_PENDING");

    const confirmWithdrawal = await admin1.request.post(
      `${baseURL}/api/admin/distributions/withdraw/confirm`,
      { data: { distributionIds: [distribution!.id] } }
    );
    expect(confirmWithdrawal.ok()).toBeTruthy();

    const finalRowsResponse = await investor.request.get(`${baseURL}/api/distributions`);
    const finalRows = await body<Array<{ id: string; status: string }>>(finalRowsResponse);
    expect(finalRows.find((row) => row.id === distribution!.id)?.status).toBe("WITHDRAWN");
  } finally {
    await Promise.all([enterprise.close(), investor.close(), admin1.close(), admin2.close()]);
  }
});
