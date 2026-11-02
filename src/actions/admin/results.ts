"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { ALLOCATION_STATUS, ATTEMPT_STATUS, NOTIFICATION_TYPE, RESULT_STATUS, RESULTS_STATUS } from "@/lib/constants";
import { prizeForRank, rankResults } from "@/lib/exam/ranking";
import { finalizeExpiredAttempts, regradeResult } from "@/lib/exam/engine";
import { formatNumber } from "@/lib/format";

const path = (id: number) => `/admin/results/${id}`;

/** Any change to individual results invalidates a draft merit list. */
async function invalidateDraft(competitionId: number) {
  const c = await db.competition.findUnique({ where: { id: competitionId } });
  if (c?.resultsStatus === RESULTS_STATUS.DRAFT) {
    await db.$transaction([
      db.examResult.updateMany({ where: { attempt: { registration: { competitionId } } }, data: { meritRank: null } }),
      db.competition.update({ where: { id: competitionId }, data: { resultsStatus: RESULTS_STATUS.PENDING, meritGeneratedAt: null } }),
    ]);
  }
}

function lockedMessage(status: string) {
  return status === RESULTS_STATUS.PUBLISHED || status === RESULTS_STATUS.APPROVED
    ? "The merit list is approved/published. Unpublish it (with a reason) before changing results."
    : null;
}

export async function setResultStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.manage");
  const parsed = parseForm(
    z.object({
      resultId: z.coerce.number().int(),
      status: z.enum([RESULT_STATUS.VERIFIED, RESULT_STATUS.WITHHELD, RESULT_STATUS.DISQUALIFIED, RESULT_STATUS.PROVISIONAL]),
      reason: z.string().trim().max(1000).optional(),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const r = await db.examResult.findUnique({ where: { id: d.resultId }, include: { attempt: { include: { registration: { include: { competition: true } } } } } });
  if (!r) return fail("Result not found.");
  const comp = r.attempt.registration.competition;
  const locked = lockedMessage(comp.resultsStatus);
  if (locked) return fail(locked);
  if (r.pendingReviewCount > 0 && d.status === RESULT_STATUS.VERIFIED) return fail("Mark the written answers before verifying this result.");
  if (r.attempt.status === ATTEMPT_STATUS.VOIDED) return fail("This attempt was voided.");
  if (d.status !== RESULT_STATUS.VERIFIED && (!d.reason || d.reason.length < 5)) return fail("Give a reason (it is recorded in the change log).");

  await db.$transaction([
    db.examResult.update({ where: { id: r.id }, data: { status: d.status, verifiedById: s.user.id, verifiedAt: new Date(), notes: d.reason ?? r.notes } }),
    db.resultChangeLog.create({ data: { resultId: r.id, changedById: s.user.id, field: "status", oldValue: r.status, newValue: d.status, reason: d.reason || "Verified by examiner" } }),
  ]);
  await invalidateDraft(comp.id);
  await audit({ actor: s, action: `result.${d.status.toLowerCase()}`, entityType: "ExamResult", entityId: r.id, details: { reason: d.reason } });
  revalidatePath(path(comp.id));
  return success(`Result marked ${d.status.toLowerCase()}.`);
}

export async function bulkVerifyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.manage");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUniqueOrThrow({ where: { id: competitionId } });
  const locked = lockedMessage(comp.resultsStatus);
  if (locked) return fail(locked);
  const clean = await db.examResult.findMany({
    where: { status: RESULT_STATUS.PROVISIONAL, attempt: { flagCount: 0, status: { not: ATTEMPT_STATUS.VOIDED }, registration: { competitionId } } },
    select: { id: true },
  });
  if (!clean.length) return fail("No unflagged provisional results to verify.");
  await db.$transaction([
    db.examResult.updateMany({ where: { id: { in: clean.map((c) => c.id) } }, data: { status: RESULT_STATUS.VERIFIED, verifiedById: s.user.id, verifiedAt: new Date() } }),
    db.resultChangeLog.createMany({ data: clean.map((c) => ({ resultId: c.id, changedById: s.user.id, field: "status", oldValue: RESULT_STATUS.PROVISIONAL, newValue: RESULT_STATUS.VERIFIED, reason: "Bulk verification (no integrity flags)" })) }),
  ]);
  await invalidateDraft(competitionId);
  await audit({ actor: s, action: "result.bulk_verified", entityType: "Competition", entityId: competitionId, details: { count: clean.length } });
  revalidatePath(path(competitionId));
  return success(`${clean.length} result(s) verified. Flagged attempts still need individual review.`);
}

export async function generateMeritListAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.manage");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUniqueOrThrow({ where: { id: competitionId } });
  const locked = lockedMessage(comp.resultsStatus);
  if (locked) return fail(locked);
  if (new Date() < comp.examEndsAt) return fail("The examination window has not closed yet.");
  await finalizeExpiredAttempts(competitionId);

  const open = await db.examAttempt.count({ where: { status: ATTEMPT_STATUS.IN_PROGRESS, registration: { competitionId } } });
  if (open) return fail(`${open} attempt(s) are still in progress.`);
  const unresolved = await db.examResult.count({
    where: { status: { in: [RESULT_STATUS.PROVISIONAL, RESULT_STATUS.PENDING_REVIEW] }, attempt: { status: { not: ATTEMPT_STATUS.VOIDED }, registration: { competitionId } } },
  });
  if (unresolved) return fail(`${unresolved} result(s) are still provisional or need marking. Verify, withhold or disqualify every result first.`);
  const lockedAllocations = await db.prizeAllocation.count({ where: { prize: { competitionId }, status: { not: ALLOCATION_STATUS.PENDING_VERIFICATION } } });
  if (lockedAllocations) return fail("Some prize allocations are already verified or closed; the merit list can no longer be regenerated.");

  const verified = await db.examResult.findMany({
    where: { status: RESULT_STATUS.VERIFIED, attempt: { status: { not: ATTEMPT_STATUS.VOIDED }, registration: { competitionId } } },
    include: { attempt: { include: { registration: true } } },
  });
  const ranks = rankResults(
    verified.map((r) => ({
      resultId: r.id,
      score: r.score,
      incorrectCount: r.incorrectCount,
      timeTakenSeconds: r.timeTakenSeconds,
      submittedAt: r.attempt.submittedAt ?? r.createdAt,
      registeredAt: r.attempt.registration.createdAt,
    })),
  );
  await db.$transaction(
    async (tx) => {
      await tx.prizeAllocation.deleteMany({ where: { prize: { competitionId }, status: ALLOCATION_STATUS.PENDING_VERIFICATION, distribution: { is: null } } });
      await tx.examResult.updateMany({ where: { attempt: { registration: { competitionId } } }, data: { meritRank: null } });
      for (const r of ranks) await tx.examResult.update({ where: { id: r.resultId }, data: { meritRank: r.rank } });
      await tx.competition.update({ where: { id: competitionId }, data: { resultsStatus: RESULTS_STATUS.DRAFT, meritGeneratedAt: new Date() } });
    },
    { timeout: 120_000 },
  );
  await audit({ actor: s, action: "merit_list.generated", entityType: "Competition", entityId: competitionId, details: { ranked: ranks.length } });
  revalidatePath(path(competitionId));
  return success(`Draft merit list generated: ${ranks.length} verified result(s) ranked using the published tie-breaking rules.`);
}

