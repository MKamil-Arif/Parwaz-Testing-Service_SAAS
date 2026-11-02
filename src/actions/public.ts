"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { contactSchema, emailField } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { randomToken, ticketNumber } from "@/lib/tokens";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";

export async function subscribeNewsletter(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit(`newsletter:${ip}`, 5, 600).allowed) return fail("Too many attempts. Please try again later.");
  const parsed = parseForm(z.object({ email: emailField, source: z.string().max(80).optional() }), fd);
  if (!parsed.ok) return fail("Enter a valid email address.");
  const { email, source } = parsed.data;

  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) {
    if (existing.status !== "SUBSCRIBED")
      await db.newsletterSubscriber.update({ where: { email }, data: { status: "SUBSCRIBED", consentAt: new Date() } });
  } else {
    await db.newsletterSubscriber.create({ data: { email, source: source ?? null, unsubscribeToken: randomToken(24) } });
  }
  return success("Thanks! You're subscribed to competition announcements.");
}

export async function submitContact(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit(`contact:${ip}`, 5, 900).allowed) return fail("Too many messages from your connection. Please try again in a few minutes.");
  const parsed = parseForm(contactSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  if (d.website) return success("Thank you — your message has been received."); // honeypot hit

  const session = await getSession();
  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber: ticketNumber(),
      userId: session?.user.id ?? null,
      name: d.name,
      email: d.email,
      phone: d.phone ?? null,
      subject: d.subject,
      category: d.category,
      messages: { create: { authorId: session?.user.id ?? null, isStaff: false, body: d.message } },
    },
  });
  await sendEmail(
    d.email,
    `We received your message (${ticket.ticketNumber})`,
    `Dear ${d.name},\n\nThank you for contacting Rewarding Potential. Your reference number is ${ticket.ticketNumber}. Our team will reply by email${d.phone ? " or phone" : ""} as soon as possible.\n\nSubject: ${d.subject}`,
  );
  return success(`Thank you — your message has been received. Your reference number is ${ticket.ticketNumber}.`);
}

export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const sub = await db.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
  if (!sub) return false;
  await db.newsletterSubscriber.update({ where: { id: sub.id }, data: { status: "UNSUBSCRIBED" } });
  return true;
}
