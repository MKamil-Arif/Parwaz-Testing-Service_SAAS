# Rewarding Potential

**Test Your Knowledge, Earn Your Future.**

A full-stack online academic testing platform for students across Sindh, Pakistan: affordable paid competitions, a secure online examination engine, verified merit lists, and laptop/Chromebook prizes — with a complete student portal and a 17-module admin dashboard.

Built with **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4**, **Prisma ORM** and **Microsoft SQL Server**.

**Live site:** https://rewarding-potential.vercel.app · **Repository:** https://github.com/MKamil-Arif/Parwaz-Testing-Service_SAAS (every push to `master` deploys automatically via Vercel)

---

## Features

| Area | What's included |
|---|---|
| Public website | Home (hero, current competition, how it works, prizes, why us, benefits, targets, testimonials, FAQ), About, Competitions (active/upcoming/completed filters), Competition details, Prize gallery, How it works, Winners, Award ceremonies, Contact, Help, Privacy, Terms, Refund policy, Competition rules, campaign landing pages |
| Accounts | Registration with Sindh districts & class levels, guardian consent for under-18s, email verification, login with lockout, forgot/reset/change password, profile, privacy choices, referral code |
| Student portal | Dashboard, browse competitions, registration wizard, payments & receipts, examinations, results, leaderboard, notifications, profile, support tickets & result disputes |
| Payments | Sandbox gateway (signed callbacks, excluded from revenue), manual JazzCash/Easypaisa/bank transfer with staff verification, refunds, gateway-ready architecture |
| Examination | Server-timed exam, randomized questions/options, palette, mark for review, clear answer, autosave with offline recovery, auto-submit, idempotent submission, identity check, integrity logging, manual marking for written answers |
| Results | Verification workflow, merit list with published tie-break rules, admin approval, publication, change log, disputes, answer-key correction with re-grading |
| Prizes | Prize tiers, provisional allocation, winner verification, public approval with consent, purchases/inventory, distribution & delivery tracking, ceremonies with consent-gated photos |
| Admin | Overview charts, students, competitions, question bank (+CSV import), examinations, registrations, payments, results, leaderboards, winners, prizes, notifications, support, marketing (campaigns, referrals, banners, newsletter, analytics), finance (actual vs projected, expenses, CSV exports), website content, admin users & roles, audit logs, email outbox |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ER-DIAGRAM.md](docs/ER-DIAGRAM.md), [docs/TEST-PLAN.md](docs/TEST-PLAN.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Local setup (Windows)

### 1. Prerequisites
- **Node.js 20.9+** (`node -v`)
- **SQL Server** 2019+ (Express is fine) with **TCP/IP enabled**. Prisma connects over TCP only. To enable it on a default `SQLEXPRESS` instance, run in an **Administrator** PowerShell (adjust `MSSQL17` to your version folder — `MSSQL16` for SQL Server 2022):
  ```powershell
  $k = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp"
  Set-ItemProperty $k -Name Enabled -Value 1
  Set-ItemProperty "$k\IPAll" -Name TcpPort -Value "1433"
  Set-ItemProperty "$k\IPAll" -Name TcpDynamicPorts -Value ""
  Restart-Service 'MSSQL$SQLEXPRESS' -Force
  ```
  (Or: SQL Server Configuration Manager → Network Configuration → Protocols for SQLEXPRESS → TCP/IP → Enable; IPAll → TCP Port 1433; restart the service.)

### 2. Install and configure
```bash
npm install
```
Copy `.env.example` to `.env` and adjust. The default `DATABASE_URL` uses Windows authentication (`integratedSecurity=true`) against `localhost:1433`. Set strong values for `SEED_ADMIN_PASSWORD`, `SEED_STUDENT_PASSWORD`, `SANDBOX_WEBHOOK_SECRET` and `CRON_SECRET`.

### 3. Create the database
```bash
sqlcmd -S .\SQLEXPRESS -E -C -Q "IF DB_ID('RewardingPotential') IS NULL CREATE DATABASE RewardingPotential"
npm run db:migrate
npm run db:seed
```

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000. In **VS Code** or **Visual Studio 2022** (File → Open → Folder), use the integrated terminal for the same commands.

### Demo accounts
`npm run db:seed` creates (only if missing):

| Account | Email | Password |
|---|---|---|
| Super admin (must change password on first login) | `SEED_ADMIN_EMAIL` in `.env` | `SEED_ADMIN_PASSWORD` in `.env` |
| Demo student (17, guardian consent recorded) | `SEED_STUDENT_EMAIL` in `.env` | `SEED_STUDENT_PASSWORD` in `.env` |

Both are flagged as demo accounts in the UI. Remove them before going live.

### What the seed contains — and what it doesn't
- ✅ Roles, the **Sindh Academic Talent Challenge 2027** (PKR 500, target 1,500 registrations, 10 laptops + 20 Chromebooks), a free **Practice Round (Demo)** with 36 clearly-labelled sample questions, draft policies, FAQs, three testimonials marked **Sample**, the preliminary financial model as **projections**, and a registration banner.
- ❌ No registrations, payments, results, rankings, winners, campaign statistics or testimonials are invented. Every number on dashboards comes from real records.
- The main competition's question pool is intentionally empty — add 100+ reviewed questions (Admin → Question bank → Import CSV) before the exam.

---

## Hosted deployment (Vercel)

The hosted site runs on **Vercel + Neon PostgreSQL** (Vercel can't reach a SQL Server on your PC). The Postgres schema is generated from the SQL Server schema, so both stay identical — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#option-v--vercel--neon-postgresql-hosted-deployment). On the hosted site `PAYMENT_MODE=live`, so the sandbox checkout is off and registrations are confirmed only by verified manual transfers.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (http://localhost:3000) |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Create a new migration after editing `schema.prisma` |
| `npm run db:seed` | Seed reference & demo data (idempotent) |
| `npm run db:reset` | **Drops** and recreates the database, then seeds (development only) |
| `npm run db:studio` | Browse data in Prisma Studio |

---

## Configuration notes

**Payments.** `PAYMENT_MODE=sandbox` (default) shows a clearly-marked test checkout. A payment is only marked paid after the sandbox gateway's HMAC-signed callback passes signature, amount, freshness and idempotency checks — the same path a real gateway's webhook uses (`POST /api/payments/webhook/{provider}`). Sandbox payments are excluded from revenue. Manual transfers are confirmed only by finance staff. Real JazzCash/Easypaisa checkout stays disabled until an adapter is implemented against the merchant documentation, credentials are set, `PAYMENT_MODE=live`, and business/legal approval is in place.

**Email.** Without `SMTP_HOST`, emails are stored in **Admin → Email outbox** and, in development, verification/reset links are also shown on screen. Configure SMTP to deliver real email. SMS is configurable (`SMS_PROVIDER`, `SMS_API_KEY`) but no provider adapter is enabled.

**Scheduled maintenance.** `POST /api/cron/maintenance` with `Authorization: Bearer <CRON_SECRET>` auto-submits expired exams, expires abandoned checkouts and cleans old sessions/tokens. These also happen lazily during normal use.

**Uploads.** Ceremony photos are validated by file signature (JPG/PNG/WebP, ≤ 4 MB), stored in the database under an unguessable id (works on serverless hosts too) and served via `/media/...`. Photos can only be published once consent is confirmed.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database server at localhost:1433` | TCP/IP is disabled or on another port — see step 1 |
| `Login failed for user` | With `integratedSecurity=true`, run the app as a Windows user that has access to the instance; or use SQL authentication in `DATABASE_URL` |
| Certificate errors | Keep `trustServerCertificate=true` for local self-signed certificates |
| Verification email never arrives locally | Expected without SMTP — use the on-screen dev link or Admin → Email outbox |
