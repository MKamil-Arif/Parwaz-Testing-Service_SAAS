"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { checkbox, optionalText, profileSchema } from "@/lib/validation";
import { getSession, type CurrentSession } from "@/lib/auth/session";
import { isStudent } from "@/lib/auth/permissions";
import {
  NOTIFICATION_TYPE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REGISTRATION_STATUS,
  RESULTS_STATUS,
  TICKET_CATEGORY,
  TICKET_STATUS,
} from "@/lib/constants";
import { ageOn, formatPKR, num, toDateInput } from "@/lib/format";
import { checkEligibility, competitionPhase } from "@/lib/competition-rules";
import { isMethodAvailable } from "@/lib/payments/gateway";
import { onRegistrationConfirmed } from "@/lib/registrations";
import { notify } from "@/lib/notifications";
import { paymentReference, registrationNumber, ticketNumber } from "@/lib/tokens";
import { startAttempt } from "@/lib/exam/engine";
import { getClientIp, getUserAgent } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

async function studentSession(): Promise<CurrentSession | null> {
  const s = await getSession();
  return s && isStudent(s.user.roles) ? s : null;
}

// ───────────────────────── Profile ─────────────────────────

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(profileSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const existing = await db.studentProfile.findUnique({ where: { userId: s.user.id } });
  const minor = ageOn(d.dateOfBirth) < 18;

  // Identity-relevant fields are locked once the student has a confirmed registration.
  const locked = await db.competitionRegistration.count({ where: { userId: s.user.id, status: REGISTRATION_STATUS.CONFIRMED } });
  if (locked && existing) {
    const user = await db.user.findUniqueOrThrow({ where: { id: s.user.id } });
    if (user.fullName !== d.fullName || toDateInput(existing.dateOfBirth) !== toDateInput(d.dateOfBirth)) {
      return fail("Your name and date of birth are locked after a confirmed registration. Contact support to correct them.");
    }
  }

  const profileData = {
    city: d.city,
    district: d.district,
    institution: d.institution,
    classLevel: d.classLevel,
    dateOfBirth: d.dateOfBirth,
    guardianName: minor ? (d.guardianName ?? null) : null,
    guardianPhone: minor ? (d.guardianPhone?.replace(/[\s-]/g, "") ?? null) : null,
    guardianRelation: minor ? (d.guardianRelation ?? null) : null,
    guardianConsentAt: minor && d.guardianConsent ? (existing?.guardianConsentAt ?? new Date()) : null,
    leaderboardNameMode: d.leaderboardNameMode,
    mediaConsent: d.mediaConsent,
  };
  await db.user.update({
    where: { id: s.user.id },
    data: {
      fullName: d.fullName,
      phone: d.phone,
      profile: existing ? { update: profileData } : { create: { ...profileData, termsAcceptedAt: new Date() } },
    },
  });
  revalidatePath("/dashboard", "layout");
  return success("Profile saved.");
}

// ───────────────────────── Competition registration ─────────────────────────

