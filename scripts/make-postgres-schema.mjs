// Generates prisma/postgres/schema.prisma from the SQL Server schema (prisma/schema.prisma),
// so the hosted (Vercel + PostgreSQL/Neon) deployment always uses the same data model.
// Only the provider and SQL Server-specific column types change.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("prisma/schema.prisma", "utf8");
const out =
  "// GENERATED from prisma/schema.prisma by scripts/make-postgres-schema.mjs — edit the SQL Server schema instead.\n" +
  src
    .replace('provider = "sqlserver"', 'provider = "postgresql"')
    .replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")')
    .replace(/@db\.NVarChar\(Max\)/g, "@db.Text")
    .replace(/@db\.NVarChar\((\d+)\)/g, "@db.VarChar($1)");

mkdirSync("prisma/postgres", { recursive: true });
writeFileSync("prisma/postgres/schema.prisma", out);
console.log("prisma/postgres/schema.prisma written");
