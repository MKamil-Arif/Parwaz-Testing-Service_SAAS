import { z } from "zod";
import { db } from "@/lib/db";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";
import { hmacSha256, safeEqual } from "@/lib/tokens";
import { num } from "@/lib/format";
import { paymentMode } from "./gateway";
import { markPaymentFailed, markPaymentSucceeded } from "./service";

export const SIGNATURE_HEADER = "x-rp-signature";
const MAX_AGE_MS = 10 * 60 * 1000;

const callbackSchema = z.object({
  reference: z.string().min(5).max(40),
  status: z.enum(["SUCCEEDED", "FAILED", "CANCELLED"]),
  amount: z.string(),
  gatewayTransactionId: z.string().min(3).max(100),
  reason: z.string().max(300).optional(),
  timestamp: z.number().int(),
});
export type GatewayCallback = z.infer<typeof callbackSchema>;

const PROVIDERS: Record<string, { method: string; secret: () => string | undefined }> = {
  sandbox: { method: PAYMENT_METHOD.SANDBOX, secret: () => process.env.SANDBOX_WEBHOOK_SECRET },
  // Real gateways plug in here with their own verification scheme once merchant accounts exist.
};

export function signCallback(secret: string, rawBody: string): string {
  return hmacSha256(secret, rawBody);
}

export type CallbackOutcome = { status: number; message: string };

/**
 * The only path that can mark an online payment as successful: the payload must carry a valid
 * HMAC signature, be fresh, match the payment's amount and method, and is processed idempotently.
 * Every callback (valid or not) is stored in PaymentEvent.
 */
export async function processGatewayCallback(provider: string, rawBody: string, signature: string | null): Promise<CallbackOutcome> {
  const config = PROVIDERS[provider];
  if (!config) return { status: 404, message: "Unknown payment provider" };

  const secret = config.secret();
  const signatureValid = !!secret && !!signature && safeEqual(signCallback(secret, rawBody), signature);

  let parsed: GatewayCallback | null = null;
  try {
    const result = callbackSchema.safeParse(JSON.parse(rawBody));
    if (result.success) parsed = result.data;
  } catch {
    parsed = null;
  }

  const payment = parsed ? await db.payment.findUnique({ where: { reference: parsed.reference } }) : null;

  const record = (outcome: string) =>
    db.paymentEvent.create({
      data: {
        paymentId: payment?.id ?? null,
        provider,
        eventType: parsed?.status ?? "UNPARSEABLE",
        payload: rawBody.slice(0, 8000),
        signatureValid,
        outcome,
      },
    });

  if (!signatureValid) {
    await record("Rejected: invalid signature");
    return { status: 401, message: "Invalid signature" };
  }
  if (!parsed) {
    await record("Rejected: malformed payload");
    return { status: 400, message: "Malformed payload" };
  }
  if (!payment) {
    await record("Rejected: unknown payment reference");
    return { status: 404, message: "Unknown payment" };
  }
  if (provider === "sandbox" && (paymentMode() !== "sandbox" || !payment.isSandbox)) {
    await record("Rejected: sandbox callbacks are disabled for this payment");
    return { status: 403, message: "Sandbox disabled" };
  }
  if (payment.method !== config.method) {
    await record("Rejected: payment method mismatch");
    return { status: 400, message: "Method mismatch" };
  }
  if (Math.abs(Date.now() - parsed.timestamp) > MAX_AGE_MS) {
    await record("Rejected: stale callback (possible replay)");
    return { status: 400, message: "Stale callback" };
  }
  if (num(parsed.amount) !== num(payment.amount)) {
    await record(`Rejected: amount ${parsed.amount} does not match ${payment.amount.toString()}`);
    return { status: 400, message: "Amount mismatch" };
  }

  if (parsed.status === "SUCCEEDED") {
    const changed = await markPaymentSucceeded(payment.id, { gatewayTransactionId: parsed.gatewayTransactionId });
    await record(changed ? "Payment marked as succeeded" : `Ignored: payment already ${payment.status}`);
  } else {
    const changed = await markPaymentFailed(
      payment.id,
      parsed.reason ?? (parsed.status === "CANCELLED" ? "Cancelled at checkout" : "Declined by gateway"),
      parsed.status === "CANCELLED" ? PAYMENT_STATUS.CANCELLED : PAYMENT_STATUS.FAILED,
    );
    await record(changed ? `Payment marked as ${parsed.status.toLowerCase()}` : `Ignored: payment already ${payment.status}`);
  }
  return { status: 200, message: "OK" };
}
