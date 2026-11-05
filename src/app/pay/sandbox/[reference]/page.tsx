import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { FlaskConical, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";
import { paymentMode } from "@/lib/payments/gateway";
import { formatPKR } from "@/lib/format";
import { completeSandboxCheckout } from "@/actions/sandbox";

export const metadata: Metadata = { title: "Sandbox checkout" };

/** Simulated hosted checkout page of a payment gateway (development / demo only). */
export default async function SandboxCheckoutPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const { user } = await requireUser();
  if (paymentMode() !== "sandbox") notFound();
  const payment = await db.payment.findUnique({ where: { reference }, include: { registration: { include: { competition: true } } } });
  if (!payment || payment.registration.userId !== user.id || payment.method !== PAYMENT_METHOD.SANDBOX) notFound();
  if (payment.status !== PAYMENT_STATUS.INITIATED) redirect(`/dashboard/registrations/${payment.registrationId}/pay`);

  return (
    <main className="min-h-dvh bg-[repeating-linear-gradient(45deg,#f6f1e1,#f6f1e1_14px,#f1e9cf_14px,#f1e9cf_28px)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-center text-sm font-bold text-white">
          <FlaskConical className="size-4" /> SANDBOX GATEWAY — TEST MODE — NO REAL MONEY
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5">
          <div className="border-b border-navy-100 bg-navy-50 px-6 py-4">
            <p className="text-xs font-semibold text-navy-500">Merchant</p>
            <p className="font-bold text-navy-950">Parwaz Testing Service</p>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Order reference</span>
              <span className="font-mono font-semibold">{payment.reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Description</span>
              <span className="max-w-[60%] text-right font-semibold">{payment.registration.competition.title} — registration</span>
            </div>
            <div className="flex items-end justify-between border-t border-navy-100 pt-4">
              <span className="text-navy-500">Amount</span>
              <span className="font-display text-3xl font-extrabold">{formatPKR(payment.amount)}</span>
            </div>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This simulates the gateway's hosted page. Choosing an outcome makes the sandbox gateway send a signed callback to the platform,
              which verifies the signature before updating the payment — the same path a real gateway uses.
            </p>
            <div className="grid gap-2">
              <form action={completeSandboxCheckout.bind(null, payment.reference, "SUCCEEDED")}>
                <button type="submit" className="h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700">
                  Approve test payment
                </button>
              </form>
              <div className="grid grid-cols-2 gap-2">
                <form action={completeSandboxCheckout.bind(null, payment.reference, "FAILED")}>
                  <button type="submit" className="h-11 w-full rounded-xl bg-red-50 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                    Simulate decline
                  </button>
                </form>
                <form action={completeSandboxCheckout.bind(null, payment.reference, "CANCELLED")}>
                  <button type="submit" className="h-11 w-full rounded-xl bg-navy-50 font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-100">
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
          <p className="flex items-center justify-center gap-1.5 border-t border-navy-100 py-3 text-xs text-navy-500">
            <Lock className="size-3" /> Sandbox environment
          </p>
        </div>
      </div>
    </main>
  );
}
