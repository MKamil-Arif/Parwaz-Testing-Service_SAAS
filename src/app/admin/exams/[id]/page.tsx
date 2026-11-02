import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, CircleX, CircleMinus } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ATTEMPT_STATUS, FLAGGED_ACTIVITY, QUESTION_TYPE, label } from "@/lib/constants";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { forceSubmitAttemptAction, gradeAnswerAction, voidAttemptAction } from "@/actions/admin/operations";
import { PageHeader, DescriptionList, Table, THead, TH, TR, TD, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Textarea } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Examination attempt" };

export default async function AttemptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("exams.manage");
  const { id } = await params;
  const a = await db.examAttempt.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      registration: { include: { user: { include: { profile: true } }, competition: true } },
      result: { include: { changeLogs: { orderBy: { createdAt: "desc" } } } },
      activityLogs: { orderBy: { createdAt: "asc" } },
      answers: { orderBy: { position: "asc" }, include: { question: { include: { options: true } }, selectedOption: true } },
    },
  });
  if (!a) notFound();
  const c = a.registration.competition;
  const pendingManual = a.answers.filter((x) => x.question.type === QUESTION_TYPE.SHORT_ANSWER && x.textAnswer && !x.reviewedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${a.registration.user.fullName} — attempt #${a.attemptNumber}`}
        description={`${c.title} · ${a.registration.registrationNumber}`}
        back={{ href: "/admin/exams", label: "Examinations" }}
        actions={
          <>
            <StatusBadge status={a.status} />
            {a.status === ATTEMPT_STATUS.IN_PROGRESS && (
              <form action={forceSubmitAttemptAction.bind(null, a.id)}>
                <button type="submit" className={buttonClasses("secondary", "sm")}>Force submit now</button>
              </form>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Attempt" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Identity confirmed", value: formatDateTime(a.identityConfirmedAt) },
                { label: "Started", value: formatDateTime(a.startedAt) },
                { label: "Server deadline", value: formatDateTime(a.expiresAt) },
                { label: "Submitted", value: a.submittedAt ? `${formatDateTime(a.submittedAt)} (${label(a.submissionType)})` : "—" },
                { label: "Last autosave", value: formatDateTime(a.lastSavedAt) },
                { label: "IP / device", value: <span className="text-xs">{a.ipAddress} · {a.userAgent?.slice(0, 80)}</span> },
                { label: "Result", value: a.result ? `${formatNumber(a.result.score, 2)}/${formatNumber(a.result.maxScore, 2)} (${a.result.percentage}%) · ${label(a.result.status)}` : "—" },
                { label: "Time taken", value: a.result ? formatDuration(a.result.timeTakenSeconds) : "—" },
              ]}
            />
            {a.voidReason && <Alert tone="error" className="mt-4">Voided: {a.voidReason}</Alert>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={`Integrity log (${a.flagCount} flag${a.flagCount === 1 ? "" : "s"})`} description="Signals for human review only — they never disqualify automatically." />
          <ul className="max-h-80 divide-y divide-navy-100 overflow-y-auto text-sm">
            {a.activityLogs.length === 0 && <li className="px-5 py-4 text-navy-500">No events recorded.</li>}
            {a.activityLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2">
                <span>
                  <Badge tone={FLAGGED_ACTIVITY.includes(l.eventType) ? "violet" : "neutral"}>{label(l.eventType)}</Badge>
                  {l.details && <span className="ml-2 text-xs text-navy-500">{l.details}</span>}
                </span>
                <span className="text-xs whitespace-nowrap text-navy-500">{formatDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {pendingManual.length > 0 && (
        <Card className="border-gold-300">
          <CardHeader title={`Written answers to mark (${pendingManual.length})`} />
          <CardBody className="space-y-6">
            {pendingManual.map((x) => (
              <div key={x.id} className="rounded-xl bg-navy-50/60 p-4">
                <p className="text-sm font-semibold">Q{x.position}. {x.question.text}</p>
                <p className="mt-2 rounded-lg bg-white p-3 text-sm whitespace-pre-wrap ring-1 ring-navy-100">{x.textAnswer}</p>
                {x.question.explanation && <p className="mt-2 text-xs text-navy-500">Marking guide: {x.question.explanation}</p>}
                <ActionForm action={gradeAnswerAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="answerId" value={x.id} />
                  <Field label={`Marks (max ${c.marksPerQuestion ?? x.question.marks})`} name="marks">
                    <Input id={`marks-${x.id}`} name="marks" type="number" step="0.25" min={0} max={c.marksPerQuestion ?? x.question.marks} required className="w-28" />
                  </Field>
                  <Field label="Note" name="note" className="flex-1">
                    <Input id={`note-${x.id}`} name="note" />
                  </Field>
                  <SubmitButton size="md">Save marks</SubmitButton>
                </ActionForm>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Answer sheet" description="Question order as served to the student." />
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Question</TH>
              <TH>Student answer</TH>
              <TH>Correct answer</TH>
              <TH>Marks</TH>
            </tr>
          </THead>
          <tbody>
            {a.answers.map((x) => (
              <TR key={x.id}>
                <TD>{x.position}</TD>
                <TD className="max-w-md">
                  <p className="line-clamp-2">{x.question.text}</p>
                  {x.markedForReview && <Badge tone="gold">Marked</Badge>}
                </TD>
                <TD className="max-w-xs">
                  <span className="flex items-start gap-1.5">
                    {x.isCorrect === true ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : x.isCorrect === false ? <CircleX className="mt-0.5 size-4 shrink-0 text-red-600" /> : <CircleMinus className="mt-0.5 size-4 shrink-0 text-navy-300" />}
                    {x.question.type === QUESTION_TYPE.SHORT_ANSWER ? <span className="line-clamp-2">{x.textAnswer ?? "—"}</span> : (x.selectedOption?.text ?? "—")}
                  </span>
                </TD>
                <TD className="max-w-xs text-navy-600">{x.question.options.find((o) => o.isCorrect)?.text ?? (x.question.type === QUESTION_TYPE.SHORT_ANSWER ? "Manual" : "—")}</TD>
                <TD>{x.marksAwarded ?? "—"}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      {a.result && a.result.changeLogs.length > 0 && (
        <Card>
          <CardHeader title="Result change history" />
          <ul className="divide-y divide-navy-100 text-sm">
            {a.result.changeLogs.map((l) => (
              <li key={l.id} className="px-5 py-2.5">
                <span className="font-semibold">{l.field}</span>: {l.oldValue} → {l.newValue} — {l.reason}
                <span className="ml-2 text-xs text-navy-500">{formatDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {a.status !== ATTEMPT_STATUS.VOIDED && (
        <Card className="border-red-200">
          <CardHeader title="Void attempt & allow re-attempt" description="Use only for verified technical failures. The current result is withheld from ranking and the change is logged." />
          <CardBody>
            <ActionForm action={voidAttemptAction} className="space-y-3">
              <input type="hidden" name="attemptId" value={a.id} />
              <Field label="Reason" name="reason">
                <Textarea id="reason" name="reason" rows={2} required minLength={10} />
              </Field>
              <SubmitButton variant="danger" confirm="Void this attempt? The student will be notified and may start again during the window.">
                Void attempt
              </SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
      <p className="text-sm">
        <Link href={`/admin/students/${a.registration.userId}`} className="font-semibold text-brand-700">View student profile →</Link>
      </p>
    </div>
  );
}
