"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { revokeUserSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  ATTEMPT_STATUS,
  NOTIFICATION_TYPE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  QUESTION_TYPE,
  REFUND_STATUS,
  REGISTRATION_STATUS,
  RESULT_STATUS,
  SUBMISSION_TYPE,
  USER_STATUS,
} from "@/lib/constants";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/payments/service";
import { finalizeAttempt, finalizeExpiredAttempts, regradeResult } from "@/lib/exam/engine";
import { formatPKR, num } from "@/lib/format";

// ───────────────────────── Students ─────────────────────────

export async function setUserStatusAction(userId: number, status: string): Promise<void> {
  const s = await staffOrThrow("students.manage");
  if (status !== USER_STATUS.ACTIVE && status !== USER_STATUS.SUSPENDED) return;
  if (userId === s.user.id) return;
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === USER_STATUS.SUSPENDED) await revokeUserSessions(userId);
  await audit({ actor: s, action: `user.${status.toLowerCase()}`, entityType: "User", entityId: userId });
  revalidatePath(`/admin/students/${userId}`);
}

export async function markEmailVerifiedAction(userId: number): Promise<void> {
  const s = await staffOrThrow("students.manage");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await audit({ actor: s, action: "user.email_verified_manually", entityType: "User", entityId: userId });
  revalidatePath(`/admin/students/${userId}`);
}

export async function verifyGuardianConsentAction(userId: number): Promise<void> {
  const s = await staffOrThrow("students.manage");
  await db.studentProfile.updateMany({ where: { userId, guardianConsentAt: { not: null } }, data: { guardianConsentVerified: true } });
  await audit({ actor: s, action: "user.guardian_consent_verified", entityType: "User", entityId: userId });
  revalidatePath(`/admin/students/${userId}`);
}

export async function revokeSessionsAction(userId: number): Promise<void> {
  const s = await staffOrThrow("students.manage");
  await revokeUserSessions(userId);
  await audit({ actor: s, action: "user.sessions_revoked", entityType: "User", entityId: userId });
  revalidatePath(`/admin/students/${userId}`);
}

// ───────────────────────── Registrations ─────────────────────────

export async function cancelRegistrationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("registrations.manage");
  const parsed = parseForm(z.object({ registrationId: z.coerce.number().int(), reason: z.string().trim().min(5, "Give a reason").max(500) }), fd);
  if (!parsed.ok) return parsed.state;
  const reg = await db.competitionRegistration.findUnique({ where: { id: parsed.data.registrationId }, include: { payments: true, competition: true, attempts: true } });
  if (!reg) return fail("Registration not found.");
  if (reg.status === REGISTRATION_STATUS.CANCELLED || reg.status === REGISTRATION_STATUS.REFUNDED) return fail("Already cancelled.");
  if (reg.attempts.some((a) => a.status !== ATTEMPT_STATUS.VOIDED)) return fail("The student has attempted the exam; disqualify the result instead of cancelling.");

  const paid = reg.payments.find((p) => p.status === PAYMENT_STATUS.SUCCEEDED);
  await db.$transaction([
    db.competitionRegistration.update({
      where: { id: reg.id },
      data: { status: REGISTRATION_STATUS.CANCELLED, cancelledAt: new Date(), cancellationReason: parsed.data.reason },
    }),
    db.payment.updateMany({ where: { registrationId: reg.id, status: { in: [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PENDING_VERIFICATION] } }, data: { status: PAYMENT_STATUS.CANCELLED, failureReason: "Registration cancelled by staff" } }),
    ...(paid ? [db.payment.update({ where: { id: paid.id }, data: { refundStatus: REFUND_STATUS.REQUESTED, refundReason: `Registration cancelled: ${parsed.data.reason}` } })] : []),
  ]);
  await notify(reg.userId, {
    type: NOTIFICATION_TYPE.REGISTRATION,
    title: "Registration cancelled",
    body: `Your registration ${reg.registrationNumber} for "${reg.competition.title}" was cancelled. Reason: ${parsed.data.reason}.${paid ? " A refund has been requested and will be processed per our Refund Policy." : ""}`,
    link: "/dashboard/registrations",
    email: true,
  });
  await audit({ actor: s, action: "registration.cancelled", entityType: "CompetitionRegistration", entityId: reg.id, details: { reason: parsed.data.reason, refundRequested: !!paid } });
  revalidatePath("/admin/registrations");
  return success("Registration cancelled.");
}

