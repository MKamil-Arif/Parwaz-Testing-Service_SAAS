import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rp_session";
const ATTRIBUTION_DAYS = 30;

/**
 * Runs before routes:
 *  1. Optimistic redirect to /login for private areas when no session cookie exists
 *     (real authorisation is always re-checked on the server for every page and action).
 *  2. Marketing attribution: ?ref=CODE (referrals) and ?utm_campaign=slug or /l/slug landing
 *     pages are remembered in cookies and applied when the visitor creates an account.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isPrivate = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/exam");

  if (isPrivate && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: ATTRIBUTION_DAYS * 86400 };

  const ref = searchParams.get("ref");
  if (ref && /^[A-Z0-9]{4,16}$/i.test(ref)) response.cookies.set("rp_ref", ref.toUpperCase(), cookieOpts);

  const campaign = searchParams.get("utm_campaign") ?? (pathname.startsWith("/l/") ? pathname.split("/")[2] : null);
  if (campaign && /^[a-z0-9-]{2,80}$/i.test(campaign)) response.cookies.set("rp_campaign", campaign.toLowerCase(), cookieOpts);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|media).*)"],
};
