import { z } from "zod";
import { db } from "@/lib/db";
import { ATTEMPT_STATUS, EXAM_ACTIVITY, FLAGGED_ACTIVITY } from "@/lib/constants";
import { json, loadOwnAttempt } from "@/lib/exam/api";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

const CLIENT_EVENTS = [
  EXAM_ACTIVITY.TAB_HIDDEN,
  EXAM_ACTIVITY.WINDOW_BLUR,
  EXAM_ACTIVITY.COPY_ATTEMPT,
  EXAM_ACTIVITY.PASTE_ATTEMPT,
  EXAM_ACTIVITY.CONTEXT_MENU,
  EXAM_ACTIVITY.FULLSCREEN_EXIT,
  EXAM_ACTIVITY.OFFLINE,
  EXAM_ACTIVITY.RECONNECTED,
] as const;

const bodySchema = z.object({
  events: z.array(z.object({ type: z.enum(CLIENT_EVENTS), details: z.string().max(200).optional() })).min(1).max(20),
});

/** Integrity logging (tab switches, copy attempts, connectivity). Logged for human review only. */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const loaded = await loadOwnAttempt(request, publicId);
  if ("error" in loaded) return loaded.error;
  const { attempt } = loaded;
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return json({ ok: true });
  if (!rateLimit(`exam-activity:${attempt.id}`, 60, 60).allowed) return json({ ok: true, throttled: true });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const ip = await getClientIp();
  const flagged = parsed.data.events.filter((e) => FLAGGED_ACTIVITY.includes(e.type)).length;
  await db.$transaction([
    db.examActivityLog.createMany({
      data: parsed.data.events.map((e) => ({ attemptId: attempt.id, eventType: e.type, details: e.details ?? null, ipAddress: ip })),
    }),
    ...(flagged ? [db.examAttempt.update({ where: { id: attempt.id }, data: { flagCount: { increment: flagged } } })] : []),
  ]);
  return json({ ok: true });
}
