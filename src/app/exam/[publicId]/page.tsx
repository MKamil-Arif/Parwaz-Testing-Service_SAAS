import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { ATTEMPT_STATUS, EXAM_ACTIVITY, SUBMISSION_TYPE } from "@/lib/constants";
import { finalizeAttempt, SAVE_GRACE_MS } from "@/lib/exam/engine";
import { ExamClient, type ExamQuestion } from "./exam-client";

export const metadata: Metadata = { title: "Examination in progress", robots: { index: false } };

export default async function ExamPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const session = await requireUser(`/exam/${publicId}`);
  if (!/^[a-f0-9]{32}$/.test(publicId)) notFound();

  const attempt = await db.examAttempt.findUnique({
    where: { publicId },
    include: {
      registration: { include: { competition: true, user: true } },
      answers: { orderBy: { position: "asc" }, include: { question: { include: { options: true } } } },
    },
  });
  if (!attempt || attempt.registration.userId !== session.user.id) notFound();
  const doneUrl = `/dashboard/exams/${attempt.registration.registrationNumber}`;

  if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS && Date.now() > attempt.expiresAt.getTime() + SAVE_GRACE_MS) {
    await finalizeAttempt(attempt.id, SUBMISSION_TYPE.AUTO_TIMEOUT);
    redirect(doneUrl);
  }
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) redirect(doneUrl);

  // Opening the same attempt from a different login session is allowed (device change) but logged.
  if (attempt.sessionId && attempt.sessionId !== session.sessionId) {
    await db.$transaction([
      db.examActivityLog.create({ data: { attemptId: attempt.id, eventType: EXAM_ACTIVITY.OTHER_SESSION, details: "Attempt opened from another login session" } }),
      db.examAttempt.update({ where: { id: attempt.id }, data: { sessionId: session.sessionId, flagCount: { increment: 1 } } }),
    ]);
  }

  // Correct answers are never sent to the browser.
  const questions: ExamQuestion[] = attempt.answers.map((a) => {
    const byId = new Map(a.question.options.map((o) => [o.id, o]));
    return {
      answerId: a.id,
      position: a.position,
      type: a.question.type,
      text: a.question.text,
      marks: attempt.registration.competition.marksPerQuestion ?? a.question.marks,
      options: a.optionOrder
        .split(",")
        .map((id) => byId.get(Number(id)))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ id: o.id, text: o.text })),
      selectedOptionId: a.selectedOptionId,
      textAnswer: a.textAnswer ?? "",
      marked: a.markedForReview,
    };
  });

  const c = attempt.registration.competition;
  return (
    <ExamClient
      publicId={attempt.publicId}
      doneUrl={doneUrl}
      title={c.title}
      candidate={{ name: attempt.registration.user.fullName, registrationNumber: attempt.registration.registrationNumber }}
      expiresAt={attempt.expiresAt.toISOString()}
      serverNow={new Date().toISOString()}
      negativeMarking={c.negativeMarking}
      questions={questions}
    />
  );
}
