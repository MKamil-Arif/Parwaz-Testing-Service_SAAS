"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { checkbox } from "@/lib/validation";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { FAQ_CATEGORY } from "@/lib/constants";

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const entries = [...fd.entries()].filter(([k]) => SETTING_KEYS.includes(k)) as [string, string][];
  if (!entries.length) return fail("Nothing to save.");
  const onlyLeaderboard = entries.every(([k]) => k.startsWith("leaderboard."));
  const s = await staffOrThrow(onlyLeaderboard ? "results.manage" : "content.manage");
  for (const [key, raw] of entries) {
    const value = String(raw).slice(0, 20_000);
    if (key.startsWith("social.") && value && !/^https:\/\/[^\s]+$/.test(value)) return fail(`${key}: enter a full https:// link or leave it empty.`);
    if (key === "leaderboard.publicLimit" && !(Number(value) >= 10)) return fail("Leaderboard limit must be at least 10.");
  }
  // Checkbox-style settings are absent from FormData when unchecked.
  if (fd.has("__bool_home.showLiveRegistrationCount") && !fd.has("home.showLiveRegistrationCount")) entries.push(["home.showLiveRegistrationCount", "false"]);
  for (const [key, raw] of entries) {
    const value = key === "home.showLiveRegistrationCount" ? (raw === "false" ? "false" : "true") : String(raw).trim();
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await audit({ actor: s, action: "settings.updated", entityType: "SiteSetting", details: { keys: entries.map(([k]) => k) } });
  revalidatePath("/", "layout");
  return success("Settings saved.");
}

const faqSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
  category: z.enum(Object.values(FAQ_CATEGORY) as [string, ...string[]]),
  question: z.string().trim().min(5).max(400),
  answer: z.string().trim().min(5).max(5000),
  sortOrder: z.coerce.number().int().default(0),
  isPublished: checkbox,
});

export async function saveFaqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("content.manage");
  const parsed = parseForm(faqSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...data } = parsed.data;
  const row = id ? await db.faqItem.update({ where: { id }, data }) : await db.faqItem.create({ data });
  await audit({ actor: s, action: id ? "faq.updated" : "faq.created", entityType: "FaqItem", entityId: row.id });
  revalidatePath("/admin/content/faqs");
  return success("FAQ saved.");
}

export async function deleteFaqAction(id: number): Promise<void> {
  const s = await staffOrThrow("content.manage");
  await db.faqItem.delete({ where: { id } });
  await audit({ actor: s, action: "faq.deleted", entityType: "FaqItem", entityId: id });
  revalidatePath("/admin/content/faqs");
}

const testimonialSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().optional()),
  name: z.string().trim().min(2).max(150),
  role: z.string().trim().min(2).max(150),
  quote: z.string().trim().min(10).max(1000),
  sortOrder: z.coerce.number().int().default(0),
  isSample: checkbox,
  consentObtained: checkbox,
  isPublished: checkbox,
});

export async function saveTestimonialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("content.manage");
  const parsed = parseForm(testimonialSchema, fd);
  if (!parsed.ok) return parsed.state;
  const { id, ...data } = parsed.data;
  if (data.isPublished && !data.isSample && !data.consentObtained) {
    return fail("A genuine testimonial can only be published with the person's (and guardian's, if under 18) consent.", { consentObtained: ["Consent required to publish"] });
  }
  const row = id ? await db.testimonial.update({ where: { id }, data }) : await db.testimonial.create({ data });
  await audit({ actor: s, action: id ? "testimonial.updated" : "testimonial.created", entityType: "Testimonial", entityId: row.id });
  revalidatePath("/admin/content/testimonials");
  return success("Testimonial saved.");
}

export async function deleteTestimonialAction(id: number): Promise<void> {
  const s = await staffOrThrow("content.manage");
  await db.testimonial.delete({ where: { id } });
  await audit({ actor: s, action: "testimonial.deleted", entityType: "Testimonial", entityId: id });
  revalidatePath("/admin/content/testimonials");
}

export async function savePageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("content.manage");
  const parsed = parseForm(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().trim().min(3).max(200), body: z.string().trim().min(20) }), fd);
  if (!parsed.ok) return parsed.state;
  const { slug, title, body } = parsed.data;
  await db.contentPage.upsert({ where: { slug }, create: { slug, title, body }, update: { title, body } });
  await audit({ actor: s, action: "page.updated", entityType: "ContentPage", entityId: slug });
  revalidatePath(`/${slug}`);
  return success("Page saved and published.");
}
