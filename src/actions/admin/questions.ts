"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { optionalText } from "@/lib/validation";
import { DIFFICULTY, QUESTION_STATUS, QUESTION_TYPE } from "@/lib/constants";
import { parseCsv } from "@/lib/csv";

const questionSchema = z
  .object({
    id: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
    categoryId: z.coerce.number().int({ error: "Select a category" }),
    type: z.enum([QUESTION_TYPE.MCQ, QUESTION_TYPE.SHORT_ANSWER]),
    text: z.string().trim().min(5, "Enter the question").max(4000),
    explanation: optionalText(4000),
    difficulty: z.enum([DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]),
    marks: z.coerce.number().min(0.25).max(100),
    optionA: z.string().trim().max(1000).optional(),
    optionB: z.string().trim().max(1000).optional(),
    optionC: z.string().trim().max(1000).optional(),
    optionD: z.string().trim().max(1000).optional(),
    correct: z.enum(["A", "B", "C", "D"]).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type !== QUESTION_TYPE.MCQ) return;
    for (const k of ["optionA", "optionB", "optionC", "optionD"] as const)
      if (!d[k]) ctx.addIssue({ code: "custom", path: [k], message: "All four options are required" });
    if (!d.correct) ctx.addIssue({ code: "custom", path: ["correct"], message: "Select the correct answer" });
    const opts = [d.optionA, d.optionB, d.optionC, d.optionD].map((o) => o?.toLowerCase());
    if (new Set(opts).size < 4) ctx.addIssue({ code: "custom", path: ["optionD"], message: "Options must be different from each other" });
  });

export async function saveQuestionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("questions.manage");
  const parsed = parseForm(questionSchema, fd);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const options =
    d.type === QUESTION_TYPE.MCQ
      ? (["A", "B", "C", "D"] as const).map((L, i) => ({ text: d[`option${L}`]!, isCorrect: d.correct === L, sortOrder: i }))
      : [];

  if (d.id) {
    const used = await db.studentAnswer.count({ where: { questionId: d.id } });
    if (used) {
      return fail("This question has already been answered in an examination, so it cannot be edited (results depend on it). Archive it and create a new version instead.");
    }
    await db.$transaction([
      db.answerOption.deleteMany({ where: { questionId: d.id } }),
      db.question.update({
        where: { id: d.id },
        data: { categoryId: d.categoryId, type: d.type, text: d.text, explanation: d.explanation ?? null, difficulty: d.difficulty, marks: d.marks, options: { create: options } },
      }),
    ]);
    await audit({ actor: s, action: "question.updated", entityType: "Question", entityId: d.id });
    revalidatePath("/admin/questions");
    return success("Question saved.");
  }
  const q = await db.question.create({
    data: { categoryId: d.categoryId, type: d.type, text: d.text, explanation: d.explanation ?? null, difficulty: d.difficulty, marks: d.marks, options: { create: options } },
  });
  await audit({ actor: s, action: "question.created", entityType: "Question", entityId: q.id });
  if (fd.get("addAnother")) return success(`Question #${q.id} added. Add the next one.`);
  redirect(`/admin/questions?saved=${q.id}`);
}

export async function setQuestionStatusAction(id: number, status: string): Promise<void> {
  const s = await staffOrThrow("questions.manage");
  if (status !== QUESTION_STATUS.ACTIVE && status !== QUESTION_STATUS.ARCHIVED) return;
  await db.question.update({ where: { id }, data: { status } });
  await audit({ actor: s, action: `question.${status.toLowerCase()}`, entityType: "Question", entityId: id });
  revalidatePath("/admin/questions");
}

export async function deleteQuestionAction(id: number): Promise<void> {
  const s = await staffOrThrow("questions.manage");
  const used = await db.studentAnswer.count({ where: { questionId: id } });
  if (used) {
    await db.question.update({ where: { id }, data: { status: QUESTION_STATUS.ARCHIVED } });
  } else {
    await db.question.delete({ where: { id } });
  }
  await audit({ actor: s, action: used ? "question.archived" : "question.deleted", entityType: "Question", entityId: id });
  redirect("/admin/questions");
}

