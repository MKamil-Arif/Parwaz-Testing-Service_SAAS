import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { importQuestionsAction } from "@/actions/admin/questions";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Import questions" };

export default async function ImportQuestionsPage() {
  await requireStaff("questions.manage");
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Import questions from CSV / Excel" back={{ href: "/admin/questions", label: "Question bank" }} />
      <Card>
        <CardHeader title="1. Prepare your file" />
        <CardBody className="space-y-3 text-sm text-navy-700">
          <p>
            Use one row per question with these columns: <code className="rounded bg-navy-50 px-1">category, difficulty, marks, question, optionA, optionB, optionC, optionD, correct, explanation</code>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>difficulty</strong>: EASY, MEDIUM or HARD</li>
            <li><strong>correct</strong>: A, B, C or D</li>
            <li>New categories are created automatically.</li>
            <li>Working in Excel? Choose <em>File → Save As → CSV UTF-8 (comma delimited)</em> so Urdu/Sindhi text is preserved.</li>
            <li>The import is all-or-nothing: if any row has a problem, nothing is saved and every problem is listed.</li>
          </ul>
          <a href="/api/admin/export/question-template" className={buttonClasses("secondary", "sm")}>
            <Download className="size-4" /> Download template
          </a>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="2. Upload" />
        <CardBody>
          <ActionForm action={importQuestionsAction} className="space-y-4" resetOnSuccess>
            <Field label="CSV file (max 2 MB)" name="file">
              <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
            </Field>
            <SubmitButton pendingText="Importing…">Import questions</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
