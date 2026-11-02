import type { Metadata } from "next";
import { Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { FAQ_CATEGORY, label } from "@/lib/constants";
import { deleteFaqAction, saveFaqAction } from "@/actions/admin/content";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ContentTabs } from "../tabs";

export const metadata: Metadata = { title: "FAQs" };

const CATS = Object.values(FAQ_CATEGORY).map((c) => ({ value: c, label: label(c) }));

export default async function FaqAdminPage() {
  await requireStaff("content.manage");
  const faqs = await db.faqItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  return (
    <>
      <PageHeader title="Website content management" />
      <ContentTabs active="faqs" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {faqs.map((f) => (
            <Card key={f.id}>
              <CardBody>
                <ActionForm action={saveFaqAction} className="grid gap-3 sm:grid-cols-4">
                  <input type="hidden" name="id" value={f.id} />
                  <Field label="Question" name="question" className="sm:col-span-4">
                    <Input id={`q-${f.id}`} name="question" defaultValue={f.question} required />
                  </Field>
                  <Field label="Answer" name="answer" className="sm:col-span-4">
                    <Textarea id={`a-${f.id}`} name="answer" defaultValue={f.answer} rows={3} required />
                  </Field>
                  <Field label="Category" name="category">
                    <Select id={`c-${f.id}`} name="category" defaultValue={f.category} options={CATS} />
                  </Field>
                  <Field label="Order" name="sortOrder">
                    <Input id={`o-${f.id}`} name="sortOrder" type="number" defaultValue={f.sortOrder} />
                  </Field>
                  <div className="flex items-end">
                    <CheckboxField name="isPublished" defaultChecked={f.isPublished} label="Published" />
                  </div>
                  <div className="flex items-end justify-end gap-3">
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </div>
                </ActionForm>
                <form action={deleteFaqAction.bind(null, f.id)} className="mt-2 text-right">
                  <button type="submit" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <Trash className="size-3.5" /> Delete
                  </button>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader title="Add FAQ" />
          <CardBody>
            <ActionForm action={saveFaqAction} resetOnSuccess className="space-y-3">
              <Field label="Question" name="question">
                <Input id="question" name="question" required />
              </Field>
              <Field label="Answer" name="answer">
                <Textarea id="answer" name="answer" rows={4} required />
              </Field>
              <Field label="Category" name="category">
                <Select id="category" name="category" options={CATS} />
              </Field>
              <Field label="Order" name="sortOrder">
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={faqs.length + 1} />
              </Field>
              <CheckboxField name="isPublished" defaultChecked label="Published" />
              <SubmitButton>Add FAQ</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
