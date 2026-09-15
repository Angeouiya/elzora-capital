import { PrismaClient } from "./generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

/**
 * Prisma + Cloudflare D1 (via OpenNext).
 *
 * Le binding D1 est exposé par OpenNext sur
 * `globalThis[Symbol.for("__cloudflare-context__")].env.DB` :
 * - en production : initialisé par le worker avant tout code applicatif ;
 * - en développement local : fourni par `initOpenNextCloudflareForDev`
 *   (next.config.ts) via miniflare.
 *
 * Le client est créé paresseusement au premier appel (jamais à l'import)
 * afin que `next build` puisse évaluer les modules sans contexte d'exécution.
 */
type D1DatabaseBinding = ConstructorParameters<typeof PrismaD1>[0];

const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getD1Binding(): D1DatabaseBinding | undefined {
  const context = (
    globalThis as unknown as Record<
      symbol,
      { env?: { DB?: D1DatabaseBinding } } | undefined
    >
  )[cloudflareContextSymbol];
  return context?.env?.DB;
}

function createPrismaClient(): PrismaClient {
  const d1 = getD1Binding();
  if (!d1) {
    throw new Error(
      "Binding D1 « DB » introuvable. En local : lancez `npm run dev` (initOpenNextCloudflareForDev actif). En production : déployez sur Cloudflare Workers (wrangler deploy)."
    );
  }
  return new PrismaClient({ adapter: new PrismaD1(d1) });
}

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
