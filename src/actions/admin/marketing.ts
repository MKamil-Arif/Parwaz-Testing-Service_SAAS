"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { checkbox, optionalText } from "@/lib/validation";
import { ANNOUNCEMENT_TYPE, CAMPAIGN_CHANNEL, CAMPAIGN_STATUS } from "@/lib/constants";
import { fromPKTInput } from "@/lib/format";

const optId = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional());
const optDate = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional());
const optDateTime = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).transform(fromPKTInput).optional());

const campaignSchema = z.object({
  id: optId,
  name: z.string().trim().min(3).max(150),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens").max(80),
  channel: z.enum(Object.values(CAMPAIGN_CHANNEL) as [string, ...string[]]),
  status: z.enum(Object.values(CAMPAIGN_STATUS) as [string, ...string[]]),
  startDate: z.coerce.date(),
  endDate: optDate,
  budget: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).optional()),
  notes: optionalText(2000),
  landingEnabled: checkbox,
  landingHeadline: optionalText(200),
  landingBody: optionalText(20000),
  landingCompetitionId: optId,
});

export async function saveCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("marketing.manage");
  const parsed = parseForm(campaignSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...d } = parsed.data;
  const clash = await db.marketingCampaign.findFirst({ where: { slug: d.slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("That tracking code is already used.", { slug: ["Already in use"] });
  if (d.landingEnabled && !d.landingHeadline) return fail("A landing page needs a headline.", { landingHeadline: ["Required"] });
  const data = {
    ...d,
    endDate: d.endDate ?? null,
    budget: d.budget ?? null,
    notes: d.notes ?? null,
    landingHeadline: d.landingHeadline ?? null,
    landingBody: d.landingBody ?? null,
    landingCompetitionId: d.landingCompetitionId ?? null,
  };
  const row = id ? await db.marketingCampaign.update({ where: { id }, data }) : await db.marketingCampaign.create({ data });
  await audit({ actor: s, action: id ? "campaign.updated" : "campaign.created", entityType: "MarketingCampaign", entityId: row.id });
  revalidatePath("/admin/marketing");
  return success("Campaign saved.");
}

const announcementSchema = z.object({
  id: optId,
  type: z.enum([ANNOUNCEMENT_TYPE.NEWS, ANNOUNCEMENT_TYPE.BANNER]),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().max(5000).default(""),
  linkUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^(\/|https:\/\/)[^\s]*$/, "Use a site path like /competitions or an https:// link").max(300).optional()),
  linkLabel: optionalText(60),
  isPublished: checkbox,
  startsAt: optDateTime,
  endsAt: optDateTime,
  competitionId: optId,
  ceremonyId: optId,
});

export async function saveAnnouncementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("marketing.manage");
  const parsed = parseForm(announcementSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...d } = parsed.data;
  const data = {
    ...d,
    linkUrl: d.linkUrl ?? null,
    linkLabel: d.linkLabel ?? null,
    startsAt: d.startsAt ?? null,
    endsAt: d.endsAt ?? null,
    competitionId: d.competitionId ?? null,
    ceremonyId: d.ceremonyId ?? null,
  };
  const row = id ? await db.announcement.update({ where: { id }, data }) : await db.announcement.create({ data });
  await audit({ actor: s, action: id ? "announcement.updated" : "announcement.created", entityType: "Announcement", entityId: row.id });
  revalidatePath("/", "layout");
  return success("Announcement saved.");
}

export async function toggleAnnouncementAction(id: number): Promise<void> {
  const s = await staffOrThrow("marketing.manage");
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) return;
  await db.announcement.update({ where: { id }, data: { isPublished: !a.isPublished } });
  await audit({ actor: s, action: a.isPublished ? "announcement.unpublished" : "announcement.published", entityType: "Announcement", entityId: id });
  revalidatePath("/", "layout");
}

export async function deleteAnnouncementAction(id: number): Promise<void> {
  const s = await staffOrThrow("marketing.manage");
  await db.announcement.delete({ where: { id } });
  await audit({ actor: s, action: "announcement.deleted", entityType: "Announcement", entityId: id });
  revalidatePath("/", "layout");
}

export async function setSubscriberStatusAction(id: number, status: string): Promise<void> {
  const s = await staffOrThrow("marketing.manage");
  if (status !== "SUBSCRIBED" && status !== "UNSUBSCRIBED") return;
  await db.newsletterSubscriber.update({ where: { id }, data: { status } });
  await audit({ actor: s, action: `subscriber.${status.toLowerCase()}`, entityType: "NewsletterSubscriber", entityId: id });
  revalidatePath("/admin/marketing/newsletter");
}
