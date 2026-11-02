"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { checkbox, optionalText } from "@/lib/validation";
import { CLASS_LEVEL_VALUES, COMPETITION_STATUS, PRIZE_CATEGORY, QUESTION_STATUS } from "@/lib/constants";
import { computeTotalMarks, publishBlockers } from "@/lib/competition-rules";
import { fromPKTInput } from "@/lib/format";

const dt = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time").transform(fromPKTInput);
const optInt = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(0).optional());
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional());

const competitionSchema = z.object({
  id: optInt,
  title: z.string().trim().min(5).max(200),
  slug: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(120).optional().or(z.literal("")),
  ),
  summary: z.string().trim().min(10).max(500),
  description: z.string().trim().min(20),
  subjects: z.string().trim().min(3).max(300),
  eligibilityText: z.string().trim().min(10),
  rules: z.string().trim().min(20),
  tieBreakPolicy: z.string().trim().min(20),
  eligibleClasses: z.array(z.enum(CLASS_LEVEL_VALUES)).min(1, "Select at least one class"),
  eligibleProvince: optionalText(50),
  minAge: optInt,
  maxAge: optInt,
  registrationFee: z.coerce.number().min(0).max(1_000_000),
  targetRegistrations: optInt,
  maxRegistrations: optInt,
  registrationOpensAt: dt,
  registrationClosesAt: dt,
  examStartsAt: dt,
  examEndsAt: dt,
  durationMinutes: z.coerce.number().int().min(5).max(600),
  questionCount: z.coerce.number().int().min(1).max(500),
  marksPerQuestion: optNum,
  negativeMarking: z.coerce.number().min(0).max(10),
  maxAttempts: z.coerce.number().int().min(1).max(5),
  randomizeQuestions: checkbox,
  randomizeOptions: checkbox,
  showInstantResults: checkbox,
  isDemo: checkbox,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function poolMarks(competitionId: number): Promise<number[]> {
  const pool = await db.question.findMany({
    where: { status: QUESTION_STATUS.ACTIVE, competitions: { some: { competitionId } } },
    select: { marks: true },
  });
  return pool.map((q) => q.marks);
}

export async function saveCompetitionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("competitions.manage");
  const parsed = parseForm(competitionSchema, fd, ["eligibleClasses"]);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const slug = d.slug || slugify(d.title);
  const clash = await db.competition.findFirst({ where: { slug, ...(d.id ? { id: { not: d.id } } : {}) } });
  if (clash) return fail("Another competition already uses this URL slug.", { slug: ["Already in use"] });
  if (d.minAge != null && d.maxAge != null && d.minAge > d.maxAge) return fail("Minimum age is above maximum age.", { minAge: ["Invalid range"] });

  const marks = d.id ? await poolMarks(d.id) : [];
  const data = {
    slug,
    title: d.title,
    summary: d.summary,
    description: d.description,
    subjects: d.subjects,
    eligibilityText: d.eligibilityText,
    rules: d.rules,
    tieBreakPolicy: d.tieBreakPolicy,
    eligibleProvince: d.eligibleProvince ?? null,
    minAge: d.minAge ?? null,
    maxAge: d.maxAge ?? null,
    registrationFee: d.registrationFee,
    targetRegistrations: d.targetRegistrations ?? null,
    maxRegistrations: d.maxRegistrations || null,
    registrationOpensAt: d.registrationOpensAt,
    registrationClosesAt: d.registrationClosesAt,
    examStartsAt: d.examStartsAt,
    examEndsAt: d.examEndsAt,
    durationMinutes: d.durationMinutes,
    questionCount: d.questionCount,
    marksPerQuestion: d.marksPerQuestion ?? null,
    totalMarks: computeTotalMarks(d.questionCount, d.marksPerQuestion ?? null, marks),
    negativeMarking: d.negativeMarking,
    maxAttempts: d.maxAttempts,
    randomizeQuestions: d.randomizeQuestions,
    randomizeOptions: d.randomizeOptions,
    showInstantResults: d.showInstantResults,
    isDemo: d.isDemo,
  };

  if (d.id) {
    const existing = await db.competition.findUniqueOrThrow({ where: { id: d.id } });
    const attempts = await db.examAttempt.count({ where: { registration: { competitionId: d.id } } });
    if (attempts && (existing.questionCount !== d.questionCount || existing.negativeMarking !== d.negativeMarking || existing.marksPerQuestion !== (d.marksPerQuestion ?? null))) {
      return fail("Question count and marking cannot change after students have started the examination.");
    }
    await db.$transaction([
      db.competitionEligibleClass.deleteMany({ where: { competitionId: d.id } }),
      db.competition.update({ where: { id: d.id }, data: { ...data, eligibleClasses: { create: d.eligibleClasses.map((classLevel) => ({ classLevel })) } } }),
    ]);
    await audit({ actor: s, action: "competition.updated", entityType: "Competition", entityId: d.id, details: { title: d.title } });
    revalidatePath(`/admin/competitions/${d.id}`);
    return success("Competition saved.");
  }
  const created = await db.competition.create({
    data: { ...data, status: COMPETITION_STATUS.DRAFT, eligibleClasses: { create: d.eligibleClasses.map((classLevel) => ({ classLevel })) } },
  });
  await audit({ actor: s, action: "competition.created", entityType: "Competition", entityId: created.id, details: { title: d.title } });
  redirect(`/admin/competitions/${created.id}?tab=questions&created=1`);
}

