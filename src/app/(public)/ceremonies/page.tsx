import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Megaphone, PartyPopper } from "lucide-react";
import { db } from "@/lib/db";
import { getPublishedCeremonies } from "@/lib/queries";
import { ANNOUNCEMENT_TYPE } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHero } from "@/components/site/sections";
import { EmptyState } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Award ceremonies" };

export default async function CeremoniesPage() {
  const [ceremonies, news] = await Promise.all([
    getPublishedCeremonies(),
    db.announcement.findMany({ where: { type: ANNOUNCEMENT_TYPE.NEWS, isPublished: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHero
        eyebrow="Award ceremonies"
        title="Celebrating achievement across Sindh"
        description="Our competitions run online, but we recognise winners in person. Ceremonies are held in major cities with students, families and schools."
      />
      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {ceremonies.length === 0 ? (
            <div className="rounded-3xl border border-navy-100 bg-white">
              <EmptyState icon={PartyPopper} title="No ceremonies scheduled yet" description="Ceremony dates and venues are announced after results are published." />
            </div>
          ) : (
            ceremonies.map((c) => (
              <Link
                key={c.id}
                href={`/ceremonies/${c.slug}`}
                className="group block overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card transition hover:shadow-lift"
              >
                {c.media[0]?.type === "IMAGE" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.media[0].url} alt={c.media[0].caption ?? c.title} className="h-48 w-full object-cover" />
                )}
                <div className="p-6">
                  <Badge tone={c.eventDate > now ? "green" : "neutral"}>{c.eventDate > now ? "Upcoming" : "Held"}</Badge>
                  <h2 className="mt-3 text-xl font-bold group-hover:text-brand-700">{c.title}</h2>
                  <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy-600">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" /> {formatDateTime(c.eventDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" /> {c.venue}, {c.city}
                    </span>
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
        <aside>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Megaphone className="size-5 text-gold-500" /> News & announcements
          </h2>
          {news.length === 0 ? (
            <p className="text-sm text-navy-500">No announcements yet.</p>
          ) : (
            <ul className="space-y-4">
              {news.map((n) => (
                <li key={n.id} className="rounded-2xl border border-navy-100 bg-white p-5">
                  <p className="text-xs text-navy-500">{formatDate(n.createdAt)}</p>
                  <p className="mt-1 font-semibold text-navy-950">{n.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-navy-600">{n.body}</p>
                  {n.linkUrl && (
                    <Link href={n.linkUrl} className="mt-2 inline-block text-sm font-semibold text-brand-700">
                      {n.linkLabel ?? "Read more"} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </>
  );
}
