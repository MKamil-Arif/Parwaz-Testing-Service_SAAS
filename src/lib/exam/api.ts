import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, type CurrentSession } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/request";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Shared guard for exam endpoints: same-origin, signed in, and the attempt belongs to the caller. */
export async function loadOwnAttempt(request: Request, publicId: string) {
  if (!isSameOrigin(request)) return { error: json({ error: "Forbidden" }, 403) } as const;
  const session = await getSession();
  if (!session) return { error: json({ error: "Not signed in" }, 401) } as const;
  if (!/^[a-f0-9]{32}$/.test(publicId)) return { error: json({ error: "Not found" }, 404) } as const;
  const attempt = await db.examAttempt.findUnique({
    where: { publicId },
    include: { registration: { select: { userId: true, registrationNumber: true } } },
  });
  if (!attempt || attempt.registration.userId !== session.user.id) return { error: json({ error: "Not found" }, 404) } as const;
  return { attempt, session: session as CurrentSession } as const;
}
