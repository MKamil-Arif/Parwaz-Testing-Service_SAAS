# Deployment

## Option V — Vercel + Neon PostgreSQL (hosted deployment)

Vercel cannot reach a SQL Server on a laptop, so the hosted site uses PostgreSQL (Neon). The data model is the same: `scripts/make-postgres-schema.mjs` generates `prisma/postgres/schema.prisma` from the SQL Server schema (only the provider and column types differ), with its own migrations in `prisma/postgres/migrations/`.

1. Import the GitHub repository in Vercel (or `vercel link`). `vercel.json` sets the build command to `npm run vercel-build`, which regenerates the Postgres schema, generates the Prisma client, applies migrations and builds.
2. Vercel → Storage → Create → **Neon** → connect it to the project. This adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used for migrations).
3. Environment variables (Production): `PAYMENT_MODE=live` (disables the sandbox checkout; manual transfer verification stays available), random `SANDBOX_WEBHOOK_SECRET` and `CRON_SECRET`, optional `APP_URL` (defaults to the Vercel production URL) and SMTP settings.
4. Seed once from your machine with the Postgres client:
   ```bash
   npm run db:pg:schema
   npx prisma generate --schema prisma/postgres/schema.prisma
   npx dotenv -e .env.production.local -- npx tsx prisma/seed.ts   # or set DATABASE_URL in the shell
   npx prisma generate   # switch back to the SQL Server client for local work
   ```
5. Uploads are stored in the database (`MediaFile`), so they persist on serverless hosts; images are limited to 4 MB (Vercel request limit).
6. `vercel.json` schedules `/api/cron/maintenance` daily (Vercel Hobby limit); expired exams and checkouts are also closed lazily during normal use.

Known differences on PostgreSQL: admin text search is case-sensitive (SQL Server's default collation is case-insensitive).

## Option A — Windows Server / VPS with SQL Server (closest to local setup)

1. Install Node.js 20.9+ (LTS 24 recommended) and SQL Server (Express is fine to start; Standard for production backups/agent jobs).
2. Create a dedicated SQL login with rights only on the `RewardingPotential` database:
   ```sql
   CREATE LOGIN rp_app WITH PASSWORD = '<long random password>';
   CREATE DATABASE RewardingPotential;
   USE RewardingPotential; CREATE USER rp_app FOR LOGIN rp_app; ALTER ROLE db_owner ADD MEMBER rp_app;
   ```
   (After migrations you may reduce to `db_datareader` + `db_datawriter`; run migrations with a separate admin login.)
3. Copy the project, then create `.env` from `.env.example` with production values:
   - `DATABASE_URL="sqlserver://localhost:1433;database=RewardingPotential;user=rp_app;password=…;encrypt=true;trustServerCertificate=true"`
   - `APP_URL="https://your-domain"`, SMTP settings, new random `SANDBOX_WEBHOOK_SECRET` and `CRON_SECRET`.
   - Keep `PAYMENT_MODE=sandbox` until a real gateway adapter, merchant credentials, business authorisation and legal checks are complete.
   - Remove or change the `SEED_*` demo accounts.
4. Build and migrate:
   ```bash
   npm ci
   npm run db:migrate
   npm run db:seed        # first deployment only
   npm run build
   npm start              # listens on port 3000
   ```
5. Run it as a service (e.g. NSSM or PM2) and put IIS (with URL Rewrite + ARR) or Nginx in front for HTTPS. HTTPS is required in production (secure cookies, HSTS).
6. Schedule maintenance every 5 minutes:
   ```bash
   curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://your-domain/api/cron/maintenance
   ```
7. Schedule nightly database backups (see `docs/ER-DIAGRAM.md` → Backups) and back up `storage/uploads/`.

## Option B — Managed hosting

- Database: Azure SQL Database (set `encrypt=true`).
- App: any Node host that keeps a persistent filesystem for uploads, or change `src/lib/uploads.ts` to object storage (Azure Blob / S3) for serverless hosts.
- The in-memory rate limiter is per instance; for multiple instances, back it with Redis.

## Go-live checklist

- [ ] Real contact details, social links and payment account details in Admin → Website content
- [ ] Policies reviewed by a legal adviser (Admin → Website content → pages)
- [ ] 100+ reviewed questions in the main competition's pool (sample questions removed from real pools)
- [ ] Sample testimonials replaced or unpublished
- [ ] SMTP configured and test email received
- [ ] Demo accounts removed; super admin password changed; staff accounts created with least-privilege roles
- [ ] Backups scheduled and a restore tested
- [ ] HTTPS, `NODE_ENV=production`, cron job running
- [ ] Payment gateway activated only after merchant onboarding and verified callbacks in their sandbox
