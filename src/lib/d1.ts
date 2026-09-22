import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getD1(): D1Database {
  return getCloudflareContext().env.DB;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function requestIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