export async function registerForCompetitionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(
    z.object({
      competitionId: z.coerce.number().int(),
      confirmEligibility: checkbox.refine((v) => v, "Please confirm that you meet the eligibility criteria"),
      acceptRules: checkbox.refine((v) => v, "You must accept the competition rules"),
      confirmDetails: checkbox.refine((v) => v, "Please confirm your details are correct"),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;

  const user = await db.user.findUniqueOrThrow({ where: { id: s.user.id }, include: { profile: true } });
  const comp = await db.competition.findUnique({
    where: { id: parsed.data.competitionId },
    include: { eligibleClasses: true },
  });
  if (!comp || comp.status !== "PUBLISHED") return fail("This competition is not available.");
  if (competitionPhase(comp) !== "REGISTRATION_OPEN") return fail("Registration for this competition is not open.");
  if (!user.emailVerifiedAt) return fail("Please verify your email address before registering.");
  if (!user.profile) return fail("Please complete your profile first.");
  if (ageOn(user.profile.dateOfBirth) < 18 && !user.profile.guardianConsentAt)
    return fail("Parent/guardian consent is required for students under 18. Add it in My Profile.");

  const checks = checkEligibility({ ...comp, eligibleClasses: comp.eligibleClasses.map((e) => e.classLevel) }, user.profile);
  const failed = checks.find((c) => !c.ok);
  if (failed) return fail(`You are not eligible: ${failed.label} — ${failed.detail}`);

  if (comp.maxRegistrations) {
    const confirmed = await db.competitionRegistration.count({ where: { competitionId: comp.id, status: REGISTRATION_STATUS.CONFIRMED } });
    if (confirmed >= comp.maxRegistrations) return fail("This competition has reached its maximum number of registrations.");
  }

  const free = num(comp.registrationFee) === 0;
  const now = new Date();
  const existing = await db.competitionRegistration.findUnique({ where: { userId_competitionId: { userId: user.id, competitionId: comp.id } } });
  let registrationId: number;

  if (existing) {
    if (existing.status !== REGISTRATION_STATUS.CANCELLED) redirect(`/dashboard/registrations/${existing.id}/pay`);
    const updated = await db.competitionRegistration.update({
      where: { id: existing.id },
      data: {
        status: free ? REGISTRATION_STATUS.CONFIRMED : REGISTRATION_STATUS.PENDING_PAYMENT,
        eligibilityConfirmedAt: now,
        rulesAcceptedAt: now,
        confirmedAt: free ? now : null,
        cancelledAt: null,
        cancellationReason: null,
      },
    });
    registrationId = updated.id;
  } else {
    let created = null;
    for (let i = 0; i < 5 && !created; i++) {
      try {
        created = await db.competitionRegistration.create({
          data: {
            registrationNumber: registrationNumber(),
            userId: user.id,
            competitionId: comp.id,
            status: free ? REGISTRATION_STATUS.CONFIRMED : REGISTRATION_STATUS.PENDING_PAYMENT,
            eligibilityConfirmedAt: now,
            rulesAcceptedAt: now,
            confirmedAt: free ? now : null,
          },
        });
      } catch (err) {
        const dup = await db.competitionRegistration.findUnique({ where: { userId_competitionId: { userId: user.id, competitionId: comp.id } } });
        if (dup) redirect(`/dashboard/registrations/${dup.id}/pay`);
        if (i === 4) throw err;
      }
    }
    registrationId = created!.id;
  }

  if (free) {
    await onRegistrationConfirmed(registrationId);
    redirect("/dashboard/exams?registered=1");
  }
  await notify(user.id, {
    type: NOTIFICATION_TYPE.REGISTRATION,
    title: "Registration started — payment pending",
    body: `Complete your ${formatPKR(comp.registrationFee)} payment to confirm your place in "${comp.title}".`,
    link: `/dashboard/registrations/${registrationId}/pay`,
  });
  redirect(`/dashboard/registrations/${registrationId}/pay`);
}

export async function cancelPendingRegistrationAction(registrationId: number): Promise<void> {
  const s = await studentSession();
  if (!s) redirect("/login");
  const reg = await db.competitionRegistration.findUnique({ where: { id: registrationId }, include: { payments: true } });
  if (!reg || reg.userId !== s.user.id || reg.status !== REGISTRATION_STATUS.PENDING_PAYMENT) redirect("/dashboard/registrations");
  if (reg.payments.some((p) => p.status === PAYMENT_STATUS.PENDING_VERIFICATION || p.status === PAYMENT_STATUS.SUCCEEDED)) {
    redirect(`/dashboard/registrations/${registrationId}/pay?error=payment-in-review`);
  }
  await db.$transaction([
    db.payment.updateMany({ where: { registrationId, status: PAYMENT_STATUS.INITIATED }, data: { status: PAYMENT_STATUS.CANCELLED } }),
    db.competitionRegistration.update({
      where: { id: registrationId },
      data: { status: REGISTRATION_STATUS.CANCELLED, cancelledAt: new Date(), cancellationReason: "Cancelled by student before payment" },
    }),
  ]);
  redirect("/dashboard/registrations");
}

// ───────────────────────── Payments ─────────────────────────

async function payableRegistration(s: CurrentSession, registrationId: number) {
  const reg = await db.competitionRegistration.findUnique({
    where: { id: registrationId },
    include: { competition: true, payments: true },
  });
  if (!reg || reg.userId !== s.user.id) return { error: "Registration not found." } as const;
  if (reg.status !== REGISTRATION_STATUS.PENDING_PAYMENT) return { error: "This registration does not need a payment." } as const;
  if (reg.payments.some((p) => p.status === PAYMENT_STATUS.PENDING_VERIFICATION))
    return { error: "A payment for this registration is already awaiting verification." } as const;
  if (reg.payments.some((p) => p.status === PAYMENT_STATUS.SUCCEEDED)) return { error: "This registration is already paid." } as const;
  if (new Date() > reg.competition.registrationClosesAt) return { error: "Registration for this competition has closed." } as const;
  return { reg } as const;
}

export async function startOnlinePaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const registrationId = Number(fd.get("registrationId"));
  const method = String(fd.get("method") ?? "");
  if (!isMethodAvailable(method) || method === PAYMENT_METHOD.MANUAL_TRANSFER) return fail("This payment method is not available.");
  if (!rateLimit(`pay:${s.user.id}`, 10, 600).allowed) return fail("Too many payment attempts. Please wait a few minutes.");

  const r = await payableRegistration(s, registrationId);
  if ("error" in r) return fail(r.error ?? "Cannot start payment.");

  // Abandon any earlier unfinished checkout before opening a new one.
  await db.payment.updateMany({
    where: { registrationId, status: PAYMENT_STATUS.INITIATED },
    data: { status: PAYMENT_STATUS.CANCELLED, failureReason: "Replaced by a new checkout" },
  });
  const payment = await db.payment.create({
    data: {
      reference: paymentReference(),
      registrationId,
      amount: r.reg.competition.registrationFee,
      method,
      status: PAYMENT_STATUS.INITIATED,
      isSandbox: method === PAYMENT_METHOD.SANDBOX,
    },
  });
  if (method === PAYMENT_METHOD.SANDBOX) redirect(`/pay/sandbox/${payment.reference}`);
  return fail("This gateway is not active yet.");
}

export async function submitManualPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(
    z.object({
      registrationId: z.coerce.number().int(),
      payerReference: z.string().trim().min(4, "Enter the transaction ID / reference from your receipt").max(100),
      payerAccount: z.string().trim().min(4, "Enter the sending account or mobile number").max(100),
      payerNote: optionalText(500),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const r = await payableRegistration(s, d.registrationId);
  if ("error" in r) return fail(r.error ?? "Cannot record payment.");

  const duplicate = await db.payment.findFirst({
    where: {
      method: PAYMENT_METHOD.MANUAL_TRANSFER,
      payerReference: d.payerReference,
      status: { in: [PAYMENT_STATUS.PENDING_VERIFICATION, PAYMENT_STATUS.SUCCEEDED] },
    },
  });
  if (duplicate) return fail("This transaction ID has already been submitted.", { payerReference: ["Already used"] });

  await db.payment.updateMany({ where: { registrationId: d.registrationId, status: PAYMENT_STATUS.INITIATED }, data: { status: PAYMENT_STATUS.CANCELLED } });
  const payment = await db.payment.create({
    data: {
      reference: paymentReference(),
      registrationId: d.registrationId,
      amount: r.reg.competition.registrationFee,
      method: PAYMENT_METHOD.MANUAL_TRANSFER,
      status: PAYMENT_STATUS.PENDING_VERIFICATION,
      payerReference: d.payerReference,
      payerAccount: d.payerAccount,
      payerNote: d.payerNote ?? null,
    },
  });
  await notify(s.user.id, {
    type: NOTIFICATION_TYPE.PAYMENT,
    title: "Payment submitted for verification",
    body: `We received your payment details (reference ${payment.reference}). Our team will verify the transfer and confirm your registration, usually within 24 hours.`,
    link: "/dashboard/payments",
  });
  revalidatePath(`/dashboard/registrations/${d.registrationId}/pay`);
  return success("Thank you! Your payment details were submitted. Your registration will be confirmed once our team verifies the transfer.");
}

// ───────────────────────── Examination ─────────────────────────

export async function startExamAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(
    z.object({
      registrationId: z.coerce.number().int(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
      declaration: checkbox.refine((v) => v, "You must accept the declaration to begin"),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;

  const profile = await db.studentProfile.findUnique({ where: { userId: s.user.id } });
  if (!profile || toDateInput(profile.dateOfBirth) !== parsed.data.dateOfBirth) {
    return fail("Identity check failed: the date of birth does not match your registration.", { dateOfBirth: ["Does not match our records"] });
  }
  const result = await startAttempt({
    userId: s.user.id,
    registrationId: parsed.data.registrationId,
    sessionId: s.sessionId,
    ipAddress: await getClientIp(),
    userAgent: await getUserAgent(),
  });
  if (!result.ok) return fail(result.error);
  redirect(`/exam/${result.publicId}`);
}

// ───────────────────────── Notifications ─────────────────────────

export async function markAllNotificationsReadAction(): Promise<void> {
  const s = await studentSession();
  if (!s) return;
  await db.notification.updateMany({ where: { userId: s.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard", "layout");
}

export async function markNotificationReadAction(id: number): Promise<void> {
  const s = await studentSession();
  if (!s) return;
  await db.notification.updateMany({ where: { id, userId: s.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard", "layout");
}

// ───────────────────────── Support ─────────────────────────

export async function createTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  if (!rateLimit(`ticket:${s.user.id}`, 6, 3600).allowed) return fail("You've opened several tickets recently. Please wait before opening another.");
  const parsed = parseForm(
    z.object({
      category: z.enum(["GENERAL", "REGISTRATION", "PAYMENT", "EXAM", "TECHNICAL", "COMPLAINT"]),
      subject: z.string().trim().min(3, "Enter a subject").max(200),
      message: z.string().trim().min(10, "Please describe the issue (at least 10 characters)").max(5000),
      competitionId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const user = await db.user.findUniqueOrThrow({ where: { id: s.user.id } });
  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber: ticketNumber(),
      userId: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      subject: parsed.data.subject,
      category: parsed.data.category,
      competitionId: parsed.data.competitionId ?? null,
      messages: { create: { authorId: user.id, body: parsed.data.message } },
    },
  });
  redirect(`/dashboard/support/${ticket.ticketNumber}`);
}

export async function replyTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(
    z.object({ ticketId: z.coerce.number().int(), message: z.string().trim().min(2, "Write a message").max(5000) }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const ticket = await db.supportTicket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket || ticket.userId !== s.user.id) return fail("Ticket not found.");
  if (ticket.status === TICKET_STATUS.CLOSED) return fail("This ticket is closed. Please open a new one.");
  await db.supportMessage.create({ data: { ticketId: ticket.id, authorId: s.user.id, body: parsed.data.message } });
  await db.supportTicket.update({ where: { id: ticket.id }, data: { status: TICKET_STATUS.OPEN } });
  revalidatePath(`/dashboard/support/${ticket.ticketNumber}`);
  return success("Reply sent.");
}

export async function raiseResultDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await studentSession();
  if (!s) return fail("Please log in again.");
  const parsed = parseForm(
    z.object({ resultId: z.coerce.number().int(), message: z.string().trim().min(20, "Please explain your concern (at least 20 characters)").max(5000) }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const result = await db.examResult.findUnique({
    where: { id: parsed.data.resultId },
    include: { attempt: { include: { registration: { include: { competition: true, user: true } } } } },
  });
  const reg = result?.attempt.registration;
  if (!result || !reg || reg.userId !== s.user.id) return fail("Result not found.");
  if (reg.competition.resultsStatus !== RESULTS_STATUS.PUBLISHED) return fail("Disputes can be raised once results are published.");
  const open = await db.supportTicket.findFirst({
    where: { resultId: result.id, category: TICKET_CATEGORY.RESULT_DISPUTE, status: { in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] } },
  });
  if (open) return fail(`You already have an open dispute (${open.ticketNumber}).`);

  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber: ticketNumber(),
      userId: s.user.id,
      name: reg.user.fullName,
      email: reg.user.email,
      phone: reg.user.phone,
      subject: `Result dispute — ${reg.competition.title}`,
      category: TICKET_CATEGORY.RESULT_DISPUTE,
      priority: "HIGH",
      competitionId: reg.competitionId,
      resultId: result.id,
      messages: { create: { authorId: s.user.id, body: parsed.data.message } },
    },
  });
  await audit({ actor: s, action: "result.dispute_raised", entityType: "ExamResult", entityId: result.id, details: { ticket: ticket.ticketNumber } });
  redirect(`/dashboard/support/${ticket.ticketNumber}`);
}
