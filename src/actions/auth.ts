"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { changePasswordSchema, emailField, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession, revokeUserSessions } from "@/lib/auth/session";
import { consumeAuthToken, exposeDevLinks, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/auth-tokens";
import { isStaff } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { referralCode } from "@/lib/tokens";
import { REFERRAL_STATUS, ROLES, TOKEN_TYPE, USER_STATUS } from "@/lib/constants";
import { ageOn } from "@/lib/format";
import { audit } from "@/lib/audit";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = referralCode();
    if (!(await db.user.findUnique({ where: { referralCode: code }, select: { id: true } }))) return code;
  }
  throw new Error("Could not allocate a referral code");
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit(`register:${ip}`, 8, 3600).allowed) return fail("Too many sign-ups from your connection. Please try again later.");

  const parsed = parseForm(registerSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;

  if (await db.user.findUnique({ where: { email: d.email }, select: { id: true } })) {
    return fail("An account with this email already exists.", { email: ["This email is already registered. Try logging in instead."] });
  }

  const jar = await cookies();
  const refCode = (d.referralCode ?? jar.get("rp_ref")?.value ?? "").toUpperCase();
  const referrer = refCode ? await db.user.findUnique({ where: { referralCode: refCode }, select: { id: true } }) : null;
  const campaignSlug = jar.get("rp_campaign")?.value;
  const campaign = campaignSlug ? await db.marketingCampaign.findUnique({ where: { slug: campaignSlug }, select: { id: true } }) : null;

  const studentRole = await db.role.findUnique({ where: { name: ROLES.STUDENT } });
  if (!studentRole) return fail("The system is not initialised yet (missing roles). Please contact support.");

  const minor = ageOn(d.dateOfBirth) < 18;
  const now = new Date();
  const user = await db.user.create({
    data: {
      email: d.email,
      fullName: d.fullName,
      phone: d.phone,
      passwordHash: await hashPassword(d.password),
      referralCode: await uniqueReferralCode(),
      signupCampaignId: campaign?.id ?? null,
      roles: { create: { roleId: studentRole.id } },
      profile: {
        create: {
          city: d.city,
          district: d.district,
          institution: d.institution,
          classLevel: d.classLevel,
          dateOfBirth: d.dateOfBirth,
          guardianName: minor ? (d.guardianName ?? null) : null,
          guardianPhone: minor ? (d.guardianPhone?.replace(/[\s-]/g, "") ?? null) : null,
          guardianRelation: minor ? (d.guardianRelation ?? null) : null,
          guardianConsentAt: minor && d.guardianConsent ? now : null,
          termsAcceptedAt: now,
        },
      },
      ...(referrer ? { referredBy: { create: { referrerId: referrer.id, status: REFERRAL_STATUS.SIGNED_UP } } } : {}),
    },
  });

  await sendVerificationEmail(user);
  await createSession(user.id);
  jar.delete("rp_ref");
  jar.delete("rp_campaign");
  redirect(safeNext(fd.get("next") as string) ?? "/dashboard?welcome=1");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { email, password, next } = parsed.data;

  const ip = await getClientIp();
  if (!rateLimit(`login-ip:${ip}`, 20, 900).allowed || !rateLimit(`login-email:${email}`, 10, 900).allowed) {
    return fail("Too many login attempts. Please wait a few minutes and try again.");
  }

  const user = await db.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH); // keep response time similar
    return fail("Incorrect email or password.");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return fail(`This account is temporarily locked after several failed attempts. Try again after ${LOCK_MINUTES} minutes or reset your password.`);
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return fail("Incorrect email or password.");
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    return fail("This account has been suspended. Please contact support.");
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);

  const roles = user.roles.map((r) => r.role.name);
  if (isStaff(roles)) {
    await audit({ actor: { sessionId: 0, user: { id: user.id, email: user.email, fullName: user.fullName, roles, emailVerified: true, mustChangePassword: user.mustChangePassword, isDemo: user.isDemo } }, action: "auth.staff_login", entityType: "User", entityId: user.id });
  }
  const target = safeNext(next);
  redirect(target ?? (isStaff(roles) ? "/admin" : "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!rateLimit(`forgot:${ip}`, 5, 900).allowed) return fail("Too many requests. Please try again later.");
  const parsed = parseForm(z.object({ email: emailField }), fd);
  if (!parsed.ok) return parsed.state;

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  let link: string | null = null;
  if (user && user.status === USER_STATUS.ACTIVE) link = await sendPasswordResetEmail(user);
  return success(
    "If an account exists for that email, we've sent a password reset link. It is valid for 1 hour.",
    exposeDevLinks() && link ? { devLink: link } : undefined,
  );
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(resetPasswordSchema, fd);
  if (!parsed.ok) return parsed.state;
  const userId = await consumeAuthToken(parsed.data.token, TOKEN_TYPE.PASSWORD_RESET);
  if (!userId) return fail("This reset link is invalid or has expired. Please request a new one.");

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password), failedLoginCount: 0, lockedUntil: null, mustChangePassword: false },
  });
  await revokeUserSessions(userId);
  redirect("/login?reset=1");
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, TOKEN_TYPE.EMAIL_VERIFICATION);
  if (!userId) return false;
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}

export async function resendVerificationAction(_: ActionState): Promise<ActionState> {
  const session = await getSession();
  if (!session) return fail("Please log in again.");
  if (session.user.emailVerified) return success("Your email is already verified.");
  if (!rateLimit(`verify-resend:${session.user.id}`, 3, 900).allowed) return fail("Please wait a few minutes before requesting another email.");
  const link = await sendVerificationEmail(session.user);
  return success(`We've sent a new verification link to ${session.user.email}.`, exposeDevLinks() ? { devLink: link } : undefined);
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return fail("Please log in again.");
  const parsed = parseForm(changePasswordSchema, fd);
  if (!parsed.ok) return parsed.state;
  if (!rateLimit(`change-pw:${session.user.id}`, 5, 900).allowed) return fail("Too many attempts. Please wait and try again.");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return fail("Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return fail("Choose a password different from your current one.", { newPassword: ["Must differ from the current password"] });
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
  });
  await revokeUserSessions(user.id, session.sessionId);
  await audit({ actor: session, action: "auth.password_changed", entityType: "User", entityId: user.id });
  return success("Password changed. You have been signed out on all other devices.");
}
