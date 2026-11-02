import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { savePageAction } from "@/actions/admin/content";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Textarea } from "@/components/ui/form";
import { CONTENT_PAGES, ContentTabs } from "../../tabs";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditContentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff("content.manage");
  const { slug } = await params;
  const meta = CONTENT_PAGES.find((p) => p.slug === slug);
  if (!meta) notFound();
  const page = await db.contentPage.findUnique({ where: { slug } });
  return (
    <>
      <PageHeader title="Website content management" />
      <ContentTabs active={slug} />
      <Card className="max-w-4xl">
        <CardBody className="py-6">
          <p className="mb-4 text-sm text-navy-500">
            Public URL:{" "}
            <Link href={`/${slug}`} target="_blank" className="font-semibold text-brand-700">
              /{slug}
            </Link>
            {page && ` · last updated ${formatDateTime(page.updatedAt)}`}. Markdown supported (## headings, - lists, **bold**). Have legal policies reviewed by a qualified professional.
          </p>
          <ActionForm action={savePageAction} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <Field label="Title" name="title">
              <Input id="title" name="title" defaultValue={page?.title ?? meta.label} required />
            </Field>
            <Field label="Content" name="body">
              <Textarea id="body" name="body" rows={24} defaultValue={page?.body ?? ""} required className="font-mono text-[13px]" />
            </Field>
            <SubmitButton>Save & publish</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
