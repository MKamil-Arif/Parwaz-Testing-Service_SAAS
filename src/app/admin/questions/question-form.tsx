"use client";

import { useState } from "react";
import { saveQuestionAction } from "@/actions/admin/questions";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";

type Q = {
  id: number;
  categoryId: number;
  type: string;
  text: string;
  explanation: string | null;
  difficulty: string;
  marks: number;
  options: { text: string; isCorrect: boolean }[];
};

export function QuestionForm({ q, categories, locked }: { q?: Q; categories: { id: number; name: string }[]; locked?: boolean }) {
  const [type, setType] = useState(q?.type ?? "MCQ");
  const correctIdx = q?.options.findIndex((o) => o.isCorrect) ?? -1;
  const [correct, setCorrect] = useState(correctIdx >= 0 ? "ABCD"[correctIdx] : "");
  return (
    <ActionForm action={saveQuestionAction} resetOnSuccess={!q} className="grid gap-4 sm:grid-cols-3">
      {q && <input type="hidden" name="id" value={q.id} />}
      <Field label="Category" name="categoryId" required>
        <Select id="categoryId" name="categoryId" required defaultValue={q ? String(q.categoryId) : ""} placeholder="Select…" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
      </Field>
      <Field label="Type" name="type">
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: "MCQ", label: "Multiple choice (auto-marked)" },
            { value: "SHORT_ANSWER", label: "Short answer (manual review)" },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Difficulty" name="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue={q?.difficulty ?? "MEDIUM"} options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]} />
        </Field>
        <Field label="Marks" name="marks">
          <Input id="marks" name="marks" type="number" step="0.25" min={0.25} defaultValue={q?.marks ?? 1} required />
        </Field>
      </div>
      <Field label="Question" name="text" required className="sm:col-span-3">
        <Textarea id="text" name="text" rows={3} defaultValue={q?.text} required />
      </Field>
      {type === "MCQ" && (
        <div className="space-y-3 sm:col-span-3">
          <p className="text-sm font-medium text-navy-800">Answer options — select the correct one</p>
          {(["A", "B", "C", "D"] as const).map((L, i) => (
            <div key={L} className={cn("flex items-start gap-3 rounded-xl p-2 ring-1", correct === L ? "bg-emerald-50 ring-emerald-300" : "ring-transparent")}>
              <label className="mt-2.5 flex items-center gap-2 text-sm font-bold">
                <input type="radio" name="correct" value={L} checked={correct === L} onChange={() => setCorrect(L)} className="size-4 accent-emerald-600" />
                {L}
              </label>
              <Field label={<span className="sr-only">Option {L}</span>} name={`option${L}`} className="flex-1">
                <Input id={`option${L}`} name={`option${L}`} defaultValue={q?.options[i]?.text} required placeholder={`Option ${L}`} />
              </Field>
            </div>
          ))}
        </div>
      )}
      <Field label="Explanation (optional, for reviewers)" name="explanation" className="sm:col-span-3">
        <Textarea id="explanation" name="explanation" rows={2} defaultValue={q?.explanation ?? ""} />
      </Field>
      {!locked && (
        <div className="flex flex-wrap gap-3 sm:col-span-3">
          <SubmitButton>{q ? "Save question" : "Save question"}</SubmitButton>
          {!q && (
            <SubmitButton variant="secondary" name="addAnother" value="1">
              Save & add another
            </SubmitButton>
          )}
        </div>
      )}
    </ActionForm>
  );
}
