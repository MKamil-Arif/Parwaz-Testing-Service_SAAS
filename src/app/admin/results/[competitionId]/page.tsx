import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, Download, Flag } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { ATTEMPT_STATUS, RESULT_STATUS, RESULTS_STATUS, TICKET_CATEGORY, label } from "@/lib/constants";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { finalizeExpiredAttempts } from "@/lib/exam/engine";
import {
  allocatePrizesAction,
  approveMeritListAction,
  bulkVerifyAction,
  correctAnswerKeyAction,
  generateMeritListAction,
  publishResultsAction,
  setResultStatusAction,
  unpublishResultsAction,
} from "@/actions/admin/results";
import { PageHeader, Table, THead, TH, TR, TD, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Competition results" };

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border p-4", done ? "border-emerald-200 bg-emerald-50/50" : "border-navy-100 bg-white")}>
      <p className="flex items-center gap-2 text-sm font-bold">
        {done ? <CircleCheck className="size-4 text-emerald-600" /> : <span className="grid size-5 place-items-center rounded-full bg-navy-900 text-[11px] text-white">{n}</span>}
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm text-navy-600">{children}</div>
    </div>
  );
}

export default async function CompetitionResultsPage({ params, searchParams }: { params: Promise<{ competitionId: string }>; searchParams: Promise<{ filter?: string }> }) {
  const session = await requireStaff("results.manage");
  const { competitionId } = await params;
  const { filter } = await searchParams;
  const comp = await db.competition.findUnique({ where: { id: Number(competitionId) || 0 }, include: { prizes: true } });
  if (!comp) notFound();
  if (new Date() > comp.examEndsAt) await finalizeExpiredAttempts(comp.id);

  const canApprove = hasPermission(session.user.roles, "results.approve");
  const canPrizes = hasPermission(session.user.roles, "prizes.manage");
  const [results, inProgress, disputes, pool, allocations] = await Promise.all([
    db.examResult.findMany({
      where: {
        attempt: { registration: { competitionId: comp.id } },
        ...(filter === "flagged" ? { attempt: { flagCount: { gt: 0 }, registration: { competitionId: comp.id } } } : {}),
        ...(filter && filter !== "flagged" ? { status: filter } : {}),
      },
      include: { attempt: { include: { registration: { include: { user: { include: { profile: true } } } } } }, prizeAllocation: { include: { prize: true } } },
      orderBy: [{ meritRank: "asc" }, { score: "desc" }],
    }),
    db.examAttempt.count({ where: { status: ATTEMPT_STATUS.IN_PROGRESS, registration: { competitionId: comp.id } } }),
    db.supportTicket.findMany({ where: { competitionId: comp.id, category: TICKET_CATEGORY.RESULT_DISPUTE }, orderBy: { createdAt: "desc" } }),
    db.question.findMany({ where: { competitions: { some: { competitionId: comp.id } }, type: "MCQ" }, include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { id: "asc" } }),
    db.prizeAllocation.count({ where: { prize: { competitionId: comp.id } } }),
  ]);
  const all = await db.examResult.groupBy({ by: ["status"], _count: { _all: true }, where: { attempt: { status: { not: ATTEMPT_STATUS.VOIDED }, registration: { competitionId: comp.id } } } });
  const n = (s: string) => all.find((x) => x.status === s)?._count._all ?? 0;
  const unresolved = n(RESULT_STATUS.PROVISIONAL) + n(RESULT_STATUS.PENDING_REVIEW);
  const rs = comp.resultsStatus;
  const windowClosed = new Date() > comp.examEndsAt;
  const editable = rs === RESULTS_STATUS.PENDING || rs === RESULTS_STATUS.DRAFT;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Results: ${comp.title}`}
        back={{ href: "/admin/results", label: "Results & merit lists" }}
        actions={
          <>
            <StatusBadge status={rs} />
            <a href={`/api/admin/export/results?competitionId=${comp.id}`} className={buttonClasses("secondary", "sm")}>
              <Download className="size-4" /> Export
            </a>
            {rs === RESULTS_STATUS.PUBLISHED && (
              <Link href={`/competitions/${comp.slug}/leaderboard`} target="_blank" className={buttonClasses("secondary", "sm")}>
                Public merit list
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Step n={1} title="Examination closed" done={windowClosed && inProgress === 0}>
          <p>{windowClosed ? `Window closed ${formatDateTime(comp.examEndsAt)}.` : `Closes ${formatDateTime(comp.examEndsAt)}.`}</p>
          {inProgress > 0 && <p className="text-amber-700">{inProgress} attempt(s) in progress.</p>}
        </Step>
        <Step n={2} title="Verify results" done={unresolved === 0 && n(RESULT_STATUS.VERIFIED) > 0}>
          <p>
            {n(RESULT_STATUS.VERIFIED)} verified · {unresolved} to review · {n(RESULT_STATUS.WITHHELD) + n(RESULT_STATUS.DISQUALIFIED)} excluded
          </p>
          {editable && unresolved > 0 && (
            <ActionForm action={bulkVerifyAction} compact className="flex flex-col gap-1">
              <input type="hidden" name="competitionId" value={comp.id} />
              <SubmitButton size="xs" variant="secondary">Verify all unflagged</SubmitButton>
            </ActionForm>
          )}
        </Step>
        <Step n={3} title="Generate merit list" done={rs !== RESULTS_STATUS.PENDING}>
          <p>{comp.meritGeneratedAt ? `Generated ${formatDateTime(comp.meritGeneratedAt)}` : "Applies the published tie-break rules."}</p>
          {editable && (
            <ActionForm action={generateMeritListAction} compact className="flex flex-col gap-1">
              <input type="hidden" name="competitionId" value={comp.id} />
              <SubmitButton size="xs">{rs === RESULTS_STATUS.DRAFT ? "Regenerate" : "Generate draft"}</SubmitButton>
            </ActionForm>
          )}
        </Step>
        <Step n={4} title="Approve & allocate prizes" done={rs === RESULTS_STATUS.APPROVED || rs === RESULTS_STATUS.PUBLISHED}>
          <p>{comp.resultsApprovedAt ? `Approved ${formatDateTime(comp.resultsApprovedAt)}` : "Requires an administrator."}</p>
          {rs === RESULTS_STATUS.DRAFT && canApprove && (
            <ActionForm action={approveMeritListAction} compact className="flex flex-col gap-1">
              <input type="hidden" name="competitionId" value={comp.id} />
              <SubmitButton size="xs" confirm="Approve this merit list as final?">Approve merit list</SubmitButton>
            </ActionForm>
          )}
          {(rs === RESULTS_STATUS.APPROVED || rs === RESULTS_STATUS.PUBLISHED) && canPrizes && (
            <ActionForm action={allocatePrizesAction} compact className="flex flex-col gap-1">
              <input type="hidden" name="competitionId" value={comp.id} />
              <SubmitButton size="xs" variant="gold">{allocations ? `Allocate missing (${allocations} done)` : "Allocate prizes"}</SubmitButton>
            </ActionForm>
          )}
        </Step>
        <Step n={5} title="Publish" done={rs === RESULTS_STATUS.PUBLISHED}>
          <p>{comp.resultsPublishedAt ? `Published ${formatDateTime(comp.resultsPublishedAt)}` : "Students are notified on publication."}</p>
          {rs === RESULTS_STATUS.APPROVED && canApprove && (
            <ActionForm action={publishResultsAction} compact className="flex flex-col gap-1">
              <input type="hidden" name="competitionId" value={comp.id} />
              <SubmitButton size="xs" confirm="Publish results now? All participants will be notified.">Publish results</SubmitButton>
            </ActionForm>
          )}
        </Step>
      </div>

      {(rs === RESULTS_STATUS.APPROVED || rs === RESULTS_STATUS.PUBLISHED) && canApprove && (
        <details className="rounded-2xl border border-red-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-red-700">Unpublish / reopen for corrections</summary>
          <ActionForm action={unpublishResultsAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="competitionId" value={comp.id} />
            <Field label="Reason (recorded in the audit log)" name="reason" className="min-w-72 flex-1">
              <Input id="reason" name="reason" required minLength={10} />
            </Field>
            <SubmitButton variant="danger" confirm="Move results back to draft?">Reopen</SubmitButton>
          </ActionForm>
        </details>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={`Submissions (${results.length})`}
          action={
            <div className="flex flex-wrap gap-1 text-xs">
              {[
                ["", "All"],
                ["PROVISIONAL", "Provisional"],
                ["PENDING_REVIEW", "Needs marking"],
                ["VERIFIED", "Verified"],
                ["WITHHELD", "Withheld"],
                ["DISQUALIFIED", "Disqualified"],
                ["flagged", "Flagged"],
              ].map(([k, l]) => (
                <Link key={k} href={`/admin/results/${comp.id}${k ? `?filter=${k}` : ""}`} className={cn("rounded-full px-2.5 py-1 font-semibold ring-1", (filter ?? "") === k ? "bg-navy-950 text-white ring-navy-950" : "text-navy-600 ring-navy-200")}>
                  {l}
                </Link>
              ))}
            </div>
          }
        />
        <Table>
          <THead>
            <tr>
              <TH>Rank</TH>
              <TH>Student</TH>
              <TH className="text-right">Score</TH>
              <TH className="text-right">C / I / U</TH>
              <TH>Time</TH>
              <TH>Flags</TH>
              <TH>Status</TH>
              <TH>Prize</TH>
              <TH>Review</TH>
            </tr>
          </THead>
          <tbody>
            {results.map((r) => (
              <TR key={r.id}>
                <TD className="font-bold">{r.meritRank ? `#${r.meritRank}` : "—"}</TD>
                <TD>
                  <Link href={`/admin/exams/${r.attemptId}`} className="font-semibold text-navy-950 hover:text-brand-700">
                    {r.attempt.registration.user.fullName}
                  </Link>
                  <p className="text-xs text-navy-500">
                    {r.attempt.registration.user.profile?.district} · {r.attempt.registration.registrationNumber}
                  </p>
                </TD>
                <TD className="text-right font-semibold tabular-nums">
                  {formatNumber(r.score, 2)}/{formatNumber(r.maxScore, 2)}
                </TD>
                <TD className="text-right text-xs tabular-nums">
                  {r.correctCount}/{r.incorrectCount}/{r.unansweredCount}
                </TD>
                <TD className="text-xs">{formatDuration(r.timeTakenSeconds)}</TD>
                <TD>{r.attempt.flagCount > 0 ? <Badge tone="violet"><Flag className="size-3" />{r.attempt.flagCount}</Badge> : "—"}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                  {r.attempt.status === ATTEMPT_STATUS.VOIDED && <Badge tone="red" className="ml-1">Voided</Badge>}
                </TD>
                <TD>{r.prizeAllocation ? <Badge tone="gold">{r.prizeAllocation.prize.title} · {label(r.prizeAllocation.status)}</Badge> : "—"}</TD>
                <TD>
                  {editable && r.attempt.status !== ATTEMPT_STATUS.VOIDED && (
                    <ActionForm action={setResultStatusAction} compact className="flex min-w-56 flex-col gap-1">
                      <input type="hidden" name="resultId" value={r.id} />
                      <Input name="reason" placeholder="Reason (required unless verifying)" className="h-8 py-1 text-xs" />
                      <div className="flex flex-wrap gap-1">
                        {r.status !== RESULT_STATUS.VERIFIED && <SubmitButton size="xs" name="status" value="VERIFIED">Verify</SubmitButton>}
                        {r.status !== RESULT_STATUS.WITHHELD && <SubmitButton size="xs" variant="secondary" name="status" value="WITHHELD">Withhold</SubmitButton>}
                        {r.status !== RESULT_STATUS.DISQUALIFIED && <SubmitButton size="xs" variant="danger-soft" name="status" value="DISQUALIFIED" confirm="Disqualify this result?">Disqualify</SubmitButton>}
                        {(r.status === RESULT_STATUS.WITHHELD || r.status === RESULT_STATUS.DISQUALIFIED) && <SubmitButton size="xs" variant="ghost" name="status" value="PROVISIONAL">Restore</SubmitButton>}
                      </div>
                    </ActionForm>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        {results.length === 0 && <p className="p-6 text-sm text-navy-500">No submissions match.</p>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Result disputes" description="Students raise disputes from their result page. Reply and resolve them in Support." />
          {disputes.length === 0 ? (
            <CardBody>
              <p className="text-sm text-navy-500">No disputes.</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-navy-100 text-sm">
              {disputes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/admin/support/${t.id}`} className="font-semibold text-brand-700">
                    {t.ticketNumber} · {t.name}
                  </Link>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Correct an answer key" description="If a question's key was wrong, fix it here — every affected attempt is re-graded and logged." />
          <CardBody>
            {!editable || !canApprove ? (
              <Alert tone="info">{!canApprove ? "Requires an administrator." : "Reopen the results to make corrections."}</Alert>
            ) : (
              <ActionForm action={correctAnswerKeyAction} className="space-y-3">
                <input type="hidden" name="competitionId" value={comp.id} />
                <Field label="Question" name="questionId">
                  <Select id="questionId" name="questionId" required placeholder="Select question" defaultValue="" options={pool.map((q) => ({ value: String(q.id), label: `#${q.id} ${q.text.slice(0, 70)}` }))} />
                </Field>
                <Field label="Correct option ID" name="optionId" hint={pool.length ? "Option IDs are listed below for the chosen question." : undefined}>
                  <Input id="optionId" name="optionId" type="number" required />
                </Field>
                <details className="max-h-40 overflow-y-auto rounded-lg bg-navy-50 p-2 text-xs">
                  <summary className="cursor-pointer font-semibold">Option IDs</summary>
                  {pool.map((q) => (
                    <p key={q.id} className="mt-1">
                      #{q.id}: {q.options.map((o) => `${o.id}=${o.text.slice(0, 24)}${o.isCorrect ? " ✓" : ""}`).join(" · ")}
                    </p>
                  ))}
                </details>
                <Field label="Reason" name="reason">
                  <Textarea id="reason" name="reason" rows={2} required minLength={10} />
                </Field>
                <SubmitButton variant="secondary" confirm="Change the answer key and re-grade all affected attempts?">Correct & re-grade</SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