export async function setCompetitionStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("competitions.manage");
  const id = Number(fd.get("id"));
  const status = String(fd.get("status"));
  if (!Object.values(COMPETITION_STATUS).includes(status as never)) return fail("Invalid status.");
  const c = await db.competition.findUnique({ where: { id }, include: { prizes: true, _count: { select: { registrations: true } } } });
  if (!c) return fail("Competition not found.");

  if (status === COMPETITION_STATUS.PUBLISHED) {
    const marks = await poolMarks(id);
    const blockers = publishBlockers({
      questionCount: c.questionCount,
      marksPerQuestion: c.marksPerQuestion,
      poolMarks: marks,
      times: c,
      durationMinutes: c.durationMinutes,
      prizeRanges: c.prizes,
    });
    if (blockers.length) return fail(`Cannot publish yet:\n• ${blockers.join("\n• ")}`);
    await db.competition.update({ where: { id }, data: { status, totalMarks: computeTotalMarks(c.questionCount, c.marksPerQuestion, marks) } });
  } else if (status === COMPETITION_STATUS.DRAFT && c._count.registrations > 0) {
    return fail("This competition already has registrations. Archive it instead of unpublishing.");
  } else {
    await db.competition.update({ where: { id }, data: { status } });
  }
  await audit({ actor: s, action: `competition.status.${status.toLowerCase()}`, entityType: "Competition", entityId: id });
  revalidatePath(`/admin/competitions/${id}`);
  return success(`Competition is now ${status.toLowerCase()}.`);
}

export async function deleteCompetitionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("competitions.manage");
  const id = Number(fd.get("id"));
  const c = await db.competition.findUnique({ where: { id }, include: { _count: { select: { registrations: true, ceremonies: true, expenses: true, projections: true, announcements: true, landingPages: true, supportTickets: true } } } });
  if (!c) return fail("Competition not found.");
  const linked = Object.values(c._count).reduce((a, b) => a + b, 0);
  if (linked > 0) return fail("This competition has registrations or linked records and cannot be deleted. Archive it instead.");
  await db.competition.delete({ where: { id } });
  await audit({ actor: s, action: "competition.deleted", entityType: "Competition", entityId: id, details: { title: c.title } });
  redirect("/admin/competitions");
}

// ─── Question pool ───

async function assertPoolEditable(competitionId: number): Promise<string | null> {
  const attempts = await db.examAttempt.count({ where: { registration: { competitionId } } });
  return attempts ? "The question pool is locked because students have already started this examination." : null;
}

async function refreshTotalMarks(competitionId: number) {
  const c = await db.competition.findUniqueOrThrow({ where: { id: competitionId } });
  await db.competition.update({ where: { id: competitionId }, data: { totalMarks: computeTotalMarks(c.questionCount, c.marksPerQuestion, await poolMarks(competitionId)) } });
}

