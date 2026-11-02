import { NextResponse } from "next/server";
import { processGatewayCallback, SIGNATURE_HEADER } from "@/lib/payments/callbacks";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Server-to-server payment gateway callbacks. Authenticity is established by the HMAC signature
 * (not by cookies/origin), so this endpoint is intentionally exempt from the same-origin check.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`webhook:${provider}:${ip}`, 120, 60).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > 16_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const outcome = await processGatewayCallback(provider, raw, request.headers.get(SIGNATURE_HEADER));
  return NextResponse.json({ message: outcome.message }, { status: outcome.status });
}
