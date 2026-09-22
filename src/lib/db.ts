import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Return a Prisma client bound to the D1 database for the current request.
 * A Worker must not reuse a database client across requests.
 */
export function getDb(): PrismaClient {
  const { env } = getCloudflareContext();
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

/**
 * Compatibility facade for the existing service layer. The actual client is
 * resolved lazily when a Prisma operation starts, never at module load time.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
