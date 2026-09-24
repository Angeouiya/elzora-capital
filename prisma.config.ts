import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` does not connect to a database. Keeping a local
    // fallback makes clean CI and Cloudflare builds reproducible while
    // runtime access still goes through the bound D1 adapter.
    url: process.env.DATABASE_URL ?? "file:./db/custom.db",
  },
});
