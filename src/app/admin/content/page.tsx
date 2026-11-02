import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/guards";
import { getSettings, type SettingKey } from "@/lib/settings";
import { saveSettingsAction } from "@/actions/admin/content";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/form";
import { ContentTabs } from "./tabs";

export const metadata: Metadata = { title: "Website content" };

const GROUPS: { title: string; description?: string; fields: { key: SettingKey; label: string; long?: boolean }[] }[] = [
  {
    title: "Home page hero",
    fields: [
      { key: "site.tagline", label: "Tagline" },
      { key: "hero.eyebrow", label: "Eyebrow line" },
      { key: "hero.subheadline", label: "Sub-headline", long: true },
    ],
  },
  {
    title: "Contact information",
    description: "Shown in the footer and on the Contact page.",
    fields: [
      { key: "contact.email", label: "Email" },
      { key: "contact.phone", label: "Phone" },
      { key: "contact.whatsapp", label: "WhatsApp number" },
      { key: "contact.address", label: "Address" },
      { key: "contact.hours", label: "Support hours" },
    ],
  },
  {
    title: "Social media",
    description: "Full https:// links. Leave empty to hide an icon.",
    fields: [
      { key: "social.facebook", label: "Facebook" },
      { key: "social.instagram", label: "Instagram" },
      { key: "social.tiktok", label: "TikTok" },
      { key: "social.youtube", label: "YouTube" },
    ],
  },
  {
    title: "About us",
    fields: [
      { key: "about.intro", label: "Introduction", long: true },
      { key: "about.mission", label: "Mission", long: true },
      { key: "about.vision", label: "Vision", long: true },
      { key: "about.purpose", label: "Our purpose", long: true },
      { key: "about.approach", label: "Approach to academic testing", long: true },
      { key: "about.transparency", label: "Commitment to transparency", long: true },
      { key: "about.impact", label: "Social impact", long: true },
      { key: "about.future", label: "Long-term ambition", long: true },
    ],
  },
  {
    title: "Payments",
    fields: [{ key: "payment.manualInstructions", label: "Manual transfer instructions (account details)", long: true }],
  },
];

export default async function ContentSettingsPage() {
  await requireStaff("content.manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Website content management" description="Edit public texts without touching code. Changes go live immediately." />
      <ContentTabs active="settings" />
      <div className="max-w-4xl space-y-6">
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} description={g.description} />
            <CardBody>
              <ActionForm action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <Field key={f.key} label={f.label} name={f.key} className={f.long ? "sm:col-span-2" : ""}>
                    {f.long ? <Textarea id={f.key} name={f.key} rows={3} defaultValue={s[f.key]} /> : <Input id={f.key} name={f.key} defaultValue={s[f.key]} />}
                  </Field>
                ))}
                <div className="sm:col-span-2">
                  <SubmitButton size="sm">Save {g.title.toLowerCase()}</SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        ))}
        <Card>
          <CardHeader title="Home page statistics" />
          <CardBody>
            <ActionForm action={saveSettingsAction} className="space-y-4">
              <input type="hidden" name="__bool_home.showLiveRegistrationCount" value="1" />
              <CheckboxField
                name="home.showLiveRegistrationCount"
                defaultChecked={s["home.showLiveRegistrationCount"] === "true"}
                label="Show the live number of confirmed registrations next to the registration target"
                hint="Off by default. When on, the count is read from the database — never typed in."
              />
              <SubmitButton size="sm">Save</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
