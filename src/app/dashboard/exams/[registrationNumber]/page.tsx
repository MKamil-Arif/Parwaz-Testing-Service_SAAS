import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, CircleX, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { readinessChecks } from "@/lib/exam/engine";
import { ATTEMPT_STATUS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { startExamAction } from "@/actions/student";
import { PageHeader, Alert, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Examination" };

export default async function ExamStartPage({ params }: { params: Promise<{ registrationNumber: string }> }) {
  const { registrationNumber } = await params;
  const { user } = await requireStudent();
  const reg = await db.competitionRegistration.findUnique({
    where: { registrationNumber },
    include: { competition: true, attempts: { include: { result: true }, orderBy: { attemptNumber: "desc" } }, user: { include: { profile: true } } },
  });
  if (!reg || reg.userId !== user.id) notFound();
  const c = reg.competition;
  const inProgress = reg.attempts.find((a) => a.status === ATTEMPT_STATUS.IN_PROGRESS && a.expiresAt > new Date());
  const used = reg.attempts.filter((a) => a.status !== ATTEMPT_STATUS.VOIDED);
  const submitted = used.find((a) => a.submittedAt);

  const checks = readinessChecks({
    registrationStatus: reg.status,
    emailVerified: !!reg.user.emailVerifiedAt,
    dateOfBirth: reg.user.profile?.dateOfBirth ?? null,
    guardianConsentAt: reg.user.profile?.guardianConsentAt ?? null,
    examStartsAt: c.examStartsAt,
    examEndsAt: c.examEndsAt,
    durationMinutes: c.durationMinutes,
    usedAttempts: used.length,
    maxAttempts: c.maxAttempts,
    hasInProgress: !!inProgress,
  });
  const ready = checks.every((ch) => ch.ok);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={c.title} description={`Registration ${reg.registrationNumber}`} back={{ href: "/dashboard/exams", label: "My examinations" }} />

      {submitted && (
        <Alert tone="success" title="Examination submitted">
          You submitted on {formatDateTime(submitted.submittedAt)} ({submitted.submissionType === "AUTO_TIMEOUT" ? "auto-submitted when time ended" : "submitted by you"}).
          {c.showInstantResults && submitted.result
            ? ` Practice score: ${formatNumber(submitted.result.score, 2)} / ${formatNumber(submitted.result.maxScore, 2)}.`
            : " Results will be published after verification."}
          {submitted.result && (c.showInstantResults || c.resultsStatus === "PUBLISHED") && (
            <>
              {" "}
              <Link href={`/dashboard/results/${submitted.result.id}`} className="font-semibold underline">
                View result
              </Link>
            </>
          )}
        </Alert>
      )}

      <Card>
        <CardHeader title="Examination information" />
        <CardBody>
          <DescriptionList
            items={[
              { label: "Window", value: `${formatDateTime(c.examStartsAt)} – ${formatDateTime(c.examEndsAt)}` },
              { label: "Duration", value: `${c.durationMinutes} minutes (server-timed)` },
              { label: "Questions", value: `${c.questionCount} multiple-choice` },
              { label: "Marking", value: `${formatNumber(c.totalMarks, 2)} marks${c.negativeMarking ? ` · −${c.negativeMarking} per wrong answer` : " · no negative marking"}` },
              { label: "Attempts allowed", value: String(c.maxAttempts) },
              { label: "Attempt history", value: reg.attempts.length ? reg.attempts.map((a) => `#${a.attemptNumber}`).join(", ") : "None yet" },
            ]}
          />
          {reg.attempts.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {reg.attempts.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  Attempt #{a.attemptNumber} · started {formatDateTime(a.startedAt)} <StatusBadge status={a.status} />
                  {a.voidReason && <span className="text-xs text-navy-500">({a.voidReason})</span>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Instructions" />
        <CardBody>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-navy-700">
            <li>The timer starts when you begin and is controlled by our server. It does not pause if you close the page.</li>
            <li>Your answers are saved automatically after every change. If your internet drops, keep going — answers sync on reconnection.</li>
            <li>Use <strong>Mark for review</strong> to flag questions and the question palette to jump between them.</li>
            <li>When time ends, your exam is submitted automatically. You can also submit early.</li>
            <li>Do not switch tabs, copy questions, or open the exam on another device — these events are logged for review.</li>
            <li>You must work alone, without books, notes, other people or AI tools.</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Readiness checks" />
        <CardBody>
          <ul className="space-y-2">
            {checks.map((ch) => (
              <li key={ch.label} className="flex items-start gap-2.5 text-sm">
                {ch.ok ? <CircleCheck className="mt-0.5 size-4 text-emerald-600" /> : <CircleX className="mt-0.5 size-4 text-red-600" />}
                <span>
                  <span className="font-semibold">{ch.label}:</span> {ch.detail}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {inProgress ? (
        <Link href={`/exam/${inProgress.publicId}`} className={buttonClasses("gold", "lg", "w-full")}>
          Resume your examination
        </Link>
      ) : ready ? (
        <Card className="border-brand-200">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-brand-700" /> Identity verification
              </span>
            }
            description="Confirm your identity to begin. The timer starts as soon as you continue."
          />
          <CardBody>
            <ActionForm action={startExamAction} className="space-y-4">
              <input type="hidden" name="registrationId" value={reg.id} />
              <p className="text-sm text-navy-700">
                Candidate: <strong>{reg.user.fullName}</strong> · {reg.user.profile?.institution}
              </p>
              <Field label="Confirm your date of birth" name="dateOfBirth" required>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required className="max-w-xs" />
              </Field>
              <CheckboxField
                name="declaration"
                required
                label={`I am ${reg.user.fullName}. I will attempt this examination myself, alone, without help from any person, material, device or AI tool, and I accept that suspicious activity may lead to disqualification.`}
              />
              <SubmitButton size="lg" pendingText="Preparing your paper…">
                Begin examination
              </SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
