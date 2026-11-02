import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";
import { expireStalePayments } from "@/lib/payments/service";
import { safeEqual } from "@/lib/tokens";

/**
 * Scheduled housekeeping (call every few minutes from Windows Task Scheduler, cron or your host):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/maintenance
 * Everything here also happens lazily during normal use; this just keeps state tidy.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [attempts, payments, sessions, tokens] = await Promise.all([
    finalizeExpiredAttempts(),
    expireStalePayments(60),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.authToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400_000) } } }),
  ]);
  return NextResponse.json({ finalizedAttempts: attempts, expiredPayments: payments, deletedSessions: sessions.count, deletedTokens: tokens.count });
}

/** Vercel Cron calls with GET and sends `Authorization: Bearer $CRON_SECRET` automatically. */
export const GET = POST;
