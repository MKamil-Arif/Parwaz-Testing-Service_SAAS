import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { MEDIA_TYPE } from "@/lib/constants";
import { addCeremonyVideoAction, deleteMediaAction, updateMediaAction, uploadCeremonyPhotoAction } from "@/actions/admin/ceremonies";
import { PageHeader, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { CeremonyForm } from "../ceremony-form";

export const metadata: Metadata = { title: "Ceremony" };

export default async function CeremonyAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("ceremonies.manage");
  const { id } = await params;
  const c = await db.awardCeremony.findUnique({
    where: { id: Number(id) || 0 },
    include: { media: { orderBy: { createdAt: "desc" } }, distributions: { include: { allocation: { include: { prize: true, result: { include: { attempt: { include: { registration: { include: { user: true } } } } } } } } } } },
  });
  if (!c) notFound();
  const competitions = await db.competition.findMany({ select: { id: true, title: true } });

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        back={{ href: "/admin/ceremonies", label: "Award ceremonies" }}
        actions={
          <>
            <StatusBadge status={c.status} />
            {c.status === "PUBLISHED" && (
              <Link href={`/ceremonies/${c.slug}`} target="_blank" className={buttonClasses("secondary", "sm")}>
                Public page
              </Link>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Event details" />
          <CardBody>
            <CeremonyForm c={c} competitions={competitions} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Upload photo" />
            <CardBody>
              <Alert tone="warning" className="mb-4">
                Only publish photos where every identifiable student (and a parent/guardian for under-18s) has agreed. Unconfirmed photos stay private.
              </Alert>
              <ActionForm action={uploadCeremonyPhotoAction} resetOnSuccess className="space-y-3">
                <input type="hidden" name="ceremonyId" value={c.id} />
                <Field label="Image (JPG, PNG or WebP, max 4 MB)" name="file">
                  <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
                </Field>
                <Field label="Caption" name="caption">
                  <Input id="caption" name="caption" maxLength={300} />
                </Field>
                <CheckboxField name="consentConfirmed" label="Consent has been obtained from everyone identifiable in this photo" />
                <SubmitButton size="sm">Upload</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Add video" />
            <CardBody>
              <ActionForm action={addCeremonyVideoAction} resetOnSuccess className="space-y-3">
                <input type="hidden" name="ceremonyId" value={c.id} />
                <Field label="Video link (YouTube embeds automatically)" name="url">
                  <Input id="url" name="url" placeholder="https://www.youtube.com/watch?v=…" required />
                </Field>
                <Field label="Caption" name="caption">
                  <Input id="v-caption" name="caption" />
                </Field>
                <CheckboxField name="consentConfirmed" label="Consent obtained from everyone identifiable" />
                <SubmitButton size="sm">Add video</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title={`Media (${c.media.length})`} />
        <CardBody>
          {c.media.length === 0 ? (
            <p className="text-sm text-navy-500">No media yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.media.map((m) => (
                <div key={m.id} className="overflow-hidden rounded-xl border border-navy-100">
                  {m.type === MEDIA_TYPE.IMAGE ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="grid aspect-[4/3] place-items-center bg-navy-950 text-sm font-semibold text-white">
                      ▶ Video
                    </a>
                  )}
                  <div className="space-y-2 p-3 text-xs">
                    {m.caption && <p className="text-navy-700">{m.caption}</p>}
                    <div className="flex flex-wrap gap-1">
                      {m.consentConfirmed ? <Badge tone="green">Consent ✓</Badge> : <Badge tone="red">No consent</Badge>}
                      {m.isPublished ? <Badge tone="blue">Public</Badge> : <Badge>Private</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={updateMediaAction.bind(null, m.id, "consentConfirmed")}>
                        <button type="submit" className="font-semibold text-navy-600 hover:text-navy-950">
                          {m.consentConfirmed ? "Withdraw consent" : "Confirm consent"}
                        </button>
                      </form>
                      {m.consentConfirmed && (
                        <form action={updateMediaAction.bind(null, m.id, "isPublished")}>
                          <button type="submit" className="font-semibold text-brand-700">
                            {m.isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      )}
                      <form action={deleteMediaAction.bind(null, m.id)}>
                        <button type="submit" aria-label="Delete media" className="text-red-600">
                          <Trash className="size-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Winners honoured at this ceremony" description="Assign winners from Prizes & distribution (method: Award ceremony)." />
        <CardBody>
          {c.distributions.length === 0 ? (
            <p className="text-sm text-navy-500">No winners assigned yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {c.distributions.map((d) => (
                <li key={d.id}>
                  #{d.allocation.rank} {d.allocation.result.attempt.registration.user.fullName} — {d.allocation.prize.title} <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
