import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CircleCheck, Clock, FileText, ListChecks, MinusCircle, Shuffle, Trophy, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { getCompetitionBySlug, prizeCount, prizeFund } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/permissions";
import { classLabel, REGISTRATION_STATUS, RESULTS_STATUS } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPKR, num } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/competition-rules";
import { PhaseBadge } from "@/components/site/competition-card";
import { PrizeArt } from "@/components/site/prize-art";
import { SampleBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Countdown, ShareButtons } from "@/components/ui/client-widgets";
import { Prose } from "@/components/ui/prose";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/layout";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCompetitionBySlug((await params).slug);
  return c ? { title: c.title, description: c.summary } : { title: "Competition not found" };
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCompetitionBySlug(slug);
  if (!c) notFound();

  const user = await getCurrentUser();
  const registration = user
    ? await db.competitionRegistration.findUnique({ where: { userId_competitionId: { userId: user.id, competitionId: c.id } } })
    : null;
  const fee = num(c.registrationFee);
  const fund = prizeFund(c.prizes);

  const facts = [
    { Icon: Wallet, k: "Registration fee", v: fee ? formatPKR(fee) : "Free" },
    { Icon: Clock, k: "Exam duration", v: `${c.durationMinutes} minutes` },
    { Icon: ListChecks, k: "Questions", v: `${c.questionCount} multiple-choice` },
    { Icon: FileText, k: "Total marks", v: formatNumber(c.totalMarks, 2) },
    { Icon: MinusCircle, k: "Negative marking", v: c.negativeMarking > 0 ? `−${c.negativeMarking} per wrong answer` : "None" },
    { Icon: Shuffle, k: "Question order", v: c.randomizeQuestions ? "Randomized per student" : "Fixed" },
  ];

  const dates = [
    { t: "Registration opens", d: c.registrationOpensAt },
    { t: "Registration closes", d: c.registrationClosesAt },
    { t: "Exam window opens", d: c.examStartsAt },
    { t: "Exam window closes", d: c.examEndsAt },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 bg-grid-dark text-white">
        <div aria-hidden="true" className="absolute -top-32 -right-20 size-[460px] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr] lg:py-16">
          <div>
            <Link href="/competitions" className="text-sm font-medium text-navy-300 hover:text-white">
              ← All competitions
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PhaseBadge phase={c.phase} />
              {c.isDemo && <SampleBadge>Practice / demo round</SampleBadge>}
              {c.resultsStatus === RESULTS_STATUS.PUBLISHED && <StatusBadge status="PUBLISHED" />}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-balance text-white sm:text-5xl">{c.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-navy-200">{c.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {c.subjects.split(",").map((s) => (
                <span key={s} className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-navy-100 ring-1 ring-white/15">
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* Registration box */}
          <div className="rounded-3xl bg-white p-6 text-navy-900 shadow-lift">
            <p className="text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">{PHASE_LABEL[c.phase]}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-navy-950">{fee ? formatPKR(fee) : "Free entry"}</p>
            {c.phase === "REGISTRATION_OPEN" && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-navy-500">Registration closes in</p>
                <Countdown target={c.registrationClosesAt.toISOString()} />
              </div>
            )}
            {c.phase === "UPCOMING" && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-navy-500">Registration opens in</p>
                <Countdown target={c.registrationOpensAt.toISOString()} />
              </div>
            )}
            <div className="mt-5 space-y-2">
              <RegistrationCta
                slug={c.slug}
                phase={c.phase}
                staff={!!user && isStaff(user.roles)}
                loggedIn={!!user}
                registration={registration ? { status: registration.status, id: registration.id } : null}
                competitionId={c.id}
              />
            </div>
            {c.targetRegistrations && (
              <p className="mt-4 flex items-center gap-2 text-xs text-navy-500">
                <Users className="size-3.5" /> Registration target: {formatNumber(c.targetRegistrations)} students
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader title="About this competition" />
            <CardBody>
              <Prose>{c.description}</Prose>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Eligibility criteria" />
            <CardBody className="space-y-4">
              {c.eligibleClasses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {c.eligibleClasses.map((e) => (
                    <span key={e.classLevel} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                      <CircleCheck className="size-3.5" /> {classLabel(e.classLevel)}
                    </span>
                  ))}
                </div>
              )}
              <Prose>{c.eligibilityText}</Prose>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Rules and regulations" description="By registering you agree to these rules." />
            <CardBody>
              <Prose>{c.rules}</Prose>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Ranking and tie-breaking rules" description="Published before registration opens and applied exactly as written." />
            <CardBody>
              <Prose>{c.tieBreakPolicy}</Prose>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Examination information" />
            <CardBody>
              <dl className="space-y-3.5">
                {facts.map(({ Icon, k, v }) => (
                  <div key={k} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="flex items-center gap-2 text-navy-500">
                      <Icon className="size-4 text-brand-600" /> {k}
                    </dt>
                    <dd className="text-right font-semibold text-navy-950">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Important dates" description="Pakistan Standard Time (PKT)" />
            <CardBody>
              <ul className="space-y-3">
                {dates.map((row) => (
                  <li key={row.t} className="flex items-start gap-3 text-sm">
                    <CalendarDays className={`mt-0.5 size-4 shrink-0 ${row.d < new Date() ? "text-navy-300" : "text-brand-600"}`} />
                    <div>
                      <p className="font-semibold text-navy-900">{row.t}</p>
                      <p className="text-navy-500">{formatDateTime(row.d)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          {c.prizes.length > 0 && (
            <Card>
              <CardHeader title="Prize allocation" description={`${prizeCount(c.prizes)} devices · est. ${formatPKR(fund)}`} />
              <CardBody className="space-y-4">
                {c.prizes.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="w-20 shrink-0 rounded-xl bg-navy-50 p-2">
                      <PrizeArt category={p.category} />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-navy-950">
                        Ranks {p.rankFrom}–{p.rankTo}: {p.title}
                      </p>
                      <p className="text-navy-500">
                        {p.quantity} units · est. {formatPKR(p.estimatedUnitValue)} each
                      </p>
                    </div>
                  </div>
                ))}
                <p className="flex items-center gap-1.5 text-xs text-navy-500">
                  <Trophy className="size-3.5 text-gold-500" /> Awarded after result verification and eligibility checks.
                </p>
              </CardBody>
            </Card>
          )}
          {c.resultsStatus === RESULTS_STATUS.PUBLISHED && (
            <Link href={`/competitions/${c.slug}/leaderboard`} className={buttonClasses("navy", "lg", "w-full")}>
              View published merit list
            </Link>
          )}
          <Card>
            <CardBody>
              <ShareButtons url={`/competitions/${c.slug}`} text={`${c.title} — register on Rewarding Potential`} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function RegistrationCta({
  slug,
  phase,
  staff,
  loggedIn,
  registration,
  competitionId,
}: {
  slug: string;
  phase: string;
  staff: boolean;
  loggedIn: boolean;
  registration: { status: string; id: number } | null;
  competitionId: number;
}) {
  if (staff)
    return (
      <Link href={`/admin/competitions/${competitionId}`} className={buttonClasses("navy", "lg", "w-full")}>
        Manage in admin panel
      </Link>
    );
  if (registration?.status === REGISTRATION_STATUS.CONFIRMED)
    return (
      <>
        <Alert tone="success" title="You are registered">
          Your registration is confirmed.
        </Alert>
        <Link href="/dashboard/exams" className={buttonClasses("primary", "lg", "w-full")}>
          Go to my examinations
        </Link>
      </>
    );
  if (registration?.status === REGISTRATION_STATUS.PENDING_PAYMENT)
    return (
      <Link href={`/dashboard/registrations/${registration.id}/pay`} className={buttonClasses("gold", "lg", "w-full")}>
        Complete your payment
      </Link>
    );
  if (registration)
    return (
      <Alert tone="warning" title="Registration not active">
        Your registration was {registration.status.toLowerCase()}. Contact support if you need help.
      </Alert>
    );
  if (phase !== "REGISTRATION_OPEN")
    return (
      <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-600">
        {phase === "UPCOMING" ? "Registration has not opened yet." : "Registration for this competition is closed."}
      </p>
    );
  if (!loggedIn)
    return (
      <>
        <Link href={`/register?next=${encodeURIComponent(`/dashboard/competitions/${slug}/register`)}`} className={buttonClasses("primary", "lg", "w-full")}>
          Create account & register
        </Link>
        <Link href={`/login?next=${encodeURIComponent(`/dashboard/competitions/${slug}/register`)}`} className={buttonClasses("secondary", "lg", "w-full")}>
          I already have an account
        </Link>
      </>
    );
  return (
    <Link href={`/dashboard/competitions/${slug}/register`} className={buttonClasses("primary", "lg", "w-full")}>
      Register now
    </Link>
  );
}
