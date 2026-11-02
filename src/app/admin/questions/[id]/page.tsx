import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { deleteQuestionAction } from "@/actions/admin/questions";
import { PageHeader, Alert } from "@/components/ui/layout";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("questions.manage");
  const { id } = await params;
  const q = await db.question.findUnique({
    where: { id: Number(id) || 0 },
    include: { options: { orderBy: { sortOrder: "asc" } }, competitions: { include: { competition: { select: { title: true } } } }, _count: { select: { answers: true } } },
  });
  if (!q) notFound();
  const categories = await db.questionCategory.findMany({ orderBy: { name: "asc" } });
  const locked = q._count.answers > 0;
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title={`Question #${q.id}`} back={{ href: "/admin/questions", label: "Question bank" }} actions={<StatusBadge status={q.status} />} />
      {locked && (
        <Alert tone="warning" title="Locked">
          This question has been served in {q._count.answers} examination attempt(s). It cannot be edited so that existing results stay valid. Archive it and
          create a corrected version instead.
        </Alert>
      )}
      {q.competitions.length > 0 && <p className="text-sm text-navy-600">In the pool of: {q.competitions.map((c) => c.competition.title).join(", ")}</p>}
      <Card>
        <CardBody className="py-6">
          <QuestionForm q={q} categories={categories} locked={locked} />
        </CardBody>
      </Card>
      <form action={deleteQuestionAction.bind(null, q.id)}>
        <button type="submit" className="text-sm font-semibold text-red-700 hover:underline">
          {locked ? "Archive this question" : "Delete this question"}
        </button>
      </form>
    </div>
  );
}
