import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { ALLOCATION_STATUS, RESULTS_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { prizeForRank } from "@/lib/exam/ranking";
import { raiseResultDisputeAction } from "@/actions/student";
import { PageHeader, Alert, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Textarea } from "@/components/ui/form";
import { PrintButton } from "@/components/ui/client-widgets";

export const metadata: Metadata = { title: "Result" };

export default async function ResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireStudent();
  const result = await db.examResult.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      prizeAllocation: { include: { prize: true } },
      attempt: { include: { registration: { include: { competition: { include: { prizes: true } }, user: true } } } },
    },
  });
  const reg = result?.attempt.registration;
  if (!result || !reg || reg.userId !== user.id) notFound();
  const c = reg.competition;
  const published = c.resultsStatus === RESULTS_STATUS.PUBLISHED;
  if (!published && !c.showInstantResults) notFound();

  const tier = published ? prizeForRank(result.meritRank, c.prizes) : null;
  const alloc = result.prizeAllocation;
  const eligibility = !published
    ? "Practice round — not ranked"
    : !result.meritRank
      ? "Not ranked"
      : !tier
        ? "Not within the prize ranks"
        : !alloc
          ? `Within ${tier.title} ranks — awaiting allocation`
          : alloc.status === ALLOCATION_STATUS.VERIFIED
            ? `${alloc.prize.title} — verified winner`
            : alloc.status === ALLOCATION_STATUS.PENDING_VERIFICATION
              ? `${alloc.prize.title} — provisional, verification in progress`
              : `${alloc.prize.title} — ${label(alloc.status)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print">
        <PageHeader title="Examination result" back={{ href: "/dashboard/results", label: "My results" }} actions={<PrintButton label="Print result" />} />
      </div>
      {!published && <Alert tone="info">This is a practice round: your score is shown immediately and is not ranked.</Alert>}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-navy-950 bg-grid-dark p-6 text-white">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-gold-300 uppercase">{c.title}</p>
            <p className="mt-1 text-2xl font-bold">{reg.user.fullName}</p>
            <p className="text-sm text-navy-300">Registration {reg.registrationNumber}</p>
          </div>
          {published && result.meritRank && (
            <div className="rounded-2xl bg-gold-400 px-5 py-3 text-center text-navy-950">
              <Medal className="mx-auto size-5" />
              <p className="font-display text-3xl font-extrabold">#{result.meritRank}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase">Merit position</p>
            </div>
          )}
        </div>
        <CardBody className="space-y-6 py-6">
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              { k: "Total questions", v: result.totalQuestions, c: "bg-navy-50 text-navy-900" },
              { k: "Correct", v: result.correctCount, c: "bg-emerald-50 text-emerald-800" },
              { k: "Incorrect", v: result.incorrectCount, c: "bg-red-50 text-red-800" },
              { k: "Unanswered", v: result.unansweredCount, c: "bg-navy-50 text-navy-700" },
            ].map((x) => (
              <div key={x.k} className={`rounded-2xl p-4 ${x.c}`}>
                <p className="font-display text-3xl font-bold">{x.v}</p>
                <p className="text-xs font-semibold">{x.k}</p>
              </div>
            ))}
          </div>
          <DescriptionList
            items={[
              { label: "Total marks", value: `${formatNumber(result.score, 2)} / ${formatNumber(result.maxScore, 2)}` },
              { label: "Percentage", value: formatPercent(result.percentage) },
              { label: "Examination status", value: <StatusBadge status={result.attempt.status} /> },
              { label: "Result status", value: <StatusBadge status={result.status} /> },
              { label: "Time taken", value: formatDuration(result.timeTakenSeconds) },
              { label: "Submitted", value: formatDateTime(result.attempt.submittedAt) },
              { label: "Merit position", value: published && result.meritRank ? `#${result.meritRank}` : "—" },
              { label: "Prize eligibility", value: eligibility },
            ]}
          />
          {result.pendingReviewCount > 0 && <Alert tone="warning">{result.pendingReviewCount} written answer(s) are still being reviewed.</Alert>}
        </CardBody>
      </Card>

      {published && (
        <Card className="no-print">
          <CardHeader title="Question about your result?" description="Raise a formal dispute. An examiner will review your attempt and respond." />
          <CardBody>
            <ActionForm action={raiseResultDisputeAction} className="space-y-4">
              <input type="hidden" name="resultId" value={result.id} />
              <Field label="Explain your concern" name="message">
                <Textarea id="message" name="message" rows={4} required minLength={20} maxLength={5000} />
              </Field>
              <SubmitButton variant="secondary">Raise a dispute</SubmitButton>
            </ActionForm>
            <p className="mt-3 text-xs text-navy-500">
              Or view the <Link href={`/competitions/${c.slug}/leaderboard`} className="font-semibold text-brand-700">published merit list</Link>.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
