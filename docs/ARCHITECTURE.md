# Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components, Server Actions), **React 19**, **TypeScript** |
| Styling | **Tailwind CSS 4**, custom design tokens (navy / blue / gold) in `src/app/globals.css` |
| Data | **Microsoft SQL Server** via **Prisma ORM 6** (migrations in `prisma/migrations`) |
| Auth | Custom, database-backed sessions (httpOnly cookie holding a random token; only its SHA-256 hash is stored), bcrypt password hashing (cost 12), role-based permissions |
| Validation | zod schemas on the server for every form, API body and import |
| Charts | Recharts (admin only), validated colour palette, table view for accessibility |
| Email | Nodemailer over SMTP; every message recorded in `EmailOutbox` (works without SMTP in development) |
| Tests | Vitest unit tests (`tests/`) |

## How a request flows

```
Browser ──► proxy.ts (optimistic login redirect, marketing attribution cookies)
        ──► Server Component page  ──► requireStudent()/requireStaff(permission)  ──► Prisma ──► SQL Server
        ──► Server Action (forms)  ──► same guards + zod validation + audit log
        ──► Route Handler (/api/*) ──► exam autosave/submit (same-origin + session checks),
                                       payment webhooks (HMAC signature), CSV exports, cron
```

Every page and action re-checks authorisation on the server; the proxy redirect is only a convenience.

## Folder structure

```
rewarding-potential/
├─ prisma/
│  ├─ schema.prisma            # 41 models (see docs/ER-DIAGRAM.md)
│  ├─ migrations/              # SQL Server migration history
│  └─ seed.ts                  # roles, demo accounts, initial competition, practice round, content
├─ src/
│  ├─ proxy.ts                 # Next 16 request proxy (was "middleware")
│  ├─ app/
│  │  ├─ (public)/             # website: home, about, competitions, prizes, winners, ceremonies, policies…
│  │  ├─ (auth)/               # login, register, forgot/reset password, verify email
│  │  ├─ dashboard/            # student portal (10 sections)
│  │  ├─ exam/[publicId]/      # full-screen examination interface
│  │  ├─ pay/sandbox/          # simulated hosted checkout (sandbox mode only)
│  │  ├─ admin/                # administration (17 modules)
│  │  ├─ api/                  # exam autosave/submit/activity, payment webhooks, exports, cron
│  │  └─ media/                # serves uploaded ceremony photos
│  ├─ actions/                 # server actions: auth, public, student, sandbox, admin/*
│  ├─ components/              # ui/ (design system), site/, app-shell/, admin/charts, dashboard/, support/
│  └─ lib/
│     ├─ auth/                 # session, guards, permissions (RBAC), password, single-use tokens
│     ├─ exam/                 # engine (start/finalize/regrade), scoring, ranking, shuffle, api guard
│     ├─ payments/             # gateway registry, signed-callback processing, payment state changes
│     ├─ constants.ts          # every status/type value + labels
│     ├─ validation.ts         # zod schemas
│     └─ …                     # db, audit, email, notifications, settings, csv, uploads, rate-limit
├─ tests/                      # Vitest unit tests
├─ docs/                       # architecture, ER diagram, test plan, deployment
└─ storage/uploads/            # uploaded images (outside /public; git-ignored)
```

## Key design decisions

### Examination engine (`src/lib/exam/engine.ts`)
- **Starting** requires a confirmed registration, verified email, guardian consent (under 18), an open window, attempts remaining and an identity check (date of birth + declaration). Questions are sampled and ordered **on the server** with a cryptographic shuffle; option order is randomised per student and stored on each `StudentAnswer`.
- **Server-authoritative timer**: `expiresAt = min(start + duration, window end)`. The browser only displays it (and re-syncs from each save response). Saves after `expiresAt + 20 s` are rejected and the attempt is auto-submitted.
- **Autosave & recovery**: every change is POSTed; failed saves are queued in `localStorage` and retried every 5 s and on reconnect, and replayed after a page reload.
- **Exactly-once submission**: an `UPDATE … WHERE status='IN_PROGRESS'` claim inside a transaction, plus `UNIQUE(attemptId)` on results, makes double clicks, retries and timer races harmless.
- **Integrity signals** (tab hidden, copy/paste, fullscreen exit, second session) are logged and counted for **human review** — they never auto-disqualify, and the UI makes no promise that browser proctoring prevents cheating.
- Correct answers are never sent to the browser.

### Results pipeline
`PROVISIONAL → (manual marking) → VERIFIED / WITHHELD / DISQUALIFIED` per result, then per competition `PENDING → DRAFT (merit list generated with the published tie-break rules) → APPROVED (admin) → PUBLISHED`. Prize allocations are created only from an approved list and stay *provisional* until each winner's identity and eligibility are verified. Every change is written to `ResultChangeLog` and `AuditLog`. Answer-key corrections re-grade all affected attempts.

### Payments (`src/lib/payments`)
- A payment becomes `SUCCEEDED` only through (a) a gateway callback that passes HMAC signature, amount, method, freshness (replay) and idempotency checks, or (b) a finance staff member verifying a manual JazzCash/Easypaisa/bank transfer. Clicking a button never marks money as received.
- **Sandbox mode** simulates a hosted checkout; its "gateway" signs a callback that goes through the exact same verification code. Sandbox payments are flagged and excluded from revenue.
- Live gateways plug into `gateway.ts` + `callbacks.ts`; they stay disabled until an adapter is implemented against the merchant's documentation, credentials are configured and `PAYMENT_MODE=live`.

### Security
bcrypt hashing · DB sessions revocable per user · login lockout (5 failures → 15 min) and IP/email rate limits · CSRF: Server Actions verify Origin; JSON APIs require same-origin; webhooks require signatures · zod validation everywhere · Prisma parameterised queries (no raw SQL) · React escaping + markdown rendered without raw HTML · strict security headers/CSP · uploads verified by magic bytes, random names, stored outside `public/` · CSV export formula-injection guard · role-based permissions on every admin page and action · audit log of every important change · no card data ever stored.

### Scalability path
Competitions are generic (fee, window, duration, pool, marking, eligibility, prize tiers), so the same engine can host university-entry tests, recruitment tests and institutional contracts. For larger scale: move the rate limiter to Redis, put uploads on object storage, run several Next.js instances behind a load balancer, and add read replicas for reporting.
