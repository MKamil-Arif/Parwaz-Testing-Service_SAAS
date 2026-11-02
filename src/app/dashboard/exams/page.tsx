import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requireStudent } from "@/lib/auth/guards";
import { activeAttempt, getStudentRegistrations, resultVisible } from "@/lib/student";
import { ATTEMPT_STATUS, REGISTRATION_STATUS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PageHeader, EmptyState, Alert } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "My examinations" };

export default async function MyExamsPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const { registered } = await searchParams;
  const { user } = await requireStudent();
  const regs = (await getStudentRegistrations(user.id)).filter((r) => r.status === REGISTRATION_STATUS.CONFIRMED);
  const now = new Date();

  return (
    <>
      <PageHeader title="My examinations" description="Your confirmed competitions, their exam windows and your attempt status." />
      {registered && (
        <Alert tone="success" className="mb-6" title="You're registered!">
          Your registration is confirmed. Start the exam any time during the examination window.
        </Alert>
      )}
      {regs.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No confirmed registrations"
            description="Once your registration is confirmed, your examinations appear here."
            action={
              <Link href="/dashboard/competitions" className={buttonClasses("primary", "sm")}>
                Browse competitions
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {regs.map((r) => {
            const c = r.competition;
            const attempt = activeAttempt(r);
            const windowOpen = now >= c.examStartsAt && now <= c.examEndsAt;
            const status = attempt
              ? attempt.status
              : now < c.examStartsAt
                ? "UPCOMING"
                : now > c.examEndsAt
                  ? "MISSED"
                  : "AVAILABLE";
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-navy-500">{r.registrationNumber}</p>
                  {attempt ? (
                    <StatusBadge status={attempt.status} />
                  ) : (
                    <Badge tone={status === "AVAILABLE" ? "green" : status === "MISSED" ? "red" : "violet"}>
                      {status === "AVAILABLE" ? "Available now" : status === "MISSED" ? "Not attempted" : "Upcoming"}
                    </Badge>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-bold">{c.title}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-navy-500">Window opens</dt>
                    <dd className="font-semibold">{formatDateTime(c.examStartsAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Window closes</dt>
                    <dd className="font-semibold">{formatDateTime(c.examEndsAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Duration</dt>
                    <dd className="font-semibold">{c.durationMinutes} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Questions</dt>
                    <dd className="font-semibold">{c.questionCount}</dd>
                  </div>
                </dl>
                {attempt?.submittedAt && (
                  <p className="mt-3 rounded-xl bg-navy-50 px-3 py-2 text-sm text-navy-700">
                    Submitted {formatDateTime(attempt.submittedAt)}
                    {resultVisible(r) && attempt.result
                      ? ` · Score ${formatNumber(attempt.result.score, 2)}/${formatNumber(attempt.result.maxScore, 2)}`
                      : " · Results will be published after verification"}
                  </p>
                )}
                <div className="mt-4 border-t border-navy-100 pt-4">
                  {attempt?.status === ATTEMPT_STATUS.IN_PROGRESS ? (
                    <Link href={`/exam/${attempt.publicId}`} className={buttonClasses("gold", "md")}>
                      Resume examination
                    </Link>
                  ) : windowOpen && !attempt ? (
                    <Link href={`/dashboard/exams/${r.registrationNumber}`} className={buttonClasses("primary", "md")}>
                      Go to exam instructions
                    </Link>
                  ) : attempt?.result && resultVisible(r) ? (
                    <Link href={`/dashboard/results/${attempt.result.id}`} className={buttonClasses("secondary", "md")}>
                      View result
                    </Link>
                  ) : (
                    <Link href={`/dashboard/exams/${r.registrationNumber}`} className={buttonClasses("secondary", "md")}>
                      Exam details
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
