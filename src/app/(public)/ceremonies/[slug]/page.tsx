import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { CEREMONY_STATUS, MEDIA_TYPE } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPublicWinners } from "@/lib/queries";
import { PageHero } from "@/components/site/sections";
import { Prose } from "@/components/ui/prose";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Award ceremony" };

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export default async function CeremonyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ceremony = await db.awardCeremony.findFirst({
    where: { slug, status: CEREMONY_STATUS.PUBLISHED },
    include: {
      media: { where: { isPublished: true, consentConfirmed: true }, orderBy: { sortOrder: "asc" } },
      announcements: { where: { isPublished: true }, orderBy: { createdAt: "desc" } },
      distributions: { select: { allocationId: true } },
    },
  });
  if (!ceremony) notFound();

  // Winners honoured at this ceremony (verified + publicly approved only).
  const allocationIds = new Set(ceremony.distributions.map((d) => d.allocationId));
  const winners = (await getPublicWinners()).filter((w) => allocationIds.has(w.id));
  const photos = ceremony.media.filter((m) => m.type === MEDIA_TYPE.IMAGE);
  const videos = ceremony.media.filter((m) => m.type === MEDIA_TYPE.VIDEO);

  return (
    <>
      <PageHero eyebrow={`Award ceremony · ${ceremony.city}`} title={ceremony.title}>
        <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-navy-200">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-gold-300" /> {formatDateTime(ceremony.eventDate)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4 text-gold-300" /> {ceremony.venue}, {ceremony.city}
          </span>
        </p>
      </PageHero>
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardBody>
              <Prose>{ceremony.description}</Prose>
            </CardBody>
          </Card>
          {photos.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold">Photographs</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {photos.map((p) => (
                  <figure key={p.id} className="overflow-hidden rounded-2xl bg-navy-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? ceremony.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    {p.caption && <figcaption className="px-3 py-2 text-xs text-navy-600">{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}
          {videos.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold">Videos</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {videos.map((v) => {
                  const embed = youtubeEmbed(v.url);
                  return embed ? (
                    <div key={v.id} className="overflow-hidden rounded-2xl bg-navy-950">
                      <iframe
                        src={embed}
                        title={v.caption ?? "Ceremony video"}
                        className="aspect-video w-full"
                        allow="accelerometer; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-navy-100 p-4 text-sm font-semibold text-brand-700">
                      {v.caption ?? "Watch video"} →
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader title="Winners honoured" />
            <CardBody>
              {winners.length === 0 ? (
                <p className="text-sm text-navy-500">The winner list will be published here after verification.</p>
              ) : (
                <ul className="space-y-3">
                  {winners.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        <span className="font-semibold text-navy-950">{w.name}</span>
                        {w.district && <span className="text-navy-500"> · {w.district}</span>}
                      </span>
                      <Badge tone="gold">
                        #{w.rank} {w.prizeTitle}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          {ceremony.announcements.length > 0 && (
            <Card>
              <CardHeader title="Announcements" />
              <CardBody className="space-y-4">
                {ceremony.announcements.map((a) => (
                  <div key={a.id}>
                    <p className="text-xs text-navy-500">{formatDate(a.createdAt)}</p>
                    <p className="font-semibold text-navy-950">{a.title}</p>
                    <p className="text-sm whitespace-pre-line text-navy-600">{a.body}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </aside>
      </section>
    </>
  );
}
