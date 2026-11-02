import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHero } from "./sections";
import { Prose } from "@/components/ui/prose";

/** Renders an admin-editable policy page (Admin → Website content → Pages). */
export async function ContentPageView({ slug, eyebrow }: { slug: string; eyebrow: string }) {
  const page = await db.contentPage.findUnique({ where: { slug } });
  if (!page) notFound();
  return (
    <>
      <PageHero eyebrow={eyebrow} title={page.title} description={`Last updated ${formatDate(page.updatedAt)}`} />
      <section className="container-page max-w-3xl py-12">
        <Prose>{page.body}</Prose>
      </section>
    </>
  );
}

export async function contentPageTitle(slug: string): Promise<string> {
  const page = await db.contentPage.findUnique({ where: { slug }, select: { title: true } });
  return page?.title ?? "Page";
}
