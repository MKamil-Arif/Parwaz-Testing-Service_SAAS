import { db } from "@/lib/db";
import {
  ATTEMPT_STATUS,
  NOTIFICATION_TYPE,
  QUESTION_STATUS,
  QUESTION_TYPE,
  REGISTRATION_STATUS,
  RESULT_STATUS,
  SUBMISSION_TYPE,
} from "@/lib/constants";
import { ageOn } from "@/lib/format";
import { attemptPublicId } from "@/lib/tokens";
import { notify } from "@/lib/notifications";
import { gradeAttempt, type GradableAnswer } from "./scoring";
import { shuffle } from "./shuffle";

/** Answers saved up to this long after expiry are accepted (network latency). */
export const SAVE_GRACE_MS = 20_000;

export type ReadinessCheck = { label: string; ok: boolean; detail: string };

type ReadinessInput = {
  registrationStatus: string;
  emailVerified: boolean;
  dateOfBirth: Date | null;
  guardianConsentAt: Date | null;
  examStartsAt: Date;
  examEndsAt: Date;
  durationMinutes: number;
  usedAttempts: number;
  maxAttempts: number;
  hasInProgress: boolean;
};

export function readinessChecks(i: ReadinessInput, now = new Date()): ReadinessCheck[] {
  const minor = i.dateOfBirth ? ageOn(i.dateOfBirth) < 18 : false;
  const minutesLeft = Math.floor((i.examEndsAt.getTime() - now.getTime()) / 60000);
  return [
    {
      label: "Registration confirmed",
      ok: i.registrationStatus === REGISTRATION_STATUS.CONFIRMED,
      detail: i.registrationStatus === REGISTRATION_STATUS.CONFIRMED ? "Confirmed" : "Complete your payment first",
    },
    { label: "Email verified", ok: i.emailVerified, detail: i.emailVerified ? "Verified" : "Verify your email from your dashboard" },
    {
      label: "Parent/guardian consent",
      ok: !minor || !!i.guardianConsentAt,
      detail: !minor ? "Not required (18+)" : i.guardianConsentAt ? "Recorded" : "Add guardian consent in My Profile",
    },
    {
      label: "Examination window",
      ok: now >= i.examStartsAt && now <= i.examEndsAt,
      detail:
        now < i.examStartsAt
          ? "Not open yet"
          : now > i.examEndsAt
            ? "The window has closed"
            : minutesLeft < i.durationMinutes
              ? `Open — only ${minutesLeft} minutes remain in the window`
              : "Open now",
    },
    {
      label: "Attempts",
      ok: i.hasInProgress || i.usedAttempts < i.maxAttempts,
      detail: i.hasInProgress ? "You have an attempt in progress" : `${i.usedAttempts} of ${i.maxAttempts} used`,
    },
  ];
}

type StartResult = { ok: true; publicId: string } | { ok: false; error: string };

