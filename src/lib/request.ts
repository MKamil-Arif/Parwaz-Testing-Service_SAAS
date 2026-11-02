import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return (h.get("x-real-ip") ?? "local").slice(0, 64);
}

export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 400);
}

/**
 * CSRF defence for JSON route handlers (server actions already verify Origin themselves):
 * state-changing requests must come from this site's own origin.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function appUrl(path = ""): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
  const base = (process.env.APP_URL || vercelUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
