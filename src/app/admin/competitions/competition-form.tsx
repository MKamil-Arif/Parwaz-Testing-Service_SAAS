import { saveCompetitionAction } from "@/actions/admin/competitions";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CLASS_LEVELS } from "@/lib/constants";
import { toPKTInput } from "@/lib/format";
import { DEFAULT_TIE_BREAK_POLICY } from "@/lib/exam/ranking";

type CompetitionLike = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  subjects: string;
  eligibilityText: string;
  rules: string;
  tieBreakPolicy: string;
  eligibleProvince: string | null;
  minAge: number | null;
  maxAge: number | null;
  registrationFee: unknown;
  targetRegistrations: number | null;
  maxRegistrations: number | null;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  examStartsAt: Date;
  examEndsAt: Date;
  durationMinutes: number;
  questionCount: number;
  marksPerQuestion: number | null;
  negativeMarking: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showInstantResults: boolean;
  isDemo: boolean;
  eligibleClasses: { classLevel: string }[];
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="grid gap-4 sm:grid-cols-2">{children}</CardBody>
    </Card>
  );
}

export function CompetitionForm({ c }: { c?: CompetitionLike }) {
  const classes = new Set(c?.eligibleClasses.map((e) => e.classLevel) ?? CLASS_LEVELS.map((x) => x.value));
  return (
    <ActionForm action={saveCompetitionAction} className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Section title="Basics">
        <Field label="Title" name="title" required className="sm:col-span-2">
          <Input id="title" name="title" defaultValue={c?.title} required />
        </Field>
        <Field label="URL slug" name="slug" hint="Leave blank to generate from the title">
          <Input id="slug" name="slug" defaultValue={c?.slug} placeholder="sindh-academic-challenge" />
        </Field>
        <Field label="Subjects (comma separated)" name="subjects" required>
          <Input id="subjects" name="subjects" defaultValue={c?.subjects ?? "Mathematics, Physics, Chemistry, Biology, English, General Knowledge"} required />
        </Field>
        <Field label="Short summary" name="summary" required className="sm:col-span-2">
          <Textarea id="summary" name="summary" rows={2} defaultValue={c?.summary} required maxLength={500} />
        </Field>
        <Field label="Full description (Markdown)" name="description" required className="sm:col-span-2">
          <Textarea id="description" name="description" rows={6} defaultValue={c?.description} required />
        </Field>
      </Section>

      <Section title="Eligibility">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-navy-800">Eligible classes</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLASS_LEVELS.map((cl) => (
              <label key={cl.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="eligibleClasses" value={cl.value} defaultChecked={classes.has(cl.value)} className="size-4 accent-brand-600" />
                {cl.label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Province restriction" name="eligibleProvince">
          <Select id="eligibleProvince" name="eligibleProvince" defaultValue={c ? (c.eligibleProvince ?? "") : "Sindh"} options={[{ value: "", label: "No restriction" }, { value: "Sindh", label: "Students in Sindh only" }]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min age" name="minAge">
            <Input id="minAge" name="minAge" type="number" min={0} defaultValue={c?.minAge ?? ""} />
          </Field>
          <Field label="Max age" name="maxAge">
            <Input id="maxAge" name="maxAge" type="number" min={0} defaultValue={c?.maxAge ?? ""} />
          </Field>
        </div>
        <Field label="Eligibility criteria (Markdown)" name="eligibilityText" required className="sm:col-span-2">
          <Textarea id="eligibilityText" name="eligibilityText" rows={4} defaultValue={c?.eligibilityText} required />
        </Field>
      </Section>

      <Section title="Fees & dates" description="Times are Pakistan Standard Time (PKT).">
        <Field label="Registration fee (PKR)" name="registrationFee" required hint="0 = free (registration confirms immediately)">
          <Input id="registrationFee" name="registrationFee" type="number" min={0} step="1" defaultValue={c ? Number(c.registrationFee) : 500} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration target" name="targetRegistrations" hint="Shown as a target">
            <Input id="targetRegistrations" name="targetRegistrations" type="number" min={0} defaultValue={c?.targetRegistrations ?? ""} />
          </Field>
          <Field label="Max registrations" name="maxRegistrations" hint="Blank = no cap">
            <Input id="maxRegistrations" name="maxRegistrations" type="number" min={0} defaultValue={c?.maxRegistrations ?? ""} />
          </Field>
        </div>
        <Field label="Registration opens" name="registrationOpensAt" required>
          <Input id="registrationOpensAt" name="registrationOpensAt" type="datetime-local" defaultValue={toPKTInput(c?.registrationOpensAt)} required />
        </Field>
        <Field label="Registration closes" name="registrationClosesAt" required>
          <Input id="registrationClosesAt" name="registrationClosesAt" type="datetime-local" defaultValue={toPKTInput(c?.registrationClosesAt)} required />
        </Field>
        <Field label="Exam window opens" name="examStartsAt" required>
          <Input id="examStartsAt" name="examStartsAt" type="datetime-local" defaultValue={toPKTInput(c?.examStartsAt)} required />
        </Field>
        <Field label="Exam window closes" name="examEndsAt" required>
          <Input id="examEndsAt" name="examEndsAt" type="datetime-local" defaultValue={toPKTInput(c?.examEndsAt)} required />
        </Field>
      </Section>

      <Section title="Examination settings">
        <Field label="Duration (minutes)" name="durationMinutes" required>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={5} defaultValue={c?.durationMinutes ?? 90} required />
        </Field>
        <Field label="Questions per student" name="questionCount" required>
          <Input id="questionCount" name="questionCount" type="number" min={1} defaultValue={c?.questionCount ?? 100} required />
        </Field>
        <Field label="Marks per question" name="marksPerQuestion" hint="Blank = use each question's own marks (pool must then have equal marks if randomly sampled)">
          <Input id="marksPerQuestion" name="marksPerQuestion" type="number" min={0} step="0.25" defaultValue={c ? (c.marksPerQuestion ?? "") : 1} />
        </Field>
        <Field label="Negative marking per wrong answer" name="negativeMarking">
          <Input id="negativeMarking" name="negativeMarking" type="number" min={0} step="0.25" defaultValue={c?.negativeMarking ?? 0} />
        </Field>
        <Field label="Attempts allowed" name="maxAttempts">
          <Input id="maxAttempts" name="maxAttempts" type="number" min={1} max={5} defaultValue={c?.maxAttempts ?? 1} />
        </Field>
        <div className="space-y-3 sm:col-span-2">
          <CheckboxField name="randomizeQuestions" defaultChecked={c?.randomizeQuestions ?? true} label="Randomize question order (and sample from a larger pool)" />
          <CheckboxField name="randomizeOptions" defaultChecked={c?.randomizeOptions ?? true} label="Randomize answer option order" />
          <CheckboxField name="showInstantResults" defaultChecked={c?.showInstantResults ?? false} label="Show scores immediately after submission (practice rounds only — no ranking)" />
          <CheckboxField name="isDemo" defaultChecked={c?.isDemo ?? false} label="This is a demo / practice competition (labelled as such everywhere)" />
        </div>
      </Section>

      <Section title="Rules" description="Publish these before registration opens. Markdown supported.">
        <Field label="Rules and regulations" name="rules" required className="sm:col-span-2">
          <Textarea id="rules" name="rules" rows={8} defaultValue={c?.rules} required />
        </Field>
        <Field label="Ranking & tie-breaking rules" name="tieBreakPolicy" required className="sm:col-span-2" hint="The merit list applies: score ↓, incorrect answers ↑, time taken ↑, submission time ↑, registration time ↑.">
          <Textarea id="tieBreakPolicy" name="tieBreakPolicy" rows={8} defaultValue={c?.tieBreakPolicy ?? DEFAULT_TIE_BREAK_POLICY} required />
        </Field>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <SubmitButton size="lg" className="shadow-lift">
          {c ? "Save changes" : "Create competition"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
