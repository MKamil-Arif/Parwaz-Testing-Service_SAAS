import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/tokens";
import { TOKEN_TYPE } from "@/lib/constants";
import { appUrl } from "@/lib/request";
import { sendEmail, smtpConfigured } from "@/lib/email";

/** Issues a single-use token (only its hash is stored). Older unused tokens of the same type are invalidated. */
export async function createAuthToken(userId: number, type: string, ttlMinutes: number): Promise<string> {
  const raw = randomToken(32);
  await db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  await db.authToken.create({
    data: { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return raw;
}

/** Returns the userId if the token is valid, marking it used. */
export async function consumeAuthToken(raw: string, type: string): Promise<number | null> {
  const token = await db.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) return null;
  const claimed = await db.authToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? token.userId : null;
}

/** In local development without SMTP, links are shown on screen so flows can be tested. */
export function exposeDevLinks(): boolean {
  return process.env.NODE_ENV !== "production" && !smtpConfigured();
}

export async function sendVerificationEmail(user: { id: number; email: string; fullName: string }): Promise<string> {
  const token = await createAuthToken(user.id, TOKEN_TYPE.EMAIL_VERIFICATION, 48 * 60);
  const link = appUrl(`/verify-email?token=${token}`);
  await sendEmail(
    user.email,
    "Verify your email address",
    `Dear ${user.fullName},\n\nWelcome to Parwaz Testing Service! Please confirm your email address by opening this link (valid for 48 hours):\n\n${link}\n\nIf you did not create this account, you can ignore this email.`,
  );
  return link;
}

export async function sendPasswordResetEmail(user: { id: number; email: string; fullName: string }): Promise<string> {
  const token = await createAuthToken(user.id, TOKEN_TYPE.PASSWORD_RESET, 60);
  const link = appUrl(`/reset-password?token=${token}`);
  await sendEmail(
    user.email,
    "Reset your password",
    `Dear ${user.fullName},\n\nWe received a request to reset your Parwaz Testing Service password. Open this link within 1 hour to choose a new password:\n\n${link}\n\nIf you did not request this, you can ignore this email — your password will not change.`,
  );
  return link;
}