/** Starts (or resumes) an attempt after identity confirmation. Selection and option order are randomized server-side. */
export async function startAttempt(input: {
  userId: number;
  registrationId: number;
  sessionId: number;
  ipAddress: string;
  userAgent: string;
}): Promise<StartResult> {
  const now = new Date();
  const reg = await db.competitionRegistration.findUnique({
    where: { id: input.registrationId },
    include: {
      competition: true,
      attempts: true,
      user: { include: { profile: true } },
    },
  });
  if (!reg || reg.userId !== input.userId) return { ok: false, error: "Registration not found." };

  const inProgress = reg.attempts.find((a) => a.status === ATTEMPT_STATUS.IN_PROGRESS);
  if (inProgress && inProgress.expiresAt > now) return { ok: true, publicId: inProgress.publicId };
  if (inProgress) await finalizeAttempt(inProgress.id, SUBMISSION_TYPE.AUTO_TIMEOUT);

  const c = reg.competition;
  const used = reg.attempts.filter((a) => a.status !== ATTEMPT_STATUS.VOIDED).length;
  const checks = readinessChecks(
    {
      registrationStatus: reg.status,
      emailVerified: !!reg.user.emailVerifiedAt,
      dateOfBirth: reg.user.profile?.dateOfBirth ?? null,
      guardianConsentAt: reg.user.profile?.guardianConsentAt ?? null,
      examStartsAt: c.examStartsAt,
      examEndsAt: c.examEndsAt,
      durationMinutes: c.durationMinutes,
      usedAttempts: used,
      maxAttempts: c.maxAttempts,
      hasInProgress: false,
    },
    now,
  );
  const blocked = checks.find((ch) => !ch.ok);
  if (blocked) return { ok: false, error: `${blocked.label}: ${blocked.detail}` };

  const pool = await db.question.findMany({
    where: { status: QUESTION_STATUS.ACTIVE, competitions: { some: { competitionId: c.id } } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: { id: "asc" },
  });
  if (pool.length < c.questionCount) return { ok: false, error: "This examination is not ready yet. Please contact support." };

  const selected = (c.randomizeQuestions ? shuffle(pool) : pool).slice(0, c.questionCount);
  const expiresAt = new Date(Math.min(now.getTime() + c.durationMinutes * 60_000, c.examEndsAt.getTime()));
  const publicId = attemptPublicId();

  try {
    await db.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          publicId,
          registrationId: reg.id,
          attemptNumber: reg.attempts.length + 1, // unique with registrationId → blocks concurrent duplicate starts
          status: ATTEMPT_STATUS.IN_PROGRESS,
          startedAt: now,
          expiresAt,
          identityConfirmedAt: now,
          sessionId: input.sessionId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
      await tx.studentAnswer.createMany({
        data: selected.map((q, index) => {
          const ids = q.options.map((o) => o.id);
          return {
            attemptId: attempt.id,
            questionId: q.id,
            position: index + 1,
            optionOrder: (c.randomizeOptions ? shuffle(ids) : ids).join(","),
          };
        }),
      });
    });
  } catch (err) {
    const again = await db.examAttempt.findFirst({
      where: { registrationId: reg.id, status: ATTEMPT_STATUS.IN_PROGRESS },
    });
    if (again) return { ok: true, publicId: again.publicId };
    console.error("[exam] could not start attempt", err);
    return { ok: false, error: "Could not start the examination. Please try again." };
  }
  return { ok: true, publicId };
}

/** Grades and closes an attempt exactly once. Safe to call repeatedly or concurrently. */
export async function finalizeAttempt(attemptId: number, submissionType: string): Promise<{ finalized: boolean }> {
  const now = new Date();
  const result = await db.$transaction(
    async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          registration: { include: { competition: true } },
          answers: { include: { question: { include: { options: true } } } },
        },
      });
      if (!attempt || attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return null;

      const submittedAt = now > attempt.expiresAt ? attempt.expiresAt : now;
      const claimed = await tx.examAttempt.updateMany({
        where: { id: attemptId, status: ATTEMPT_STATUS.IN_PROGRESS },
        data: {
          status: submissionType === SUBMISSION_TYPE.MANUAL ? ATTEMPT_STATUS.SUBMITTED : ATTEMPT_STATUS.AUTO_SUBMITTED,
          submittedAt,
          submissionType,
        },
      });
      if (claimed.count === 0) return null;

      const comp = attempt.registration.competition;
      const summary = gradeAttempt(
        attempt.answers.map((a) => toGradable(a, comp.marksPerQuestion)),
        comp.negativeMarking,
      );
      await applyGrades(tx, summary.perAnswer);

      await tx.examResult.create({
        data: {
          attemptId,
          totalQuestions: summary.total,
          correctCount: summary.correct,
          incorrectCount: summary.incorrect,
          unansweredCount: summary.unanswered,
          pendingReviewCount: summary.pendingReview,
          score: summary.score,
          maxScore: summary.maxScore,
          percentage: summary.percentage,
          timeTakenSeconds: Math.max(0, Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
          status: summary.pendingReview > 0 ? RESULT_STATUS.PENDING_REVIEW : RESULT_STATUS.PROVISIONAL,
        },
      });
      return { userId: attempt.registration.userId, title: comp.title, auto: submissionType !== SUBMISSION_TYPE.MANUAL };
    },
    { timeout: 20_000 },
  );

  if (!result) return { finalized: false };
  await notify(result.userId, {
    type: NOTIFICATION_TYPE.EXAM,
    title: result.auto ? "Examination auto-submitted" : "Examination submitted",
    body: `Your answers for "${result.title}" have been ${result.auto ? "automatically submitted when the time ended" : "submitted successfully"}. Results will be published after verification.`,
    link: "/dashboard/exams",
  });
  return { finalized: true };
}

