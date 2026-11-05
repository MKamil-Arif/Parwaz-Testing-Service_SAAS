import { cache } from "react";
import { db } from "@/lib/db";

/** Editable website texts (Admin → Website content). Values here are fallbacks only. */
export const DEFAULT_SETTINGS = {
  "site.tagline": "Test Your Knowledge, Earn Your Future.",
  "hero.eyebrow": "Online academic competitions for students across Sindh",
  "hero.subheadline":
    "Sit an affordable, fully online examination from your phone or computer, compete on a transparent merit list, and earn laptops and Chromebooks for your studies.",
  "contact.email": "parwaztestingservice@gmail.com",
  "contact.phone": "+92 3182330264",
  "contact.whatsapp": "+92 3182330264",
  "contact.address": "G-2, Block #B-9, Gulistaan-e-Sajjad, Qasimabad Hyderabad, Sindh, Pakistan",
  "contact.hours": "Monday to Saturday, 10:00 am – 6:00 pm (PKT)",
  "social.facebook": "https://www.facebook.com/share/1GfcmwfjL4/?mibextid=wwXIfr",
  "social.instagram": "https://www.instagram.com/parwaztestingservice?psln=MXR0azE1bXp4ZmdnZA%3D%3D&utm_source=qr",
  "social.tiktok": "",
  "social.youtube": "",
  "about.intro":
    "Parwaz Testing Service is an online academic testing business built for students across Sindh — especially in rural and underserved districts where access to competitive testing, and to the devices that make modern learning possible, is limited.",
  "about.mission":
    "To give every capable student in Sindh a fair, affordable and transparent way to test their knowledge and be rewarded for their academic performance.",
  "about.vision":
    "To grow into a trusted Pakistani testing institution, known for integrity, accessibility and results students and institutions can rely on.",
  "about.purpose":
    "Talent is spread evenly across Sindh; opportunity is not. Students in smaller towns rarely get the chance to measure themselves against peers province-wide. We run paid academic competitions with a simple promise: the entry fee is affordable, the test is fair, and the best performers receive devices that help them keep learning.",
  "about.approach":
    "Every examination is built from a reviewed question bank, delivered online with a server-controlled timer, scored automatically for objective questions and checked by our team before any result is published. Rules, tie-breaking criteria and prize allocation are published before registration opens.",
  "about.transparency":
    "We publish competition rules, prize allocations and tie-breaking rules in advance. Results are verified and approved by our team before publication, every change is logged, and only verified winners are announced. Our financial model is preliminary and will be reported honestly as the business grows.",
  "about.impact":
    "Each competition puts laptops and Chromebooks into the hands of high-performing students, many of whom would otherwise share a single phone for study. Award ceremonies in cities across Sindh celebrate students, families and schools.",
  "about.future":
    "Our first step is academic competitions for Classes 9–12 in Sindh. Over time we aim to offer university entrance testing, recruitment tests, professional assessments and institutional testing contracts — and to earn the trust that established testing services in Pakistan enjoy today. This is our ambition, not a claim about where we are now.",
  "payment.manualInstructions":
    "Send the exact registration fee to the account below and enter the transaction ID you receive. Your registration is confirmed only after our team verifies the payment (usually within 24 hours).\n\nJazzCash / Easypaisa: 0300 0000000 (Account title: Parwaz Testing Service) — placeholder, update in Admin → Website content\nBank transfer: Bank name, account number and IBAN — placeholder",
  "home.showLiveRegistrationCount": "false",
  "leaderboard.publicLimit": "100",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.siteSetting.findMany();
  const out = { ...DEFAULT_SETTINGS } as Settings;
  for (const row of rows) if (row.key in out) out[row.key as SettingKey] = row.value;
  return out;
});
