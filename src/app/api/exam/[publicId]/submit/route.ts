import { z } from "zod";
import { ATTEMPT_STATUS, SUBMISSION_TYPE } from "@/lib/constants";
import { finalizeAttempt } from "@/lib/exam/engine";
import { json, loadOwnAttempt } from "@/lib/exam/api";

const bodySchema = z.object({ reason: z.enum(["manual", "timeout"]) });

/** Final submission. Idempotent: a second call (double click, retry, other tab) returns the same outcome. */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const loaded = await loadOwnAttempt(request, publicId);
  if ("error" in loaded) return loaded.error;
  const { attempt } = loaded;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const redirectTo = `/dashboard/exams/${attempt.registration.registrationNumber}`;
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return json({ ok: true, alreadySubmitted: true, redirectTo });

  // The client's "timeout" claim is only honoured if the server clock agrees.
  const timeUp = Date.now() >= attempt.expiresAt.getTime() - 5_000;
  const type = parsed.data.reason === "timeout" && timeUp ? SUBMISSION_TYPE.AUTO_TIMEOUT : SUBMISSION_TYPE.MANUAL;
  await finalizeAttempt(attempt.id, type);
  return json({ ok: true, redirectTo });
}