export async function approveMeritListAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.approve");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUniqueOrThrow({ where: { id: competitionId } });
  if (comp.resultsStatus !== RESULTS_STATUS.DRAFT) return fail("Generate a draft merit list first.");
  await db.competition.update({ where: { id: competitionId }, data: { resultsStatus: RESULTS_STATUS.APPROVED, resultsApprovedAt: new Date(), resultsApprovedById: s.user.id } });
  await audit({ actor: s, action: "merit_list.approved", entityType: "Competition", entityId: competitionId });
  revalidatePath(path(competitionId));
  return success("Merit list approved. You can now allocate prizes and publish.");
}

export async function allocatePrizesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("prizes.manage");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUniqueOrThrow({ where: { id: competitionId }, include: { prizes: true } });
  if (comp.resultsStatus !== RESULTS_STATUS.APPROVED && comp.resultsStatus !== RESULTS_STATUS.PUBLISHED) return fail("Approve the merit list before allocating prizes.");
  if (!comp.prizes.length) return fail("This competition has no prize tiers.");
  const maxRank = Math.max(...comp.prizes.map((p) => p.rankTo));
  const ranked = await db.examResult.findMany({
    where: { meritRank: { not: null, lte: maxRank }, status: RESULT_STATUS.VERIFIED, attempt: { registration: { competitionId } } },
    include: { prizeAllocation: true },
  });
  let created = 0;
  for (const r of ranked) {
    const tier = prizeForRank(r.meritRank, comp.prizes);
    if (!tier || r.prizeAllocation) continue;
    await db.prizeAllocation.create({ data: { prizeId: tier.id, resultId: r.id, rank: r.meritRank!, status: ALLOCATION_STATUS.PENDING_VERIFICATION } });
    created++;
  }
  await audit({ actor: s, action: "prizes.allocated", entityType: "Competition", entityId: competitionId, details: { created } });
  revalidatePath(path(competitionId));
  return success(`${created} provisional prize allocation(s) created. Verify each winner in Winners before they are announced.`);
}

