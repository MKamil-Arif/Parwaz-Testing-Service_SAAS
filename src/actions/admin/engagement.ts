"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { checkbox, optionalText } from "@/lib/validation";
import { ATTEMPT_STATUS, BROADCAST_AUDIENCE, NOTIFICATION_TYPE, REGISTRATION_STATUS, ROLES, TICKET_PRIORITY, TICKET_STATUS, USER_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export async function sendBroadcastAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("notifications.send");
  const parsed = parseForm(
    z.object({
      audience: z.enum(Object.values(BROADCAST_AUDIENCE) as [string, ...string[]]),
      competitionId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
      type: z.enum(Object.values(NOTIFICATION_TYPE) as [string, ...string[]]),
      title: z.string().trim().min(3).max(200),
      body: z.string().trim().min(5).max(2000),
      link: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\/[^\s]*$/, "Use a site path such as /competitions").max(300).optional()),
      email: checkbox,
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  if (d.audience !== BROADCAST_AUDIENCE.ALL_STUDENTS && !d.competitionId) return fail("Choose a competition for this audience.", { competitionId: ["Required"] });

  let userIds: number[];
  if (d.audience === BROADCAST_AUDIENCE.ALL_STUDENTS) {
    userIds = (await db.user.findMany({ where: { status: USER_STATUS.ACTIVE, roles: { some: { role: { name: ROLES.STUDENT } } } }, select: { id: true } })).map((u) => u.id);
  } else {
    const status =
      d.audience === BROADCAST_AUDIENCE.COMPETITION_CONFIRMED
        ? { status: REGISTRATION_STATUS.CONFIRMED }
        : d.audience === BROADCAST_AUDIENCE.COMPETITION_PENDING_PAYMENT
          ? { status: REGISTRATION_STATUS.PENDING_PAYMENT }
          : { status: { in: [REGISTRATION_STATUS.CONFIRMED, REGISTRATION_STATUS.PENDING_PAYMENT] } };
    userIds = (await db.competitionRegistration.findMany({ where: { competitionId: d.competitionId, ...status }, select: { userId: true } })).map((r) => r.userId);
  }
  if (!userIds.length) return fail("No recipients match this audience.");
  const count = await notifyMany(userIds, { type: d.type, title: d.title, body: d.body, link: d.link, email: d.email });
  await db.notificationBroadcast.create({
    data: { title: d.title, body: d.body, link: d.link ?? null, audience: d.audience, competitionId: d.competitionId ?? null, channels: d.email ? "IN_APP,EMAIL" : "IN_APP", recipientCount: count, sentById: s.user.id },
  });
  await audit({ actor: s, action: "notification.broadcast", entityType: "NotificationBroadcast", details: { audience: d.audience, recipients: count } });
  revalidatePath("/admin/notifications");
  return success(`Notification sent to ${count} student(s)${d.email ? " (and queued by email)" : ""}.`);
}

/** Reminds confirmed registrants who have not yet attempted the exam. */
export async function sendExamRemindersAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("notifications.send");
  const competitionId = Number(fd.get("competitionId"));
  const comp = await db.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return fail("Choose a competition.");
  if (new Date() > comp.examEndsAt) return fail("The examination window has already closed.");
  const regs = await db.competitionRegistration.findMany({
    where: { competitionId, status: REGISTRATION_STATUS.CONFIRMED, attempts: { none: { status: { not: ATTEMPT_STATUS.VOIDED } } } },
    select: { userId: true },
  });
  if (!regs.length) return fail("Everyone has already attempted, or there are no confirmed registrations.");
  const count = await notifyMany(
    regs.map((r) => r.userId),
    {
      type: NOTIFICATION_TYPE.EXAM_REMINDER,
      title: `Exam reminder: ${comp.title}`,
      body: `Your examination window is ${formatDateTime(comp.examStartsAt)} – ${formatDateTime(comp.examEndsAt)} (PKT). Duration ${comp.durationMinutes} minutes. Make sure your phone is charged and you have a quiet place.`,
      link: "/dashboard/exams",
      email: true,
    },
  );
  await db.notificationBroadcast.create({
    data: { title: `Exam reminder: ${comp.title}`, body: "Automatic exam reminder", audience: BROADCAST_AUDIENCE.COMPETITION_CONFIRMED, competitionId, channels: "IN_APP,EMAIL", recipientCount: count, sentById: s.user.id },
  });
  await audit({ actor: s, action: "notification.exam_reminders", entityType: "Competition", entityId: competitionId, details: { recipients: count } });
  revalidatePath("/admin/notifications");
  return success(`Exam reminders sent to ${count} student(s).`);
}

export async function staffReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("support.manage");
  const parsed = parseForm(
    z.object({
      ticketId: z.coerce.number().int(),
      message: optionalText(5000),
      status: z.enum(Object.values(TICKET_STATUS) as [string, ...string[]]),
      priority: z.enum(Object.values(TICKET_PRIORITY) as [string, ...string[]]),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const t = await db.supportTicket.findUnique({ where: { id: d.ticketId } });
  if (!t) return fail("Ticket not found.");
  if (d.message) await db.supportMessage.create({ data: { ticketId: t.id, authorId: s.user.id, isStaff: true, body: d.message } });
  await db.supportTicket.update({ where: { id: t.id }, data: { status: d.status, priority: d.priority } });

  if (d.message) {
    if (t.userId) {
      await notify(t.userId, {
        type: NOTIFICATION_TYPE.SUPPORT,
        title: `Reply to your ticket ${t.ticketNumber}`,
        body: d.message.slice(0, 300),
        link: `/dashboard/support/${t.ticketNumber}`,
        email: true,
      });
    } else {
      await sendEmail(t.email, `Re: ${t.subject} (${t.ticketNumber})`, `Dear ${t.name},\n\n${d.message}`);
    }
  }
  await audit({ actor: s, action: "ticket.updated", entityType: "SupportTicket", entityId: t.id, details: { status: d.status, replied: !!d.message } });
  revalidatePath(`/admin/support/${t.id}`);
  return success(d.message ? "Reply sent." : "Ticket updated.");
}
