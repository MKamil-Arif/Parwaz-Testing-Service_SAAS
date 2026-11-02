"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { optionalText } from "@/lib/validation";
import { EXPENSE_CATEGORY, PROJECTION_TYPE } from "@/lib/constants";

const optId = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional());

const expenseSchema = z.object({
  id: optId,
  category: z.enum(Object.values(EXPENSE_CATEGORY) as [string, ...string[]]),
  description: z.string().trim().min(3).max(300),
  amount: z.coerce.number().positive("Enter an amount").max(100_000_000),
  expenseDate: z.coerce.date(),
  vendor: optionalText(150),
  receiptReference: optionalText(100),
  campaignId: optId,
  competitionId: optId,
});

export async function saveExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("finance.manage");
  const parsed = parseForm(expenseSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...d } = parsed.data;
  const data = { ...d, vendor: d.vendor ?? null, receiptReference: d.receiptReference ?? null, campaignId: d.campaignId ?? null, competitionId: d.competitionId ?? null };
  if (id) {
    const existing = await db.businessExpense.findUnique({ where: { id } });
    if (existing?.prizeId) return fail("Prize purchases are edited from Prizes & distribution.");
    await db.businessExpense.update({ where: { id }, data });
  } else {
    await db.businessExpense.create({ data: { ...data, recordedById: s.user.id } });
  }
  await audit({ actor: s, action: id ? "expense.updated" : "expense.created", entityType: "BusinessExpense", entityId: id ?? null, details: { category: d.category, amount: d.amount } });
  revalidatePath("/admin/finance");
  return success("Expense recorded.");
}

export async function deleteExpenseAction(id: number): Promise<void> {
  const s = await staffOrThrow("finance.manage");
  const e = await db.businessExpense.findUnique({ where: { id } });
  if (!e) return;
  await db.businessExpense.delete({ where: { id } });
  await audit({ actor: s, action: "expense.deleted", entityType: "BusinessExpense", entityId: id, details: { description: e.description, amount: e.amount.toString() } });
  revalidatePath("/admin/finance");
}

const projectionSchema = z.object({
  id: optId,
  type: z.enum([PROJECTION_TYPE.REVENUE, PROJECTION_TYPE.EXPENSE]),
  category: z.string().trim().min(2).max(30),
  label: z.string().trim().min(2).max(150),
  amount: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().default(0),
  notes: optionalText(500),
  competitionId: optId,
});

export async function saveProjectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("finance.manage");
  const parsed = parseForm(projectionSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...d } = parsed.data;
  const data = { ...d, notes: d.notes ?? null, competitionId: d.competitionId ?? null };
  const row = id ? await db.financialProjection.update({ where: { id }, data }) : await db.financialProjection.create({ data });
  await audit({ actor: s, action: id ? "projection.updated" : "projection.created", entityType: "FinancialProjection", entityId: row.id, details: { label: d.label, amount: d.amount } });
  revalidatePath("/admin/finance");
  return success("Projection saved.");
}

export async function deleteProjectionAction(id: number): Promise<void> {
  const s = await staffOrThrow("finance.manage");
  await db.financialProjection.delete({ where: { id } });
  await audit({ actor: s, action: "projection.deleted", entityType: "FinancialProjection", entityId: id });
  revalidatePath("/admin/finance");
}
