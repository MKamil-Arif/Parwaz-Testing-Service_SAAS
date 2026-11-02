"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { optionalText } from "@/lib/validation";
import { ALLOCATION_STATUS, DISTRIBUTION_METHOD, DISTRIBUTION_STATUS, EXPENSE_CATEGORY, NOTIFICATION_TYPE } from "@/lib/constants";

export async function reviewAllocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("prizes.manage");
  const parsed = parseForm(
    z.object({
      allocationId: z.coerce.number().int(),
      decision: z.enum([ALLOCATION_STATUS.VERIFIED, ALLOCATION_STATUS.REJECTED, ALLOCATION_STATUS.FORFEITED]),
      notes: z.string().trim().min(5, "Record what was checked (ID, school confirmation, guardian…)").max(1000),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const a = await db.prizeAllocation.findUnique({ where: { id: d.allocationId }, include: { prize: { include: { competition: true } }, result: { include: { attempt: { include: { registration: true } } } } } });
  if (!a) return fail("Allocation not found.");
  await db.prizeAllocation.update({
    where: { id: a.id },
    data: { status: d.decision, verificationNotes: d.notes, verifiedById: s.user.id, verifiedAt: new Date(), publicApproved: d.decision === ALLOCATION_STATUS.VERIFIED ? a.publicApproved : false },
  });
  const userId = a.result.attempt.registration.userId;
  if (d.decision === ALLOCATION_STATUS.VERIFIED) {
    await notify(userId, {
      type: NOTIFICATION_TYPE.PRIZE,
      title: `Prize confirmed: ${a.prize.title}`,
      body: `Your eligibility for the ${a.prize.title} (position #${a.rank}, ${a.prize.competition.title}) has been verified. We will share award ceremony or delivery details soon.`,
      link: "/dashboard/results",
      email: true,
    });
  } else {
    await notify(userId, {
      type: NOTIFICATION_TYPE.PRIZE,
      title: "Prize eligibility update",
      body: `Your prize allocation for ${a.prize.competition.title} was ${d.decision.toLowerCase()}: ${d.notes}. Contact support if you believe this is an error.`,
      link: "/dashboard/support",
      email: true,
    });
  }
  await audit({ actor: s, action: `prize_allocation.${d.decision.toLowerCase()}`, entityType: "PrizeAllocation", entityId: a.id, details: { notes: d.notes, rank: a.rank } });
  revalidatePath("/admin/winners");
  return success(`Allocation marked ${d.decision.toLowerCase()}.`);
}

export async function togglePublicWinnerAction(allocationId: number): Promise<void> {
  const s = await staffOrThrow("prizes.manage");
  const a = await db.prizeAllocation.findUnique({ where: { id: allocationId } });
  if (!a || a.status !== ALLOCATION_STATUS.VERIFIED) return;
  await db.prizeAllocation.update({ where: { id: a.id }, data: { publicApproved: !a.publicApproved } });
  await audit({ actor: s, action: a.publicApproved ? "winner.hidden" : "winner.published", entityType: "PrizeAllocation", entityId: a.id });
  revalidatePath("/admin/winners");
}

/** Records how a verified prize reaches the student. */
export async function saveDistributionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("prizes.manage");
  const parsed = parseForm(
    z.object({
      allocationId: z.coerce.number().int(),
      status: z.enum(Object.values(DISTRIBUTION_STATUS) as [string, ...string[]]),
      method: z.enum(Object.values(DISTRIBUTION_METHOD) as [string, ...string[]]),
      ceremonyId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
      scheduledDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
      deliveredAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
      deliveryAddress: optionalText(500),
      trackingReference: optionalText(100),
      deviceSerialNumber: optionalText(100),
      receivedBy: optionalText(150),
      notes: optionalText(1000),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const a = await db.prizeAllocation.findUnique({ where: { id: d.allocationId } });
  if (!a || a.status !== ALLOCATION_STATUS.VERIFIED) return fail("Only verified allocations can be distributed.");
  if (d.status === DISTRIBUTION_STATUS.DELIVERED && (!d.deliveredAt || !d.receivedBy)) return fail("Record the delivery date and who received the prize.");
  const data = {
    status: d.status,
    method: d.method,
    ceremonyId: d.ceremonyId ?? null,
    scheduledDate: d.scheduledDate ?? null,
    deliveredAt: d.deliveredAt ?? null,
    deliveryAddress: d.deliveryAddress ?? null,
    trackingReference: d.trackingReference ?? null,
    deviceSerialNumber: d.deviceSerialNumber ?? null,
    receivedBy: d.receivedBy ?? null,
    notes: d.notes ?? null,
  };
  await db.prizeDistribution.upsert({ where: { allocationId: a.id }, create: { allocationId: a.id, ...data }, update: data });
  await audit({ actor: s, action: "prize_distribution.updated", entityType: "PrizeAllocation", entityId: a.id, details: { status: d.status, method: d.method } });
  revalidatePath("/admin/prizes");
  return success("Distribution record saved.");
}

/** A prize purchase is a business expense linked to its prize tier (counts towards inventory). */
export async function recordPrizePurchaseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("prizes.manage");
  const parsed = parseForm(
    z.object({
      prizeId: z.coerce.number().int(),
      quantity: z.coerce.number().int().min(1).max(1000),
      amount: z.coerce.number().min(0),
      expenseDate: z.coerce.date(),
      vendor: optionalText(150),
      receiptReference: optionalText(100),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const prize = await db.prize.findUnique({ where: { id: d.prizeId } });
  if (!prize) return fail("Prize not found.");
  const e = await db.businessExpense.create({
    data: {
      category: EXPENSE_CATEGORY.PRIZE_PURCHASE,
      description: `${d.quantity} × ${prize.title}`,
      amount: d.amount,
      expenseDate: d.expenseDate,
      vendor: d.vendor ?? null,
      receiptReference: d.receiptReference ?? null,
      quantity: d.quantity,
      prizeId: prize.id,
      competitionId: prize.competitionId,
      recordedById: s.user.id,
    },
  });
  await audit({ actor: s, action: "prize.purchase_recorded", entityType: "BusinessExpense", entityId: e.id, details: { prizeId: prize.id, quantity: d.quantity, amount: d.amount } });
  revalidatePath("/admin/prizes");
  return success("Purchase recorded (also added to business expenses).");
}