export async function publishResultsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.approve");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUniqueOrThrow({ where: { id: competitionId }, include: { prizes: true } });
  if (comp.resultsStatus !== RESULTS_STATUS.APPROVED) return fail("Only an approved merit list can be published.");
  await db.competition.update({ where: { id: competitionId }, data: { resultsStatus: RESULTS_STATUS.PUBLISHED, resultsPublishedAt: new Date(), resultsPublishedById: s.user.id } });

  const results = await db.examResult.findMany({
    where: { attempt: { status: { not: ATTEMPT_STATUS.VOIDED }, registration: { competitionId } } },
    include: { attempt: { include: { registration: true } }, prizeAllocation: { include: { prize: true } } },
  });
  for (const r of results) {
    const rankText = r.meritRank ? `Your merit position is #${r.meritRank} with ${formatNumber(r.score, 2)}/${formatNumber(r.maxScore, 2)} marks.` : `Your result status: ${r.status.toLowerCase()}.`;
    await notify(r.attempt.registration.userId, {
      type: NOTIFICATION_TYPE.RESULT,
      title: `Results published: ${comp.title}`,
      body: rankText,
      link: `/dashboard/results/${r.id}`,
      email: true,
    });
    if (r.prizeAllocation) {
      await notify(r.attempt.registration.userId, {
        type: NOTIFICATION_TYPE.PRIZE,
        title: `You are provisionally eligible for a ${r.prizeAllocation.prize.title}!`,
        body: `Congratulations on position #${r.meritRank}. Our team will contact you to complete identity and eligibility verification before the prize is confirmed.`,
        link: `/dashboard/results/${r.id}`,
      });
    }
  }
  await audit({ actor: s, action: "results.published", entityType: "Competition", entityId: competitionId, details: { notified: results.length } });
  revalidatePath(path(competitionId));
  return success(`Results published and ${results.length} participant(s) notified.`);
}

export async function unpublishResultsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.approve");
  const parsed = parseForm(z.object({ competitionId: z.coerce.number().int(), reason: z.string().trim().min(10, "Explain why (min 10 characters)").max(1000) }), fd);
  if (!parsed.ok) return parsed.state;
  const comp = await db.competition.findUniqueOrThrow({ where: { id: parsed.data.competitionId } });
  if (comp.resultsStatus !== RESULTS_STATUS.PUBLISHED && comp.resultsStatus !== RESULTS_STATUS.APPROVED) return fail("Results are not approved or published.");
  await db.competition.update({ where: { id: comp.id }, data: { resultsStatus: RESULTS_STATUS.DRAFT, resultsApprovedAt: null, resultsApprovedById: null, resultsPublishedAt: null, resultsPublishedById: null } });
  await audit({ actor: s, action: "results.unpublished", entityType: "Competition", entityId: comp.id, details: { reason: parsed.data.reason, previous: comp.resultsStatus } });
  revalidatePath(path(comp.id));
  return success("Results moved back to draft. Make corrections, regenerate the merit list, then approve and publish again.");
}

/** Fixes a wrong answer key discovered after the exam and re-grades every affected attempt (all changes logged). */
export async function correctAnswerKeyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("results.approve");
  const parsed = parseForm(
    z.object({ competitionId: z.coerce.number().int(), questionId: z.coerce.number().int(), optionId: z.coerce.number().int(), reason: z.string().trim().min(10, "Explain the correction").max(1000) }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const comp = await db.competition.findUniqueOrThrow({ where: { id: d.competitionId } });
  const locked = lockedMessage(comp.resultsStatus);
  if (locked) return fail(locked);
  const q = await db.question.findUnique({ where: { id: d.questionId }, include: { options: true } });
  if (!q || !q.options.some((o) => o.id === d.optionId)) return fail("Question or option not found.");
  const old = q.options.find((o) => o.isCorrect);
  if (old?.id === d.optionId) return fail("That option is already the correct answer.");

  await db.$transaction([
    db.answerOption.updateMany({ where: { questionId: q.id }, data: { isCorrect: false } }),
    db.answerOption.update({ where: { id: d.optionId }, data: { isCorrect: true } }),
  ]);
  const attempts = await db.examAttempt.findMany({
    where: { answers: { some: { questionId: q.id } }, result: { isNot: null } },
    select: { id: true, registration: { select: { competitionId: true } } },
  });
  for (const a of attempts) await regradeResult(a.id, s.user.id, `Answer key corrected for question ${q.id}: ${d.reason}`);
  const comps = new Set(attempts.map((a) => a.registration.competitionId));
  for (const cid of comps) await invalidateDraft(cid);
  await audit({ actor: s, action: "question.answer_key_corrected", entityType: "Question", entityId: q.id, details: { from: old?.id, to: d.optionId, reason: d.reason, regraded: attempts.length } });
  revalidatePath(path(d.competitionId));
  return success(`Answer key corrected and ${attempts.length} attempt(s) re-graded. Regenerate the merit list.`);
}
