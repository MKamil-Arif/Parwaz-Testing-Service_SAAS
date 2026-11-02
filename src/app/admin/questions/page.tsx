import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Plus, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { DIFFICULTY, QUESTION_STATUS, label } from "@/lib/constants";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { createCategoryAction, setQuestionStatusAction } from "@/actions/admin/questions";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Question bank" };

type SP = { q?: string; category?: string; difficulty?: string; status?: string; page?: string; saved?: string };

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("questions.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.q ? { text: { contains: sp.q } } : {}),
    ...(sp.category ? { categoryId: Number(sp.category) } : {}),
    ...(sp.difficulty ? { difficulty: sp.difficulty } : {}),
    status: sp.status === "ARCHIVED" ? QUESTION_STATUS.ARCHIVED : QUESTION_STATUS.ACTIVE,
  };
  const [questions, total, categories] = await Promise.all([
    db.question.findMany({
      where,
      include: { category: true, options: { orderBy: { sortOrder: "asc" } }, _count: { select: { competitions: true, answers: true } } },
      orderBy: { id: "desc" },
      ...skipTake(page),
    }),
    db.question.count({ where }),
    db.questionCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { questions: true } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Question bank"
        description="Multiple-choice questions with four options, marks and categories. Questions already used in an exam are locked."
        actions={
          <>
            <Link href="/admin/questions/import" className={buttonClasses("secondary", "md")}>
              <Upload className="size-4" /> Import CSV
            </Link>
            <Link href="/admin/questions/new" className={buttonClasses("primary", "md")}>
              <Plus className="size-4" /> Add question
            </Link>
          </>
        }
      />
      {sp.saved && <Alert tone="success" className="mb-5">Question #{sp.saved} saved.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
            <Input name="q" defaultValue={sp.q} placeholder="Search question text…" className="min-w-48 flex-1" />
            <Select name="category" defaultValue={sp.category ?? ""} placeholder="All categories" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} className="w-44" />
            <Select name="difficulty" defaultValue={sp.difficulty ?? ""} placeholder="Any difficulty" options={Object.values(DIFFICULTY).map((d) => ({ value: d, label: label(d) }))} className="w-36" />
            <Select name="status" defaultValue={sp.status ?? "ACTIVE"} options={[{ value: "ACTIVE", label: "Active" }, { value: "ARCHIVED", label: "Archived" }]} className="w-32" />
            <button type="submit" className={buttonClasses("navy", "md")}>
              Filter
            </button>
          </form>
          {questions.length === 0 ? (
            <EmptyState icon={BookOpen} title="No questions match" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>ID</TH>
                  <TH>Question</TH>
                  <TH>Category</TH>
                  <TH>Level</TH>
                  <TH>Marks</TH>
                  <TH>Used</TH>
                  <TH />
                </tr>
              </THead>
              <tbody>
                {questions.map((q) => (
                  <TR key={q.id}>
                    <TD className="font-mono text-xs">{q.id}</TD>
                    <TD className="max-w-lg">
                      <Link href={`/admin/questions/${q.id}`} className="line-clamp-2 font-medium text-navy-950 hover:text-brand-700">
                        {q.text}
                      </Link>
                      <p className="mt-1 text-xs text-navy-500">
                        {q.type === "MCQ" ? `Answer: ${q.options.find((o) => o.isCorrect)?.text ?? "—"}` : label(q.type)}
                        {q.isDemo && <span className="ml-2"><SampleBadge>Sample</SampleBadge></span>}
                      </p>
                    </TD>
                    <TD>{q.category.name}</TD>
                    <TD>
                      <Badge tone={q.difficulty === "HARD" ? "red" : q.difficulty === "EASY" ? "green" : "amber"}>{label(q.difficulty)}</Badge>
                    </TD>
                    <TD>{q.marks}</TD>
                    <TD className="text-xs text-navy-500">
                      {q._count.competitions} pool(s)
                      <br />
                      {q._count.answers} served
                    </TD>
                    <TD className="text-right">
                      <form action={setQuestionStatusAction.bind(null, q.id, q.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE")}>
                        <button type="submit" className="text-xs font-semibold text-navy-600 hover:text-navy-950">
                          {q.status === "ACTIVE" ? "Archive" : "Restore"}
                        </button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/questions" params={{ q: sp.q, category: sp.category, difficulty: sp.difficulty, status: sp.status }} />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Categories" />
            <ul className="divide-y divide-navy-100 text-sm">
              {categories.map((c) => (
                <li key={c.id} className="flex justify-between px-5 py-2.5">
                  <Link href={`/admin/questions?category=${c.id}`} className="font-medium text-navy-800 hover:text-brand-700">
                    {c.name}
                  </Link>
                  <span className="text-navy-500">{c._count.questions}</span>
                </li>
              ))}
            </ul>
            <CardBody className="border-t border-navy-100">
              <ActionForm action={createCategoryAction} resetOnSuccess className="space-y-3">
                <Field label="New category" name="name">
                  <Input id="name" name="name" placeholder="e.g. Computer Science" required />
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Add category
                </SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
