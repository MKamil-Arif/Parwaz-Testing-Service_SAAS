"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { checkbox, optionalText } from "@/lib/validation";
import { CEREMONY_STATUS, MEDIA_TYPE, NOTIFICATION_TYPE, ROLES, USER_STATUS } from "@/lib/constants";
import { fromPKTInput, formatDateTime } from "@/lib/format";
import { saveImage } from "@/lib/uploads";
import { notifyMany } from "@/lib/notifications";

const ceremonySchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
  title: z.string().trim().min(5).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens").max(120),
  city: z.string().trim().min(2).max(100),
  venue: z.string().trim().min(3).max(300),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).transform(fromPKTInput),
  description: z.string().trim().min(10),
  status: z.enum([CEREMONY_STATUS.DRAFT, CEREMONY_STATUS.PUBLISHED]),
  competitionId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
  notifyStudents: checkbox,
});

export async function saveCeremonyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("ceremonies.manage");
  const parsed = parseForm(ceremonySchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, notifyStudents, ...d } = parsed.data;
  const clash = await db.awardCeremony.findFirst({ where: { slug: d.slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("That URL slug is already used.", { slug: ["Already in use"] });
  const data = { ...d, competitionId: d.competitionId ?? null };
  const row = id ? await db.awardCeremony.update({ where: { id }, data }) : await db.awardCeremony.create({ data });
  if (notifyStudents && row.status === CEREMONY_STATUS.PUBLISHED) {
    const users = await db.user.findMany({ where: { status: USER_STATUS.ACTIVE, roles: { some: { role: { name: ROLES.STUDENT } } } }, select: { id: true } });
    await notifyMany(users.map((u) => u.id), {
      type: NOTIFICATION_TYPE.CEREMONY,
      title: `Award ceremony: ${row.title}`,
      body: `${row.venue}, ${row.city} — ${formatDateTime(row.eventDate)}.`,
      link: `/ceremonies/${row.slug}`,
    });
  }
  await audit({ actor: s, action: id ? "ceremony.updated" : "ceremony.created", entityType: "AwardCeremony", entityId: row.id });
  if (!id) redirect(`/admin/ceremonies/${row.id}`);
  revalidatePath(`/admin/ceremonies/${row.id}`);
  return success("Ceremony saved.");
}

export async function uploadCeremonyPhotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("ceremonies.manage");
  const ceremonyId = Number(fd.get("ceremonyId"));
  const file = fd.get("file");
  const caption = String(fd.get("caption") ?? "").slice(0, 300) || null;
  const consent = fd.get("consentConfirmed") === "on";
  if (!(file instanceof File)) return fail("Choose an image.");
  if (!(await db.awardCeremony.findUnique({ where: { id: ceremonyId } }))) return fail("Ceremony not found.");
  const saved = await saveImage(file);
  if ("error" in saved) return fail(saved.error);
  const media = await db.ceremonyMedia.create({
    data: { ceremonyId, type: MEDIA_TYPE.IMAGE, url: saved.url, caption, consentConfirmed: consent, isPublished: false },
  });
  await audit({ actor: s, action: "ceremony.photo_uploaded", entityType: "CeremonyMedia", entityId: media.id, details: { consent } });
  revalidatePath(`/admin/ceremonies/${ceremonyId}`);
  return success(consent ? "Photo uploaded. Publish it when ready." : "Photo uploaded as private. It cannot be published until consent is confirmed.");
}

export async function addCeremonyVideoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("ceremonies.manage");
  const parsed = parseForm(
    z.object({ ceremonyId: z.coerce.number().int(), url: z.string().trim().regex(/^https:\/\/[^\s]+$/, "Enter an https:// video link (YouTube recommended)").max(500), caption: optionalText(300), consentConfirmed: checkbox }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const m = await db.ceremonyMedia.create({ data: { ceremonyId: d.ceremonyId, type: MEDIA_TYPE.VIDEO, url: d.url, caption: d.caption ?? null, consentConfirmed: d.consentConfirmed } });
  await audit({ actor: s, action: "ceremony.video_added", entityType: "CeremonyMedia", entityId: m.id });
  revalidatePath(`/admin/ceremonies/${d.ceremonyId}`);
  return success("Video added.");
}

export async function updateMediaAction(id: number, field: "consentConfirmed" | "isPublished"): Promise<void> {
  const s = await staffOrThrow("ceremonies.manage");
  const m = await db.ceremonyMedia.findUnique({ where: { id } });
  if (!m) return;
  const next = !m[field];
  // Publishing requires recorded consent; withdrawing consent also unpublishes.
  if (field === "isPublished" && next && !m.consentConfirmed) return;
  await db.ceremonyMedia.update({ where: { id }, data: field === "consentConfirmed" && !next ? { consentConfirmed: false, isPublished: false } : { [field]: next } });
  await audit({ actor: s, action: `ceremony_media.${field}.${next}`, entityType: "CeremonyMedia", entityId: id });
  revalidatePath(`/admin/ceremonies/${m.ceremonyId}`);
}

export async function deleteMediaAction(id: number): Promise<void> {
  const s = await staffOrThrow("ceremonies.manage");
  const m = await db.ceremonyMedia.findUnique({ where: { id } });
  if (!m) return;
  await db.ceremonyMedia.delete({ where: { id } });
  await audit({ actor: s, action: "ceremony_media.deleted", entityType: "CeremonyMedia", entityId: id });
  revalidatePath(`/admin/ceremonies/${m.ceremonyId}`);
}
