import { saveCampaignAction } from "@/actions/admin/marketing";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CAMPAIGN_CHANNEL, CAMPAIGN_STATUS, label } from "@/lib/constants";
import { toDateInput } from "@/lib/format";

type Campaign = {
  id: number;
  name: string;
  slug: string;
  channel: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  budget: unknown;
  notes: string | null;
  landingEnabled: boolean;
  landingHeadline: string | null;
  landingBody: string | null;
  landingCompetitionId: number | null;
};

export function CampaignForm({ c, competitions }: { c?: Campaign; competitions: { id: number; title: string }[] }) {
  return (
    <ActionForm action={saveCampaignAction} resetOnSuccess={!c} className="grid gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Campaign name" name="name" className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={c?.name} required />
      </Field>
      <Field label="Tracking code" name="slug" hint="Used in links: ?utm_campaign=code or /l/code">
        <Input id="slug" name="slug" defaultValue={c?.slug} required placeholder="fb-launch-nov" />
      </Field>
      <Field label="Channel" name="channel">
        <Select id="channel" name="channel" defaultValue={c?.channel} options={Object.values(CAMPAIGN_CHANNEL).map((v) => ({ value: v, label: label(v) }))} />
      </Field>
      <Field label="Status" name="status">
        <Select id="status" name="status" defaultValue={c?.status ?? "ACTIVE"} options={Object.values(CAMPAIGN_STATUS).map((v) => ({ value: v, label: label(v) }))} />
      </Field>
      <Field label="Budget (PKR)" name="budget" hint="Actual spend is recorded as Marketing expenses">
        <Input id="budget" name="budget" type="number" min={0} defaultValue={c?.budget != null ? Number(c.budget) : ""} />
      </Field>
      <Field label="Start date" name="startDate">
        <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(c?.startDate ?? new Date())} required />
      </Field>
      <Field label="End date" name="endDate">
        <Input id="endDate" name="endDate" type="date" defaultValue={toDateInput(c?.endDate)} />
      </Field>
      <Field label="Notes" name="notes" className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={2} defaultValue={c?.notes ?? ""} />
      </Field>
      <div className="space-y-4 rounded-2xl bg-navy-50/60 p-4 sm:col-span-2">
        <CheckboxField name="landingEnabled" defaultChecked={c?.landingEnabled} label="Enable a landing page at /l/[tracking code]" />
        <Field label="Landing headline" name="landingHeadline">
          <Input id="landingHeadline" name="landingHeadline" defaultValue={c?.landingHeadline ?? ""} />
        </Field>
        <Field label="Landing content (Markdown)" name="landingBody">
          <Textarea id="landingBody" name="landingBody" rows={5} defaultValue={c?.landingBody ?? ""} />
        </Field>
        <Field label="Featured competition" name="landingCompetitionId">
          <Select id="landingCompetitionId" name="landingCompetitionId" placeholder="—" defaultValue={c?.landingCompetitionId ? String(c.landingCompetitionId) : ""} options={competitions.map((x) => ({ value: String(x.id), label: x.title }))} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>{c ? "Save campaign" : "Create campaign"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
