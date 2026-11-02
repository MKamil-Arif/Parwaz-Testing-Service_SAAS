import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export function smtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Sends a plain-text email. Every message is recorded in EmailOutbox; without SMTP settings
 * it is only logged there (status LOGGED) so local development works without a mail server.
 * Never throws.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const fullBody = `${body}\n\n— Rewarding Potential\nTest Your Knowledge, Earn Your Future.`;
  try {
    const row = await db.emailOutbox.create({
      data: { toEmail: to, subject, body: fullBody, status: smtpConfigured() ? "QUEUED" : "LOGGED" },
    });
    if (!smtpConfigured()) {
      if (process.env.NODE_ENV !== "production") console.info(`[email:logged] to=${to} subject="${subject}"`);
      return;
    }
    try {
      await getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, text: fullBody });
      await db.emailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
    } catch (err) {
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: "FAILED", error: String(err).slice(0, 1000) },
      });
    }
  } catch (err) {
    console.error("[email] could not record email", err);
  }
}

/** SMS is configurable but no provider adapter ships enabled; messages are skipped unless configured. */
export async function sendSms(phone: string, message: string): Promise<void> {
  if (!process.env.SMS_PROVIDER || !process.env.SMS_API_KEY) return;
  console.info(`[sms] provider ${process.env.SMS_PROVIDER} adapter not implemented; skipped message to ${phone.slice(0, 4)}***: ${message.slice(0, 40)}`);
}
