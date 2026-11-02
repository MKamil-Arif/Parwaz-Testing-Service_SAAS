import type { Metadata } from "next";
import { Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { deleteTestimonialAction, saveTestimonialAction } from "@/actions/admin/content";
import { PageHeader, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/form";
import { SampleBadge } from "@/components/ui/badge";
import { ContentTabs } from "../tabs";

export const metadata: Metadata = { title: "Testimonials" };

function TestimonialFields({ t }: { t?: { id: number; name: string; role: string; quote: string; sortOrder: number; isSample: boolean; consentObtained: boolean; isPublished: boolean } }) {
  const id = t?.id ?? "new";
  return (
    <>
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Name" name="name">
        <Input id={`n-${id}`} name="name" defaultValue={t?.name} required />
      </Field>
      <Field label="Role (e.g. Class 10 student, Sukkur)" name="role">
        <Input id={`r-${id}`} name="role" defaultValue={t?.role} required />
      </Field>
      <Field label="Quote" name="quote" className="sm:col-span-2">
        <Textarea id={`q-${id}`} name="quote" defaultValue={t?.quote} rows={3} required />
      </Field>
      <Field label="Order" name="sortOrder">
        <Input id={`o-${id}`} name="sortOrder" type="number" defaultValue={t?.sortOrder ?? 0} />
      </Field>
      <div className="space-y-2">
        <CheckboxField name="isSample" defaultChecked={t?.isSample ?? false} label="Sample / illustrative (shown with a “Sample” badge)" />
        <CheckboxField name="consentObtained" defaultChecked={t?.consentObtained ?? false} label="Written consent obtained (guardian if under 18)" />
        <CheckboxField name="isPublished" defaultChecked={t?.isPublished ?? false} label="Published" />
      </div>
    </>
  );
}

export default async function TestimonialsAdminPage() {
  await requireStaff("content.manage");
  const items = await db.testimonial.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Website content management" />
      <ContentTabs active="testimonials" />
      <Alert tone="warning" className="mb-6">
        Never invent testimonials. Until genuine ones exist, keep placeholders marked as Sample. Genuine testimonials need the person's consent before publishing.
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {items.map((t) => (
            <Card key={t.id}>
              <CardHeader title={<span className="flex items-center gap-2">{t.name} {t.isSample && <SampleBadge />}</span>} />
              <CardBody>
                <ActionForm action={saveTestimonialAction} className="grid gap-3 sm:grid-cols-2">
                  <TestimonialFields t={t} />
                  <div className="sm:col-span-2">
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </div>
                </ActionForm>
                <form action={deleteTestimonialAction.bind(null, t.id)} className="mt-2 text-right">
                  <button type="submit" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <Trash className="size-3.5" /> Delete
                  </button>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader title="Add testimonial" />
          <CardBody>
            <ActionForm action={saveTestimonialAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
              <TestimonialFields />
              <div className="sm:col-span-2">
                <SubmitButton>Add testimonial</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
