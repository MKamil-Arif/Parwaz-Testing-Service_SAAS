import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { PageHeader, Alert } from "@/components/ui/layout";
import { Card, CardBody } from "@/components/ui/card";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Add question" };

export default async function NewQuestionPage() {
  await requireStaff("questions.manage");
  const categories = await db.questionCategory.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Add question" back={{ href: "/admin/questions", label: "Question bank" }} />
      {categories.length === 0 ? (
        <Alert tone="warning">
          Create a category first on the <Link href="/admin/questions" className="font-semibold underline">question bank</Link> page.
        </Alert>
      ) : (
        <Card>
          <CardBody className="py-6">
            <QuestionForm categories={categories} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