type AnswerWithQuestion = {
  id: number;
  selectedOptionId: number | null;
  textAnswer: string | null;
  marksAwarded: number | null;
  reviewedAt: Date | null;
  question: { type: string; marks: number; options: { id: number; isCorrect: boolean }[] };
};

export function toGradable(a: AnswerWithQuestion, marksPerQuestion: number | null): GradableAnswer {
  return {
    id: a.id,
    type: a.question.type,
    marks: marksPerQuestion ?? a.question.marks,
    selectedOptionId: a.selectedOptionId,
    correctOptionId: a.question.options.find((o) => o.isCorrect)?.id ?? null,
    textAnswer: a.textAnswer,
    reviewedMarks: a.question.type === QUESTION_TYPE.SHORT_ANSWER && a.reviewedAt ? a.marksAwarded : null,
  };
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Writes per-answer grades with one UPDATE per distinct (isCorrect, marks) group. */
async function applyGrades(tx: Tx, graded: { id: number; isCorrect: boolean | null; marksAwarded: number | null }[]) {
  const groups = new Map<string, number[]>();
  for (const g of graded) {
    const key = `${g.isCorrect}|${g.marksAwarded}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(g.id);
  }
  for (const [key, ids] of groups) {
    const [isCorrect, marks] = key.split("|");
    await tx.studentAnswer.updateMany({
      where: { id: { in: ids } },
      data: {
        isCorrect: isCorrect === "null" ? null : isCorrect === "true",
        marksAwarded: marks === "null" ? null : Number(marks),
      },
    });
  }
}

/** Recomputes a result after manual marking or an admin correction (logs score changes). */
export async function regradeResult(attemptId: number, changedById: number | null, reason: string): Promise<void> {
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      result: true,
      registration: { include: { competition: true } },
      answers: { include: { question: { include: { options: true } } } },
    },
  });
  if (!attempt?.result) return;
  const comp = attempt.registration.competition;
  const summary = gradeAttempt(attempt.answers.map((a) => toGradable(a, comp.marksPerQuestion)), comp.negativeMarking);
  const old = attempt.result;

  await db.$transaction(async (tx) => {
    // Only objective answers are re-marked here; reviewed manual answers keep the reviewer's marks.
    await applyGrades(
      tx,
      summary.perAnswer.filter((p) => attempt.answers.find((a) => a.id === p.id)?.question.type !== QUESTION_TYPE.SHORT_ANSWER),
    );
    const nextStatus =
      old.status === RESULT_STATUS.PENDING_REVIEW && summary.pendingReview === 0 ? RESULT_STATUS.PROVISIONAL : old.status;
    await tx.examResult.update({
      where: { id: old.id },
      data: {
        correctCount: summary.correct,
        incorrectCount: summary.incorrect,
        unansweredCount: summary.unanswered,
        pendingReviewCount: summary.pendingReview,
        score: summary.score,
        maxScore: summary.maxScore,
        percentage: summary.percentage,
        status: nextStatus,
      },
    });
    if (old.score !== summary.score) {
      await tx.resultChangeLog.create({
        data: { resultId: old.id, changedById, field: "score", oldValue: String(old.score), newValue: String(summary.score), reason },
      });
    }
    if (old.status !== nextStatus) {
      await tx.resultChangeLog.create({
        data: { resultId: old.id, changedById, field: "status", oldValue: old.status, newValue: nextStatus, reason },
      });
    }
  });
}

/** Closes attempts whose time has run out (also run lazily whenever an attempt is touched). */
export async function finalizeExpiredAttempts(competitionId?: number): Promise<number> {
  const expired = await db.examAttempt.findMany({
    where: {
      status: ATTEMPT_STATUS.IN_PROGRESS,
      expiresAt: { lt: new Date(Date.now() - SAVE_GRACE_MS) },
      ...(competitionId ? { registration: { competitionId } } : {}),
    },
    select: { id: true },
  });
  let count = 0;
  for (const a of expired) if ((await finalizeAttempt(a.id, SUBMISSION_TYPE.AUTO_TIMEOUT)).finalized) count++;
  return count;
}
