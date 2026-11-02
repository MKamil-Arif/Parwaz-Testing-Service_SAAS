import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { USER_STATUS } from "@/lib/constants";
import { randomToken, sha256 } from "@/lib/tokens";
import { getClientIp, getUserAgent } from "@/lib/request";

export const SESSION_COOKIE = "rp_session";
const SESSION_DAYS = 7;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  emailVerified: boolean;
  mustChangePassword: boolean;
  isDemo: boolean;
};

export type CurrentSession = { sessionId: number; user: SessionUser };

/** Creates a DB-backed session and sets an httpOnly cookie holding the random token (only its hash is stored). */
export async function createSession(userId: number): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ipAddress: await getClientIp(),
      userAgent: await getUserAgent(),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the current session once per request. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== USER_STATUS.ACTIVE) return null;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }

  const u = session.user;
  return {
    sessionId: session.id,
    user: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      roles: u.roles.map((r) => r.role.name),
      emailVerified: !!u.emailVerifiedAt,
      mustChangePassword: u.mustChangePassword,
      isDemo: u.isDemo,
    },
  };
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere (optionally keeping the current session). */
export async function revokeUserSessions(userId: number, exceptSessionId?: number): Promise<void> {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}
