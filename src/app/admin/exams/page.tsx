import Link from "next/link";
import type { Metadata } from "next";
import { ListChecks, Flag } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ATTEMPT_STATUS, QUESTION_TYPE, label } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { finalizeExpiredAction } from "@/actions/admin/operations";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination, StatCard } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Examinations" };

type SP = { competitionId?: string; status?: string; flagged?: string; review?: string; page?: string };

export default async function ExamsAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("exams.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.competitionId ? { registration: { competitionId: Number(sp.competitionId) } } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.flagged ? { flagCount: { gt: 0 } } : {}),
    ...(sp.review ? { answers: { some: { question: { type: QUESTION_TYPE.SHORT_ANSWER }, reviewedAt: null, textAnswer: { not: null } } } } : {}),
  };
  const [attempts, total, competitions, inProgress, expired, flagged, needReview] = await Promise.all([
    db.examAttempt.findMany({ where, include: { registration: { include: { user: true, competition: { select: { title: true } } } }, result: true }, orderBy: { startedAt: "desc" }, ...skipTake(page) }),
    db.examAttempt.count({ where }),
    db.competition.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    db.examAttempt.count({ where: { status: ATTEMPT_STATUS.IN_PROGRESS } }),
    db.examAttempt.count({ where: { status: ATTEMPT_STATUS.IN_PROGRESS, expiresAt: { lt: new Date() } } }),
    db.examAttempt.count({ where: { flagCount: { gt: 0 } } }),
    db.studentAnswer.count({ where: { question: { type: QUESTION_TYPE.SHORT_ANSWER }, reviewedAt: null, textAnswer: { not: null }, attempt: { status: { in: [ATTEMPT_STATUS.SUBMITTED, ATTEMPT_STATUS.AUTO_SUBMITTED] } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Examination management"
        description="Monitor attempts, review integrity flags, mark written answers, and handle technical issues."
        actions={
          expired > 0 && (
            <form action={finalizeExpiredAction}>
              <button type="submit" className={buttonClasses("gold", "md")}>
                Auto-submit {expired} expired attempt(s)
              </button>
            </form>
          )
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="In progress now" value={inProgress - expired} tone="blue" />
        <StatCard label="Expired, not yet closed" value={expired} tone="amber" hint="Closed automatically when touched or via cron" />
        <StatCard label="Attempts with integrity flags" value={flagged} tone="violet" />
        <StatCard label="Written answers to mark" value={needReview} tone="gold" />
      </div>
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Select name="competitionId" defaultValue={sp.competitionId ?? ""} placeholder="All competitions" options={competitions.map((c) => ({ value: String(c.id), label: c.title }))} className="w-60" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Any status" options={Object.values(ATTEMPT_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="flagged" value="1" defaultChecked={!!sp.flagged} className="size-4 accent-brand-600" /> Flagged only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="review" value="1" defaultChecked={!!sp.review} className="size-4 accent-brand-600" /> Needs marking
          </label>
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {attempts.length === 0 ? (
          <EmptyState icon={ListChecks} title="No attempts found" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Student</TH>
                <TH>Competition</TH>
                <TH>Started</TH>
                <TH>Submitted</TH>
                <TH>Status</TH>
                <TH>Score</TH>
                <TH>Flags</TH>
              </tr>
            </THead>
            <tbody>
              {attempts.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link href={`/admin/exams/${a.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {a.registration.user.fullName}
                    </Link>
                    <p className="font-mono text-xs text-navy-500">
                      {a.registration.registrationNumber} · #{a.attemptNumber}
                    </p>
                  </TD>
                  <TD>{a.registration.competition.title}</TD>
                  <TD className="text-xs">{formatDateTime(a.startedAt)}</TD>
                  <TD className="text-xs">{a.submittedAt ? `${formatDateTime(a.submittedAt)} · ${label(a.submissionType)}` : "—"}</TD>
                  <TD>
                    <StatusBadge status={a.status} />
                  </TD>
                  <TD className="tabular-nums">{a.result ? `${formatNumber(a.result.score, 2)}/${formatNumber(a.result.maxScore, 2)}` : "—"}</TD>
                  <TD>{a.flagCount > 0 ? <Badge tone="violet"><Flag className="size-3" /> {a.flagCount}</Badge> : <span className="text-navy-400">0</span>}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/exams" params={{ competitionId: sp.competitionId, status: sp.status, flagged: sp.flagged, review: sp.review }} />
      </Card>
    </>
  );
}
