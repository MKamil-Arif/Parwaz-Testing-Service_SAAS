"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";
import { paymentMode } from "@/lib/payments/gateway";
import { processGatewayCallback, signCallback } from "@/lib/payments/callbacks";
import { randomCode } from "@/lib/tokens";

type Outcome = "SUCCEEDED" | "FAILED" | "CANCELLED";

/**
 * Simulates the sandbox gateway's server sending its signed callback. The payment is only updated
 * by processGatewayCallback after the HMAC signature, amount and freshness checks pass — exactly
 * the path a real gateway webhook takes. Clicking a button never marks a payment paid directly.
 */
export async function completeSandboxCheckout(reference: string, outcome: Outcome): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (paymentMode() !== "sandbox" || !["SUCCEEDED", "FAILED", "CANCELLED"].includes(outcome)) redirect("/dashboard/payments");

  const payment = await db.payment.findUnique({ where: { reference }, include: { registration: true } });
  if (!payment || payment.registration.userId !== session.user.id || payment.method !== PAYMENT_METHOD.SANDBOX) {
    redirect("/dashboard/payments");
  }
  if (payment.status !== PAYMENT_STATUS.INITIATED) redirect(`/dashboard/registrations/${payment.registrationId}/pay`);

  const secret = process.env.SANDBOX_WEBHOOK_SECRET;
  if (!secret) throw new Error("SANDBOX_WEBHOOK_SECRET is not configured");

  const body = JSON.stringify({
    reference,
    status: outcome,
    amount: payment.amount.toString(),
    gatewayTransactionId: `SBX-${randomCode(12)}`,
    reason: outcome === "FAILED" ? "Declined by sandbox (simulated insufficient balance)" : outcome === "CANCELLED" ? "Cancelled at checkout" : undefined,
    timestamp: Date.now(),
  });
  await processGatewayCallback("sandbox", body, signCallback(secret, body));
  redirect(`/dashboard/registrations/${payment.registrationId}/pay?result=${outcome.toLowerCase()}`);
}