export async function addPoolQuestionsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("competitions.manage");
  const parsed = parseForm(
    z.object({
      competitionId: z.coerce.number().int(),
      categoryId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
      questionIds: z.string().optional(),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const { competitionId, categoryId, questionIds } = parsed.data;
  const locked = await assertPoolEditable(competitionId);
  if (locked) return fail(locked);

  const ids = (questionIds ?? "")
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!categoryId && ids.length === 0) return fail("Choose a category or enter question IDs.");
  const questions = await db.question.findMany({
    where: {
      status: QUESTION_STATUS.ACTIVE,
      OR: [...(categoryId ? [{ categoryId }] : []), ...(ids.length ? [{ id: { in: ids } }] : [])],
      competitions: { none: { competitionId } },
    },
    select: { id: true },
  });
  if (questions.length) {
    await db.competitionQuestion.createMany({ data: questions.map((q) => ({ competitionId, questionId: q.id })) });
    await refreshTotalMarks(competitionId);
  }
  await audit({ actor: s, action: "competition.pool.added", entityType: "Competition", entityId: competitionId, details: { added: questions.length } });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return success(`${questions.length} question(s) added to the pool.`);
}

export async function removePoolQuestionAction(competitionId: number, questionId: number): Promise<void> {
  const s = await staffOrThrow("competitions.manage");
  if (await assertPoolEditable(competitionId)) return;
  await db.competitionQuestion.deleteMany({ where: { competitionId, questionId } });
  await refreshTotalMarks(competitionId);
  await audit({ actor: s, action: "competition.pool.removed", entityType: "Competition", entityId: competitionId, details: { questionId } });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ─── Prize tiers ───

const prizeSchema = z.object({
  id: optInt,
  competitionId: z.coerce.number().int(),
  title: z.string().trim().min(2).max(150),
  category: z.enum(Object.values(PRIZE_CATEGORY) as [string, ...string[]]),
  description: optionalText(1000),
  rankFrom: z.coerce.number().int().min(1),
  rankTo: z.coerce.number().int().min(1),
  quantity: z.coerce.number().int().min(1).max(1000),
  estimatedUnitValue: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().default(0),
});

export async function savePrizeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("competitions.manage");
  const parsed = parseForm(prizeSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  if (d.rankTo < d.rankFrom) return fail("'Rank to' must be at least 'rank from'.", { rankTo: ["Invalid range"] });
  if (d.rankTo - d.rankFrom + 1 !== d.quantity) return fail(`Ranks ${d.rankFrom}–${d.rankTo} cover ${d.rankTo - d.rankFrom + 1} students but quantity is ${d.quantity}.`, { quantity: ["Must match the rank range"] });
  const others = await db.prize.findMany({ where: { competitionId: d.competitionId, ...(d.id ? { id: { not: d.id } } : {}) } });
  if (others.some((p) => d.rankFrom <= p.rankTo && d.rankTo >= p.rankFrom)) return fail("This rank range overlaps another prize tier.");
  if (d.id && (await db.prizeAllocation.count({ where: { prizeId: d.id } }))) return fail("Prizes have already been allocated from this tier; it can no longer be edited.");

  const { id, ...data } = d;
  const saved = id ? await db.prize.update({ where: { id }, data: { ...data, description: data.description ?? null } }) : await db.prize.create({ data: { ...data, description: data.description ?? null } });
  await audit({ actor: s, action: id ? "prize.updated" : "prize.created", entityType: "Prize", entityId: saved.id, details: { title: d.title, ranks: `${d.rankFrom}-${d.rankTo}` } });
  revalidatePath(`/admin/competitions/${d.competitionId}`);
  return success("Prize tier saved.");
}

export async function deletePrizeAction(prizeId: number): Promise<void> {
  const s = await staffOrThrow("competitions.manage");
  const prize = await db.prize.findUnique({ where: { id: prizeId }, include: { _count: { select: { allocations: true, purchases: true } } } });
  if (!prize || prize._count.allocations || prize._count.purchases) return;
  await db.prize.delete({ where: { id: prizeId } });
  await audit({ actor: s, action: "prize.deleted", entityType: "Prize", entityId: prizeId, details: { title: prize.title } });
  revalidatePath(`/admin/competitions/${prize.competitionId}`);
}
