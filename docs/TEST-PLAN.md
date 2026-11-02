# Test plan

## Automated (Vitest) — `npm test`

| File | Covers |
|---|---|
| `tests/scoring.test.ts` | Correct/incorrect/unanswered counts, negative marking, score floor at zero, per-question marks, manual-review questions |
| `tests/ranking.test.ts` | Tie-break order (score → fewer incorrect → less time → earlier submission → earlier registration), unique ranks, prize tiers (1–10 laptop, 11–30 Chromebook) |
| `tests/competition-rules.test.ts` | Competition phases (incl. overlapping practice windows), eligibility (class, Sindh, age), total marks, publish blockers |
| `tests/payments.test.ts` | Gateway callback: forged/missing signature rejected, tampered amount rejected, replay rejected, sandbox blocked in live mode, valid callback confirms payment |
| `tests/validation-and-utils.test.ts` | Registration validation (guardian consent under 18, phone, password), CSV parsing & formula-injection guard, PKT time conversion, age, privacy-safe names, constant-time compare, RBAC |

## Manual end-to-end workflows

Run with `npm run dev` after seeding. Demo credentials are in `.env` (`SEED_*`).

| # | Workflow | Steps | Expected |
|---|---|---|---|
| 1 | Student sign-up | Register as a 16-year-old | Guardian section appears; submit without consent → field errors; with consent → dashboard + "verify your email" banner |
| 2 | Email verification | Dashboard → Resend (dev link shown when no SMTP) → open link | Badge shows Verified; registration now allowed |
| 3 | Wrong password lockout | 5 wrong passwords | 6th attempt says account temporarily locked |
| 4 | Practice round | Browse → Practice Round → Register (free) → Exams → instructions → wrong DOB | Identity check fails; correct DOB starts exam |
| 5 | Exam engine | Answer, mark for review, clear, navigate via palette; reload page | All answers & marks persist; timer continues from server time |
| 6 | Offline recovery | DevTools → Network offline, answer 2 questions, back online | Header shows "Offline — saved on device", then "All answers saved" |
| 7 | Integrity log | Switch tabs, try copy | Admin → Examinations → attempt shows TAB_HIDDEN / COPY_ATTEMPT |
| 8 | Submission | Submit → confirm dialog counts → submit | Redirect to exam page "submitted"; instant practice score shown; double submit harmless |
| 9 | Auto-submit | Admin: create a 5-minute competition, start, wait | At 00:00 exam auto-submits ("Auto-submitted (time up)") |
| 10 | Paid registration (sandbox) | Register for main competition → Pay → Sandbox → Approve | Payment Paid, registration Confirmed, notification + receipt; Admin revenue excludes sandbox |
| 11 | Declined payment | Sandbox → Simulate decline | Payment Failed with reason; can retry |
| 12 | Manual transfer | Pay by transfer with transaction ID; admin verifies | Pending verification → admin approves → Confirmed; reject requires reason |
| 13 | Duplicate transfer ID | Reuse a transaction ID | "already been submitted" |
| 14 | Results pipeline | Admin → Results: verify, generate merit list, approve, allocate prizes, publish | Ranks follow tie-breaks; students notified; leaderboard visible; allocations provisional |
| 15 | Winner verification | Admin → Winners: verify with notes, approve for public page | Appears on /winners with initials unless media consent given |
| 16 | Answer-key correction | Results → correct key | Attempts re-graded, change log entries, merit list returns to pending |
| 17 | Dispute | Student result page → raise dispute | Ticket in Admin → Support linked to result |
| 18 | RBAC | Create FINANCE staff → log in | Only Overview, Payments, Financial reports, My account visible; other URLs redirect |
| 19 | Finance | Record expenses; edit projections | Actual vs projected charts/exports update; projections never change actuals |
| 20 | CSV import | Download template, add rows, upload | All-or-nothing import with row-level error messages |
| 21 | Ceremony photo consent | Upload without consent | Cannot publish until consent confirmed |
| 22 | Responsive | 375 px width | No horizontal scroll; exam palette in bottom sheet |