// ───────────────────────── Payments ─────────────────────────

export async function reviewManualPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("payments.manage");
  const parsed = parseForm(
    z.object({ paymentId: z.coerce.number().int(), decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().max(500).optional() }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const p = await db.payment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!p || p.method !== PAYMENT_METHOD.MANUAL_TRANSFER) return fail("Payment not found.");
  if (p.status !== PAYMENT_STATUS.PENDING_VERIFICATION) return fail(`This payment is already ${p.status.toLowerCase()}.`);

  if (parsed.data.decision === "APPROVE") {
    await markPaymentSucceeded(p.id, { verifiedById: s.user.id });
    await audit({ actor: s, action: "payment.manual_verified", entityType: "Payment", entityId: p.id, details: { reference: p.reference, payerReference: p.payerReference, amount: num(p.amount) } });
  } else {
    if (!parsed.data.reason || parsed.data.reason.length < 5) return fail("Give a reason for rejecting (the student will see it).", { reason: ["Required"] });
    await markPaymentFailed(p.id, `Not verified: ${parsed.data.reason}`);
    await audit({ actor: s, action: "payment.manual_rejected", entityType: "Payment", entityId: p.id, details: { reason: parsed.data.reason } });
  }
  revalidatePath("/admin/payments");
  return success(parsed.data.decision === "APPROVE" ? "Payment verified and registration confirmed." : "Payment rejected and the student notified.");
}

export async function refundAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("payments.manage");
  const parsed = parseForm(
    z.object({
      paymentId: z.coerce.number().int(),
      step: z.enum(["REQUEST", "COMPLETE", "REJECT"]),
      amount: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).optional()),
      reason: z.string().trim().min(5, "Give a reason").max(500),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const p = await db.payment.findUnique({ where: { id: d.paymentId }, include: { registration: { include: { competition: true } } } });
  if (!p || p.status !== PAYMENT_STATUS.SUCCEEDED) return fail("Only paid payments can be refunded.");

  if (d.step === "REQUEST") {
    await db.payment.update({ where: { id: p.id }, data: { refundStatus: REFUND_STATUS.REQUESTED, refundReason: d.reason } });
  } else if (d.step === "REJECT") {
    await db.payment.update({ where: { id: p.id }, data: { refundStatus: REFUND_STATUS.REJECTED, refundReason: d.reason } });
    await notify(p.registration.userId, { type: NOTIFICATION_TYPE.PAYMENT, title: "Refund request declined", body: `Your refund request for payment ${p.reference} was declined: ${d.reason}`, link: "/dashboard/payments" });
  } else {
    const amount = d.amount ?? num(p.amount);
    if (amount > num(p.amount)) return fail("Refund cannot exceed the amount paid.");
    await db.$transaction([
      db.payment.update({ where: { id: p.id }, data: { status: PAYMENT_STATUS.REFUNDED, refundStatus: REFUND_STATUS.REFUNDED, refundAmount: amount, refundReason: d.reason, refundedAt: new Date() } }),
      db.competitionRegistration.update({ where: { id: p.registrationId }, data: { status: REGISTRATION_STATUS.REFUNDED, cancelledAt: new Date(), cancellationReason: `Refunded: ${d.reason}` } }),
    ]);
    await notify(p.registration.userId, {
      type: NOTIFICATION_TYPE.PAYMENT,
      title: "Refund processed",
      body: `${formatPKR(amount)} for payment ${p.reference} ("${p.registration.competition.title}") has been refunded. Your registration is no longer active.`,
      link: "/dashboard/payments",
      email: true,
    });
  }
  await audit({ actor: s, action: `payment.refund_${d.step.toLowerCase()}`, entityType: "Payment", entityId: p.id, details: { reason: d.reason, amount: d.amount } });
  revalidatePath("/admin/payments");
  return success(d.step === "COMPLETE" ? "Refund recorded." : d.step === "REQUEST" ? "Refund requested." : "Refund rejected.");
}

// ───────────────────────── Examinations ─────────────────────────

