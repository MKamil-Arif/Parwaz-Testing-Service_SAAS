import { z } from "zod";
import { db } from "@/lib/db";
import { ATTEMPT_STATUS, EXAM_ACTIVITY, QUESTION_TYPE, SUBMISSION_TYPE } from "@/lib/constants";
import { finalizeAttempt, SAVE_GRACE_MS } from "@/lib/exam/engine";
import { json, loadOwnAttempt } from "@/lib/exam/api";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  updates: z
    .array(
      z.object({
        answerId: z.number().int().positive(),
        selectedOptionId: z.number().int().positive().nullable(),
        textAnswer: z.string().max(5000).nullable().optional(),
        marked: z.boolean(),
      }),
    )
    .min(1)
    .max(60),
});

/** Autosave: applies one or more answer changes. Rejected once the server-side timer has expired. */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const loaded = await loadOwnAttempt(request, publicId);
  if ("error" in loaded) return loaded.error;
  const { attempt } = loaded;

  if (!rateLimit(`exam-save:${attempt.id}`, 300, 60).allowed) return json({ error: "Too many requests" }, 429);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const now = new Date();
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return json({ closed: true, error: "This examination has already been submitted." }, 409);
  if (now.getTime() > attempt.expiresAt.getTime() + SAVE_GRACE_MS) {
    await db.examActivityLog.create({
      data: { attemptId: attempt.id, eventType: EXAM_ACTIVITY.LATE_SAVE_REJECTED, details: `${parsed.data.updates.length} change(s) after time expired` },
    });
    await finalizeAttempt(attempt.id, SUBMISSION_TYPE.AUTO_TIMEOUT);
    return json({ closed: true, error: "Time is up. Your examination was submitted automatically." }, 409);
  }

  const ids = parsed.data.updates.map((u) => u.answerId);
  const rows = await db.studentAnswer.findMany({
    where: { attemptId: attempt.id, id: { in: ids } },
    include: { question: { select: { type: true } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const ops = [];
  for (const u of parsed.data.updates) {
    const row = byId.get(u.answerId);
    if (!row) return json({ error: "Unknown question" }, 400);
    const isText = row.question.type === QUESTION_TYPE.SHORT_ANSWER;
    if (!isText && u.selectedOptionId !== null && !row.optionOrder.split(",").includes(String(u.selectedOptionId))) {
      return json({ error: "Invalid option" }, 400);
    }
    const text = isText ? (u.textAnswer ?? "").trim() || null : null;
    const answered = isText ? !!text : u.selectedOptionId !== null;
    ops.push(
      db.studentAnswer.update({
        where: { id: row.id },
        data: {
          selectedOptionId: isText ? null : u.selectedOptionId,
          textAnswer: text,
          markedForReview: u.marked,
          answeredAt: answered ? now : null,
        },
      }),
    );
  }
  ops.push(db.examAttempt.update({ where: { id: attempt.id }, data: { lastSavedAt: now } }));
  await db.$transaction(ops);

  return json({ ok: true, serverNow: now.toISOString(), expiresAt: attempt.expiresAt.toISOString() });
}
