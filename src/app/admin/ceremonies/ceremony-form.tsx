import { saveCeremonyAction } from "@/actions/admin/ceremonies";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { toPKTInput } from "@/lib/format";

type C = { id: number; title: string; slug: string; city: string; venue: string; eventDate: Date; description: string; status: string; competitionId: number | null };

export function CeremonyForm({ c, competitions }: { c?: C; competitions: { id: number; title: string }[] }) {
  return (
    <ActionForm action={saveCeremonyAction} className="grid gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Event title" name="title" className="sm:col-span-2">
        <Input id="title" name="title" defaultValue={c?.title} required />
      </Field>
      <Field label="URL slug" name="slug">
        <Input id="slug" name="slug" defaultValue={c?.slug} required placeholder="hyderabad-2027" />
      </Field>
      <Field label="City" name="city">
        <Input id="city" name="city" defaultValue={c?.city} required />
      </Field>
      <Field label="Venue" name="venue">
        <Input id="venue" name="venue" defaultValue={c?.venue} required />
      </Field>
      <Field label="Date & time (PKT)" name="eventDate">
        <Input id="eventDate" name="eventDate" type="datetime-local" defaultValue={toPKTInput(c?.eventDate)} required />
      </Field>
      <Field label="Competition" name="competitionId">
        <Select id="competitionId" name="competitionId" placeholder="—" defaultValue={c?.competitionId ? String(c.competitionId) : ""} options={competitions.map((x) => ({ value: String(x.id), label: x.title }))} />
      </Field>
      <Field label="Status" name="status">
        <Select id="status" name="status" defaultValue={c?.status ?? "DRAFT"} options={[{ value: "DRAFT", label: "Draft (hidden)" }, { value: "PUBLISHED", label: "Published" }]} />
      </Field>
      <Field label="Description (Markdown)" name="description" className="sm:col-span-2">
        <Textarea id="description" name="description" defaultValue={c?.description} rows={6} required />
      </Field>
      <div className="sm:col-span-2">
        <CheckboxField name="notifyStudents" label="Notify all students about this ceremony (only when published)" />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>{c ? "Save ceremony" : "Create ceremony"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
