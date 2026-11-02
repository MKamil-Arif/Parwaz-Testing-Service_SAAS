import Link from "next/link";
import { Award, BookOpen, ClipboardList, CreditCard, Gift, Hourglass, Trophy, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import {
  ALLOCATION_STATUS,
  ATTEMPT_STATUS,
  COMPETITION_STATUS,
  DISTRIBUTION_STATUS,
  PAYMENT_STATUS,
  REGISTRATION_STATUS,
  RESULTS_STATUS,
  ROLES,
  classLabel,
} from "@/lib/constants";
import { competitionPhase } from "@/lib/competition-rules";
import { formatDateTime, formatNumber, formatPKR, num } from "@/lib/format";
import { lastNDays, pktDayKey, shortDay } from "@/lib/admin-helpers";
import { PageHeader, StatCard, Alert, Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ChartCard } from "@/components/admin/charts";

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const session = await requireStaff("dashboard.view");
  const since = new Date(Date.now() - 30 * 86400_000);

  const [
    students,
    regCounts,
    pendingVerification,
    revenue,
    sandboxRevenue,
    competitions,
    completedExams,
    allocations,
    delivered,
    recentRegs,
    recentPaid,
    districts,
    classes,
    pendingList,
    recentList,
  ] = await Promise.all([
    db.user.count({ where: { roles: { some: { role: { name: ROLES.STUDENT } } } } }),
    db.competitionRegistration.groupBy({ by: ["status"], _count: { _all: true } }),
    db.payment.count({ where: { status: PAYMENT_STATUS.PENDING_VERIFICATION } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: false } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: true } }),
    db.competition.findMany({ where: { status: COMPETITION_STATUS.PUBLISHED } }),
    db.examAttempt.count({ where: { status: { in: [ATTEMPT_STATUS.SUBMITTED, ATTEMPT_STATUS.AUTO_SUBMITTED] } } }),
    db.prizeAllocation.groupBy({ by: ["status"], _count: { _all: true } }),
    db.prizeDistribution.count({ where: { status: DISTRIBUTION_STATUS.DELIVERED } }),
    db.competitionRegistration.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.payment.findMany({ where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: false, paidAt: { gte: since } }, select: { paidAt: true, amount: true } }),
    db.studentProfile.groupBy({ by: ["district"], _count: { _all: true } }),
    db.studentProfile.groupBy({ by: ["classLevel"], _count: { _all: true } }),
    db.payment.findMany({
      where: { status: PAYMENT_STATUS.PENDING_VERIFICATION },
      include: { registration: { include: { user: true, competition: { select: { title: true } } } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    db.competitionRegistration.findMany({
      include: { user: true, competition: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const count = (s: string) => regCounts.find((r) => r.status === s)?._count._all ?? 0;
  const totalRegs = regCounts.reduce((a, r) => a + r._count._all, 0) - count(REGISTRATION_STATUS.CANCELLED);
  const active = competitions.filter((c) => competitionPhase(c) !== "COMPLETED").length;
  const publishedResults = competitions.filter((c) => c.resultsStatus === RESULTS_STATUS.PUBLISHED).length;
  const verifiedWinners = allocations.find((a) => a.status === ALLOCATION_STATUS.VERIFIED)?._count._all ?? 0;
  const totalAllocated = allocations.reduce((a, r) => a + r._count._all, 0);

  const days = lastNDays(30);
  const regByDay = new Map(days.map((d) => [d, 0]));
  for (const r of recentRegs) {
    const k = pktDayKey(r.createdAt);
    if (regByDay.has(k)) regByDay.set(k, regByDay.get(k)! + 1);
  }
  const revByDay = new Map(days.map((d) => [d, 0]));
  for (const p of recentPaid) {
    const k = pktDayKey(p.paidAt!);
    if (revByDay.has(k)) revByDay.set(k, revByDay.get(k)! + num(p.amount));
  }

  return (
    <>
      <PageHeader title="Overview" description={`Welcome back, ${session.user.fullName.split(" ")[0]}. All figures below come from live records.`} />
      {denied && (
        <Alert tone="error" className="mb-6">
          Your role does not have access to that section.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={formatNumber(students)} icon={Users} />
        <StatCard label="Registrations" value={formatNumber(totalRegs)} icon={ClipboardList} tone="navy" hint={`${formatNumber(count(REGISTRATION_STATUS.CONFIRMED))} confirmed`} />
        <StatCard
          label="Pending payments"
          value={formatNumber(count(REGISTRATION_STATUS.PENDING_PAYMENT))}
          icon={Hourglass}
          tone="amber"
          hint={`${pendingVerification} transfer(s) awaiting verification`}
        />
        <StatCard
          label="Verified revenue"
          value={formatPKR(revenue._sum.amount)}
          icon={Wallet}
          tone="green"
          hint={num(sandboxRevenue._sum.amount) ? `Excludes ${formatPKR(sandboxRevenue._sum.amount)} sandbox test payments` : "Real, verified payments only"}
        />
        <StatCard label="Active competitions" value={active} icon={Trophy} tone="gold" hint={`${competitions.length} published in total`} />
        <StatCard label="Completed examinations" value={formatNumber(completedExams)} icon={BookOpen} tone="blue" />
        <StatCard label="Published results" value={publishedResults} icon={Award} tone="violet" hint="Competitions with a published merit list" />
        <StatCard label="Prize distribution" value={`${delivered} / ${totalAllocated}`} icon={Gift} tone="gold" hint={`${verifiedWinners} verified winners · delivered / allocated`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="New registrations"
          description="Last 30 days, by registration date (PKT)"
          data={days.map((d) => ({ day: shortDay(d), registrations: regByDay.get(d)! }))}
          xKey="day"
          series={[{ key: "registrations", label: "Registrations" }]}
          emptyText="No registrations in the last 30 days"
        />
        <ChartCard
          title="Verified registration revenue"
          description="Last 30 days, by payment date — sandbox payments excluded"
          data={days.map((d) => ({ day: shortDay(d), revenue: revByDay.get(d)! }))}
          xKey="day"
          series={[{ key: "revenue", label: "Revenue" }]}
          format="pkr"
          emptyText="No verified payments in the last 30 days"
        />
        <ChartCard
          title="Students by district"
          description="Top 10 districts by registered students"
          data={districts
            .sort((a, b) => b._count._all - a._count._all)
            .slice(0, 10)
            .map((d) => ({ label: d.district, students: d._count._all }))}
          xKey="label"
          series={[{ key: "students", label: "Students" }]}
          horizontal
          height={300}
        />
        <ChartCard
          title="Students by class"
          data={classes.sort((a, b) => b._count._all - a._count._all).map((c) => ({ label: classLabel(c.classLevel).split(" (")[0], students: c._count._all }))}
          xKey="label"
          series={[{ key: "students", label: "Students" }]}
          horizontal
          height={300}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Transfers awaiting verification" action={<Link href="/admin/payments?status=PENDING_VERIFICATION" className="text-sm font-semibold text-brand-700">Open queue</Link>} />
          {pendingList.length === 0 ? (
            <EmptyState icon={CreditCard} title="Nothing to verify" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Student</TH>
                  <TH>Transaction ID</TH>
                  <TH>Amount</TH>
                  <TH>Submitted</TH>
                </tr>
              </THead>
              <tbody>
                {pendingList.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-semibold text-navy-950">{p.registration.user.fullName}</TD>
                    <TD className="font-mono text-xs">{p.payerReference}</TD>
                    <TD>{formatPKR(p.amount)}</TD>
                    <TD>{formatDateTime(p.createdAt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Latest registrations" action={<Link href="/admin/registrations" className="text-sm font-semibold text-brand-700">All</Link>} />
          {recentList.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No registrations yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Student</TH>
                  <TH>Competition</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {recentList.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-semibold text-navy-950">{r.user.fullName}</TD>
                    <TD>{r.competition.title}</TD>
                    <TD>{formatDateTime(r.createdAt)}</TD>
                    <TD>
                      <StatusBadge status={r.status} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