export async function forceSubmitAttemptAction(attemptId: number): Promise<void> {
  const s = await staffOrThrow("exams.manage");
  const res = await finalizeAttempt(attemptId, SUBMISSION_TYPE.ADMIN_FORCED);
  if (res.finalized) await audit({ actor: s, action: "attempt.force_submitted", entityType: "ExamAttempt", entityId: attemptId });
  revalidatePath(`/admin/exams/${attemptId}`);
}

export async function finalizeExpiredAction(): Promise<void> {
  const s = await staffOrThrow("exams.manage");
  const n = await finalizeExpiredAttempts();
  await audit({ actor: s, action: "attempt.finalize_expired", entityType: "ExamAttempt", details: { finalized: n } });
  revalidatePath("/admin/exams");
}

/** Voids an attempt (e.g. verified technical failure) so the student may re-attempt. Its result is withheld from ranking. */
export async function voidAttemptAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("exams.manage");
  const parsed = parseForm(z.object({ attemptId: z.coerce.number().int(), reason: z.string().trim().min(10, "Explain why (min 10 characters)").max(500) }), fd);
  if (!parsed.ok) return parsed.state;
  const a = await db.examAttempt.findUnique({ where: { id: parsed.data.attemptId }, include: { result: true, registration: { include: { competition: true } } } });
  if (!a || a.status === ATTEMPT_STATUS.VOIDED) return fail("Attempt not found or already voided.");
  if (a.registration.competition.resultsStatus !== "PENDING" && a.registration.competition.resultsStatus !== "DRAFT") return fail("Results for this competition are approved or published; unpublish them first.");

  await db.$transaction([
    db.examAttempt.update({ where: { id: a.id }, data: { status: ATTEMPT_STATUS.VOIDED, voidReason: parsed.data.reason } }),
    ...(a.result
      ? [
          db.examResult.update({ where: { id: a.result.id }, data: { status: RESULT_STATUS.WITHHELD, meritRank: null, notes: `Attempt voided: ${parsed.data.reason}` } }),
          db.resultChangeLog.create({ data: { resultId: a.result.id, changedById: s.user.id, field: "status", oldValue: a.result.status, newValue: RESULT_STATUS.WITHHELD, reason: `Attempt voided: ${parsed.data.reason}` } }),
        ]
      : []),
  ]);
  await notify(a.registration.userId, {
    type: NOTIFICATION_TYPE.EXAM,
    title: "Examination attempt reset",
    body: `Your attempt for "${a.registration.competition.title}" was voided (${parsed.data.reason}). You may start a new attempt while the examination window is open.`,
    link: `/dashboard/exams/${a.registration.registrationNumber}`,
    email: true,
  });
  await audit({ actor: s, action: "attempt.voided", entityType: "ExamAttempt", entityId: a.id, details: { reason: parsed.data.reason } });
  revalidatePath(`/admin/exams/${a.id}`);
  return success("Attempt voided. The student can start a new attempt during the exam window.");
}

export async function gradeAnswerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("exams.manage");
  const parsed = parseForm(
    z.object({ answerId: z.coerce.number().int(), marks: z.coerce.number().min(0).max(100), note: z.string().trim().max(500).optional() }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const ans = await db.studentAnswer.findUnique({ where: { id: parsed.data.answerId }, include: { question: true, attempt: { include: { registration: { include: { competition: true } } } } } });
  if (!ans || ans.question.type !== QUESTION_TYPE.SHORT_ANSWER) return fail("Only written answers can be marked manually.");
  const max = ans.attempt.registration.competition.marksPerQuestion ?? ans.question.marks;
  if (parsed.data.marks > max) return fail(`Maximum for this question is ${max}.`);
  if (ans.attempt.status === ATTEMPT_STATUS.IN_PROGRESS) return fail("The attempt is still in progress.");
  await db.studentAnswer.update({
    where: { id: ans.id },
    data: { marksAwarded: parsed.data.marks, isCorrect: parsed.data.marks > 0, reviewedById: s.user.id, reviewedAt: new Date(), reviewNote: parsed.data.note ?? null },
  });
  await regradeResult(ans.attemptId, s.user.id, `Manual marking of question ${ans.questionId}`);
  await audit({ actor: s, action: "answer.graded", entityType: "StudentAnswer", entityId: ans.id, details: { marks: parsed.data.marks } });
  revalidatePath(`/admin/exams/${ans.attemptId}`);
  return success("Marks saved and result recalculated.");
}
