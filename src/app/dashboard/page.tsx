import Link from "next/link";
import { ArrowRight, Award, Bell, BookOpen, CalendarDays, ClipboardList, Gift, Medal, Search, Sparkles, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getPublicCompetitions } from "@/lib/queries";
import { activeAttempt, getStudentRegistrations, isUpcomingExam, profileCompletion, resultVisible } from "@/lib/student";
import { ALLOCATION_STATUS, PAYMENT_STATUS, REGISTRATION_STATUS, RESULTS_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPercent, formatPKR } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard, EmptyState, Alert } from "@/components/ui/layout";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Countdown } from "@/components/ui/client-widgets";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";

export default async function StudentDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { user: sessionUser } = await requireStudent();
  const [user, regs, competitions, notifications] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { profile: true } }),
    getStudentRegistrations(sessionUser.id),
    getPublicCompetitions("active"),
    db.notification.findMany({ where: { userId: sessionUser.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const completion = profileCompletion(user);
  const registeredIds = new Set(regs.filter((r) => r.status !== REGISTRATION_STATUS.CANCELLED).map((r) => r.competitionId));
  const available = competitions.filter((c) => c.phase === "REGISTRATION_OPEN" && !registeredIds.has(c.id));
  const upcoming = regs.filter((r) => isUpcomingExam(r));
  const completed = regs.filter((r) => activeAttempt(r)?.submittedAt);
  const pendingPayments = regs.filter((r) => r.status === REGISTRATION_STATUS.PENDING_PAYMENT);
  const paidTotal = regs.flatMap((r) => r.payments).filter((p) => p.status === PAYMENT_STATUS.SUCCEEDED);
  const published = regs.filter((r) => resultVisible(r) && activeAttempt(r)?.result);
  const bestRank = published
    .map((r) => activeAttempt(r)?.result?.meritRank)
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => a - b)[0];
  const prizes = regs
    .map((r) => ({ reg: r, alloc: activeAttempt(r)?.result?.prizeAllocation }))
    .filter((x) => x.alloc && x.reg.competition.resultsStatus === RESULTS_STATUS.PUBLISHED);

  return (
    <div className="space-y-6">
      {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
      {welcome && (
        <Alert tone="success" title={`Welcome to Rewarding Potential, ${user.fullName.split(" ")[0]}!`}>
          Your account is ready. Verify your email, then browse competitions to register.
        </Alert>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-navy-950 bg-grid-dark p-6 text-white sm:p-8">
        <div aria-hidden="true" className="absolute -top-20 -right-16 size-72 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm text-gold-300">
              <Sparkles className="size-4" /> {user.isDemo ? "Demo student account" : "Student portal"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Assalam-o-Alaikum, {user.fullName.split(" ")[0]}</h1>
            <p className="mt-1 text-navy-300">
              {upcoming.length
                ? `You have ${upcoming.length} upcoming examination${upcoming.length > 1 ? "s" : ""}.`
                : available.length
                  ? `${available.length} competition${available.length > 1 ? "s are" : " is"} open for registration.`
                  : "Track your registrations, exams and results here."}
            </p>
          </div>
          <div className="w-full max-w-xs rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy-200">Profile completion</span>
              <span className="font-bold text-gold-300">{completion.percent}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-gold-400" style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.missing.length > 0 && (
              <Link href="/dashboard/profile" className="mt-2 block text-xs text-navy-300 hover:text-white">
                Next: {completion.missing[0]} →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered competitions" value={registeredIds.size} icon={ClipboardList} hint={`${available.length} open for registration`} />
        <StatCard
          label="Payment status"
          value={pendingPayments.length ? `${pendingPayments.length} pending` : "All clear"}
          icon={Wallet}
          tone={pendingPayments.length ? "amber" : "green"}
          hint={`${paidTotal.length} payment${paidTotal.length === 1 ? "" : "s"} completed`}
        />
        <StatCard label="Examinations" value={`${upcoming.length} upcoming`} icon={BookOpen} tone="navy" hint={`${completed.length} completed`} />
        <StatCard
          label="Best merit position"
          value={bestRank ? `#${bestRank}` : "—"}
          icon={Medal}
          tone="gold"
          hint={published.length ? `${published.length} result${published.length > 1 ? "s" : ""} published` : "No published results yet"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Upcoming examinations"
              action={
                <Link href="/dashboard/exams" className="text-sm font-semibold text-brand-700">
                  View all
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming examinations" description="Confirmed registrations appear here with their exam window." />
            ) : (
              <ul className="divide-y divide-navy-100">
                {upcoming.map((r) => {
                  const open = r.competition.examStartsAt <= new Date();
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="font-semibold text-navy-950">{r.competition.title}</p>
                        <p className="text-sm text-navy-500">
                          {open ? "Window open until " : "Opens "}
                          {formatDateTime(open ? r.competition.examEndsAt : r.competition.examStartsAt)} · {r.competition.durationMinutes} min
                        </p>
                      </div>
                      {open ? (
                        <Link href={`/dashboard/exams/${r.registrationNumber}`} className={buttonClasses("primary", "sm")}>
                          Start exam
                        </Link>
                      ) : (
                        <Countdown target={r.competition.examStartsAt.toISOString()} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="My registrations" action={<Link href="/dashboard/registrations" className="text-sm font-semibold text-brand-700">Manage</Link>} />
            {regs.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="You haven't registered yet"
                description="Choose a competition to get started."
                action={
                  <Link href="/dashboard/competitions" className={buttonClasses("primary", "sm")}>
                    Browse competitions
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-navy-100">
                {regs.slice(0, 5).map((r) => {
                  const lastPayment = r.payments[0];
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-950">{r.competition.title}</p>
                        <p className="text-xs text-navy-500">
                          {r.registrationNumber} · {lastPayment ? `Payment: ${label(lastPayment.status)}` : formatPKR(r.competition.registrationFee)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === REGISTRATION_STATUS.PENDING_PAYMENT && (
                          <Link href={`/dashboard/registrations/${r.id}/pay`} className={buttonClasses("gold", "xs")}>
                            Pay now
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Examination results" action={<Link href="/dashboard/results" className="text-sm font-semibold text-brand-700">All results</Link>} />
            {completed.length === 0 ? (
              <EmptyState icon={Award} title="No completed examinations yet" />
            ) : (
              <ul className="divide-y divide-navy-100">
                {completed.map((r) => {
                  const result = activeAttempt(r)?.result;
                  const visible = resultVisible(r);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-semibold text-navy-950">{r.competition.title}</p>
                        <p className="text-sm text-navy-500">
                          {visible && result
                            ? `${formatNumber(result.score, 2)} / ${formatNumber(result.maxScore, 2)} marks · ${formatPercent(result.percentage)}`
                            : "Submitted — awaiting verified results"}
                        </p>
                      </div>
                      {visible && result ? (
                        <Link href={`/dashboard/results/${result.id}`} className="text-sm font-semibold text-brand-700">
                          {result.meritRank ? `Position #${result.meritRank}` : "View result"} →
                        </Link>
                      ) : (
                        <Badge tone="amber">Under verification</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Prize eligibility" />
            <CardBody>
              {prizes.length === 0 ? (
                <p className="flex items-start gap-3 text-sm text-navy-600">
                  <Gift className="mt-0.5 size-5 shrink-0 text-navy-300" />
                  Prize eligibility appears here once results are published. Top 10 ranks earn laptops; ranks 11–30 earn Chromebooks (per each
                  competition's rules).
                </p>
              ) : (
                <ul className="space-y-3">
                  {prizes.map(({ reg, alloc }) => (
                    <li key={reg.id} className="rounded-xl bg-gold-50 p-4 ring-1 ring-gold-100">
                      <p className="font-semibold text-navy-950">
                        {alloc!.prize.title} · Position #{alloc!.rank}
                      </p>
                      <p className="text-sm text-navy-600">{reg.competition.title}</p>
                      <p className="mt-2 text-xs font-semibold text-gold-700">
                        {alloc!.status === ALLOCATION_STATUS.VERIFIED
                          ? "Verified — our team will contact you about the award ceremony."
                          : alloc!.status === ALLOCATION_STATUS.PENDING_VERIFICATION
                            ? "Provisionally eligible — identity and eligibility verification in progress."
                            : `Status: ${label(alloc!.status)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Open for registration" />
            {available.length === 0 ? (
              <EmptyState icon={Search} title="Nothing open right now" description="We'll notify you when the next competition opens." />
            ) : (
              <ul className="divide-y divide-navy-100">
                {available.slice(0, 3).map((c) => (
                  <li key={c.id} className="px-5 py-4">
                    <p className="font-semibold text-navy-950">{c.title}</p>
                    <p className="text-sm text-navy-500">
                      {formatPKR(c.registrationFee)} · closes {formatDateTime(c.registrationClosesAt)}
                    </p>
                    <Link href={`/dashboard/competitions/${c.slug}/register`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                      Register <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Notifications" action={<Link href="/dashboard/notifications" className="text-sm font-semibold text-brand-700">All</Link>} />
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications yet" />
            ) : (
              <ul className="divide-y divide-navy-100">
                {notifications.map((n) => (
                  <li key={n.id} className="px-5 py-3.5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                      {!n.readAt && <span className="size-2 rounded-full bg-brand-600" />}
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