export async function createCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("questions.manage");
  const parsed = parseForm(z.object({ name: z.string().trim().min(2).max(100), description: optionalText(500) }), fd);
  if (!parsed.ok) return parsed.state;
  if (await db.questionCategory.findUnique({ where: { name: parsed.data.name } })) return fail("That category already exists.");
  const cat = await db.questionCategory.create({ data: { name: parsed.data.name, description: parsed.data.description ?? null } });
  await audit({ actor: s, action: "question_category.created", entityType: "QuestionCategory", entityId: cat.id });
  revalidatePath("/admin/questions");
  return success(`Category "${cat.name}" created.`);
}

/**
 * CSV columns: category,difficulty,marks,question,optionA,optionB,optionC,optionD,correct,explanation
 * (Excel users: File → Save As → CSV UTF-8). Categories are created on the fly. All-or-nothing.
 */
export async function importQuestionsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("questions.manage");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file to import.");
  if (file.size > 2 * 1024 * 1024) return fail("The file is larger than 2 MB. Split it into smaller files.");
  if (!/\.csv$/i.test(file.name)) return fail("Upload a .csv file (in Excel use File → Save As → CSV UTF-8).");

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return fail("The file has no question rows.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const required = ["category", "difficulty", "marks", "question", "optiona", "optionb", "optionc", "optiond", "correct"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length) return fail(`Missing column(s): ${missing.join(", ")}. Download the template for the expected format.`);
  const col = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

  const errors: string[] = [];
  const items: { category: string; difficulty: string; marks: number; text: string; options: string[]; correct: number; explanation: string | null }[] = [];
  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const difficulty = col(row, "difficulty").toUpperCase() || "MEDIUM";
    const marks = Number(col(row, "marks") || 1);
    const correct = "ABCD".indexOf(col(row, "correct").toUpperCase());
    const options = ["optiona", "optionb", "optionc", "optiond"].map((o) => col(row, o));
    const text = col(row, "question");
    if (!col(row, "category")) errors.push(`Row ${line}: category is empty`);
    if (!text) errors.push(`Row ${line}: question is empty`);
    if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) errors.push(`Row ${line}: difficulty must be EASY, MEDIUM or HARD`);
    if (!(marks > 0 && marks <= 100)) errors.push(`Row ${line}: marks must be a positive number`);
    if (options.some((o) => !o)) errors.push(`Row ${line}: all four options are required`);
    if (correct < 0) errors.push(`Row ${line}: correct must be A, B, C or D`);
    items.push({ category: col(row, "category"), difficulty, marks, text, options, correct, explanation: header.includes("explanation") ? col(row, "explanation") || null : null });
  });
  if (errors.length) return fail(`Nothing was imported. Fix these problems and try again:\n${errors.slice(0, 15).join("\n")}${errors.length > 15 ? `\n…and ${errors.length - 15} more` : ""}`);
  if (items.length > 2000) return fail("Import at most 2,000 questions per file.");

  const categoryIds = new Map<string, number>();
  for (const name of new Set(items.map((i) => i.category))) {
    const cat = (await db.questionCategory.findUnique({ where: { name } })) ?? (await db.questionCategory.create({ data: { name } }));
    categoryIds.set(name, cat.id);
  }
  await db.$transaction(
    async (tx) => {
      for (const it of items) {
        await tx.question.create({
          data: {
            categoryId: categoryIds.get(it.category)!,
            type: QUESTION_TYPE.MCQ,
            text: it.text,
            explanation: it.explanation,
            difficulty: it.difficulty,
            marks: it.marks,
            options: { create: it.options.map((text, i) => ({ text, isCorrect: i === it.correct, sortOrder: i })) },
          },
        });
      }
    },
    { timeout: 120_000 },
  );
  await audit({ actor: s, action: "question.imported", entityType: "Question", details: { count: items.length, file: file.name } });
  revalidatePath("/admin/questions");
  return success(`${items.length} question(s) imported successfully.`);
}
