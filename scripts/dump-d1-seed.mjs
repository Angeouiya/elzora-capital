/**
 * Exporte les données de démonstration de `prisma/dev.db` (SQLite local)
 * vers `prisma/d1/seed.sql` pour injection dans Cloudflare D1
 * (`wrangler d1 execute <db> --local/--remote --file prisma/d1/seed.sql`).
 *
 * Les tables sont exportées dans l'ordre des clés étrangères.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const db = new DatabaseSync("prisma/dev.db");

// Ordre respectant les dépendances (FK parents avant enfants)
const TABLES = [
  "User",
  "Company",
  "Project",
  "Offer",
  "Investment",
  "Payment",
  "Disbursement",
  "Repayment",
  "Distribution",
  "KYCDocument",
  "Notification",
  "AuditLog",
];

function escapeValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

let sql =
  "-- Seed D1 Nexora Capital — export de prisma/dev.db (données de démonstration)\n";
sql += "PRAGMA defer_foreign_keys = true;\n";

let totalRows = 0;
for (const table of TABLES) {
  const count = db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get();
  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  totalRows += rows.length;
  sql += `\n-- ${table} (${rows.length} lignes)\n`;
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((c) => escapeValue(row[c])).join(", ");
    sql += `INSERT INTO "${table}" (${columns
      .map((c) => `"${c}"`)
      .join(", ")}) VALUES (${values});\n`;
  }
  console.log(`${table}: ${count?.n ?? 0} lignes`);
}

mkdirSync("prisma/d1", { recursive: true });
writeFileSync("prisma/d1/seed.sql", sql, "utf8");
console.log(`\nÉcrit prisma/d1/seed.sql (${totalRows} lignes au total)`);
