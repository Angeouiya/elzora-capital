import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:3000";
const password = "password123";
const OFFER_OPEN = "cmu2u3b790008l5fogiw8ergl";
const OFFER_CLOSED = "cmu2u3bet0014l5fok4xk3oa8";
const PROJECT = "cmu2u3b6q0006l5fos1pousvx";

const publicRoutes = [
  "/",
  "/offres",
  `/offres/${OFFER_OPEN}`,
  "/fonctionnement",
  "/tarification",
  "/risques",
  "/ressources",
  "/contact",
  "/reclamations",
  "/cgu",
  "/confidentialite",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/entreprise",
];

const investorRoutes = [
  "/dashboard",
  "/dashboard/investissements",
  "/dashboard/paiements",
  "/dashboard/documents",
  "/dashboard/retrait",
  "/dashboard/favoris",
  "/dashboard/messages",
  "/dashboard/assistance",
  "/notifications",
  "/profil",
  "/parametres",
  "/verification",
  "/historique",
  `/offres/${OFFER_OPEN}/souscrire`,
];

const enterpriseRoutes = [
  "/entreprise/dashboard",
  "/entreprise/projet/nouveau",
  `/entreprise/projet/${PROJECT}`,
  "/entreprise/conditions",
  "/entreprise/financements",
  `/entreprise/financements/${OFFER_CLOSED}/rembourser`,
  "/entreprise/rapports",
  "/entreprise/documents",
  "/entreprise/equipe",
  "/entreprise/messages",
  "/profil",
  "/parametres",
  "/verification",
];

const adminRoutes = [
  "/admin/dashboard",
  "/admin/utilisateurs",
  "/admin/analyse",
  "/admin/offres",
  "/admin/finances",
  "/admin/comptabilite",
  "/admin/commissions",
  "/admin/risques",
  "/admin/contrats",
  "/admin/assistance",
  "/admin/acquisition",
  "/admin/configuration",
  "/admin/securite",
  "/admin/audit",
  "/admin/reporting",
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const screenshotsDir = path.resolve("artifacts/visual");
fs.mkdirSync(screenshotsDir, { recursive: true });

function safeName(value: string) {
  const normalized = value.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return normalized || "home";
}

async function login(
  browser: Browser,
  viewport: { width: number; height: number },
  email: string,
  expectedPath: string,
  admin = false
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseURL}${admin ? "/admin/connexion" : "/connexion"}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 20_000 }),
    page.getByRole("button", { name: /se connecter/i }).click(),
  ]);
  await page.close();
  return context;
}

async function auditRoute(
  context: BrowserContext,
  route: string,
  label: string,
  viewportName: string,
  failures: string[]
) {
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });

  try {
    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(900);

    const finalURL = new URL(page.url());
    const status = response?.status() ?? 0;
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );

    if (!response || status >= 400) failures.push(`${viewportName} ${label} ${route}: HTTP ${status || "none"}`);
    if (finalURL.origin !== baseURL) failures.push(`${viewportName} ${label} ${route}: external redirect ${page.url()}`);
    if (/404|page not found/i.test(bodyText) && status === 404) failures.push(`${viewportName} ${label} ${route}: 404 rendered`);
    if (/Application error|Internal Server Error|Unhandled Runtime Error/i.test(bodyText)) failures.push(`${viewportName} ${label} ${route}: Next/runtime error rendered`);
    if (overflow) failures.push(`${viewportName} ${label} ${route}: document horizontal overflow`);
    if (browserErrors.length) failures.push(`${viewportName} ${label} ${route}: ${browserErrors.join(" | ")}`);

    await page.screenshot({
      path: path.join(screenshotsDir, `${viewportName}-${label}-${safeName(route)}.png`),
      fullPage: true,
    });
  } catch (error) {
    failures.push(`${viewportName} ${label} ${route}: ${error instanceof Error ? error.message : String(error)}`);
    await page.screenshot({
      path: path.join(screenshotsDir, `${viewportName}-${label}-${safeName(route)}-FAILED.png`),
      fullPage: true,
    }).catch(() => undefined);
  } finally {
    await page.close();
  }
}

test("all application screens render cleanly on desktop and mobile", async ({ browser }) => {
  test.setTimeout(20 * 60_000);
  const failures: string[] = [];

  for (const viewport of viewports) {
    const viewportSize = { width: viewport.width, height: viewport.height };
    const publicContext = await browser.newContext({ viewport: viewportSize });
    const investorContext = await login(browser, viewportSize, "investisseur@nexora.ci", "/dashboard");
    const enterpriseContext = await login(browser, viewportSize, "entreprise@nexora.ci", "/entreprise/dashboard");
    const adminContext = await login(browser, viewportSize, "admin@nexora.ci", "/admin/dashboard", true);

    for (const route of publicRoutes) await auditRoute(publicContext, route, "public", viewport.name, failures);
    for (const route of investorRoutes) await auditRoute(investorContext, route, "investor", viewport.name, failures);
    for (const route of enterpriseRoutes) await auditRoute(enterpriseContext, route, "enterprise", viewport.name, failures);
    for (const route of adminRoutes) await auditRoute(adminContext, route, "admin", viewport.name, failures);

    await Promise.all([
      publicContext.close(),
      investorContext.close(),
      enterpriseContext.close(),
      adminContext.close(),
    ]);
  }

  fs.writeFileSync(
    path.resolve("artifacts/visual-audit-result.json"),
    JSON.stringify({ checkedAt: new Date().toISOString(), failures }, null, 2)
  );

  expect(failures, failures.join("\n")).toEqual([]);
});
