import { db } from "@/lib/db";
import { NOTIFICATION_TYPE, PAYMENT_STATUS, REFUND_STATUS, REGISTRATION_STATUS } from "@/lib/constants";
import { onRegistrationConfirmed } from "@/lib/registrations";
import { notify } from "@/lib/notifications";
import { formatPKR } from "@/lib/format";

const OPEN = [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PENDING_VERIFICATION];

/**
 * Marks a payment as paid and confirms its registration. Only called from
 *  (a) a gateway callback whose signature has been verified, or
 *  (b) an authorised staff member verifying a manual transfer.
 * Idempotent: returns false if the payment was not in an open state.
 */
export async function markPaymentSucceeded(
  paymentId: number,
  opts: { gatewayTransactionId?: string; verifiedById?: number } = {},
): Promise<boolean> {
  const now = new Date();
  const outcome = await db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: OPEN } },
      data: {
        status: PAYMENT_STATUS.SUCCEEDED,
        paidAt: now,
        verifiedAt: now,
        verifiedById: opts.verifiedById ?? null,
        ...(opts.gatewayTransactionId ? { gatewayTransactionId: opts.gatewayTransactionId } : {}),
      },
    });
    if (claimed.count === 0) return null;

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { registration: true } });
    if (payment.registration.status === REGISTRATION_STATUS.PENDING_PAYMENT) {
      await tx.competitionRegistration.update({
        where: { id: payment.registrationId },
        data: { status: REGISTRATION_STATUS.CONFIRMED, confirmedAt: now },
      });
      return { registrationId: payment.registrationId, confirmed: true, userId: payment.registration.userId };
    }
    if (payment.registration.status !== REGISTRATION_STATUS.CONFIRMED) {
      // Money arrived for a cancelled registration: flag for refund instead of silently keeping it.
      await tx.payment.update({
        where: { id: paymentId },
        data: { refundStatus: REFUND_STATUS.REQUESTED, refundReason: "Payment received after the registration was cancelled." },
      });
    }
    return { registrationId: payment.registrationId, confirmed: false, userId: payment.registration.userId };
  });

  if (!outcome) return false;
  if (outcome.confirmed) await onRegistrationConfirmed(outcome.registrationId);
  return true;
}

export async function markPaymentFailed(
  paymentId: number,
  reason: string,
  status: string = PAYMENT_STATUS.FAILED,
): Promise<boolean> {
  const claimed = await db.payment.updateMany({
    where: { id: paymentId, status: { in: OPEN } },
    data: { status, failureReason: reason.slice(0, 500) },
  });
  if (claimed.count === 0) return false;
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { registration: { include: { competition: true } } } });
  if (payment) {
    await notify(payment.registration.userId, {
      type: NOTIFICATION_TYPE.PAYMENT,
      title: status === PAYMENT_STATUS.CANCELLED ? "Payment cancelled" : "Payment not completed",
      body: `Your payment ${payment.reference} of ${formatPKR(payment.amount)} for "${payment.registration.competition.title}" was not completed (${reason}). You can try again from My Registrations.`,
      link: "/dashboard/registrations",
    });
  }
  return true;
}

/** Abandons sandbox/online checkouts that were never completed. */
export async function expireStalePayments(maxAgeMinutes = 60): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const res = await db.payment.updateMany({
    where: { status: PAYMENT_STATUS.INITIATED, createdAt: { lt: cutoff } },
    data: { status: PAYMENT_STATUS.EXPIRED, failureReason: "Checkout was not completed in time." },
  });
  return res.count;
}
