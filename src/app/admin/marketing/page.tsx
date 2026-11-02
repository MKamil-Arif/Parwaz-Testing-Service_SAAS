import Link from "next/link";
import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ATTEMPT_STATUS, EXPENSE_CATEGORY, REFERRAL_STATUS, REGISTRATION_STATUS, ROLES, label } from "@/lib/constants";
import { formatNumber, formatPercent, formatPKR, num } from "@/lib/format";
import { appUrl } from "@/lib/request";
import { PageHeader, StatCard, Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/client-widgets";
import { MarketingTabs } from "./tabs";
import { CampaignForm } from "./campaign-form";

export const metadata: Metadata = { title: "Marketing" };

const pct = (a: number, b: number) => (b > 0 ? formatPercent((a / b) * 100) : "—");

export default async function MarketingPage() {
  await requireStaff("marketing.manage");
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const [students, withConfirmed, confirmedRegs, submitted, active30, campaigns, referralGroups, topReferrers, competitions, marketingSpend] = await Promise.all([
    db.user.count({ where: { roles: { some: { role: { name: ROLES.STUDENT } } } } }),
    db.competitionRegistration.groupBy({ by: ["userId"], where: { status: REGISTRATION_STATUS.CONFIRMED }, _count: { _all: true } }),
    db.competitionRegistration.count({ where: { status: REGISTRATION_STATUS.CONFIRMED } }),
    db.examAttempt.count({ where: { status: { in: [ATTEMPT_STATUS.SUBMITTED, ATTEMPT_STATUS.AUTO_SUBMITTED] } } }),
    db.user.count({ where: { lastLoginAt: { gte: since30 }, roles: { some: { role: { name: ROLES.STUDENT } } } } }),
    db.marketingCampaign.findMany({ orderBy: { startDate: "desc" }, include: { expenses: true, signups: { select: { id: true, registrations: { where: { status: REGISTRATION_STATUS.CONFIRMED }, select: { id: true } } } } } }),
    db.referral.groupBy({ by: ["status"], _count: { _all: true } }),
    db.referral.groupBy({ by: ["referrerId"], _count: { _all: true }, orderBy: { _count: { referrerId: "desc" } }, take: 8 }),
    db.competition.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true } }),
    db.businessExpense.aggregate({ _sum: { amount: true }, where: { category: EXPENSE_CATEGORY.MARKETING } }),
  ]);
  const referrers = await db.user.findMany({ where: { id: { in: topReferrers.map((r) => r.referrerId) } }, select: { id: true, fullName: true, referralCode: true, referralsMade: { where: { status: REFERRAL_STATUS.CONVERTED }, select: { id: true } } } });
  const refCount = (s: string) => referralGroups.find((g) => g.status === s)?._count._all ?? 0;
  const repeat = withConfirmed.filter((u) => u._count._all >= 2).length;
  const spend = num(marketingSpend._sum.amount);

  return (
    <>
      <PageHeader title="Marketing" description="Campaign tracking, referrals and conversion — every figure is computed from live records." />
      <MarketingTabs active="overview" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registration conversion" value={pct(withConfirmed.length, students)} hint={`${withConfirmed.length} of ${students} accounts have a confirmed registration`} />
        <StatCard label="Competition completion" value={pct(submitted, confirmedRegs)} hint={`${submitted} submitted of ${confirmedRegs} confirmed`} tone="green" />
        <StatCard label="Repeat participation" value={pct(repeat, withConfirmed.length)} hint={`${repeat} student(s) in 2+ competitions`} tone="violet" />
        <StatCard label="Active students (30 days)" value={pct(active30, students)} hint={`${active30} logged in recently`} tone="navy" />
        <StatCard label="Referral sign-ups" value={refCount(REFERRAL_STATUS.SIGNED_UP) + refCount(REFERRAL_STATUS.CONVERTED)} hint={`${refCount(REFERRAL_STATUS.CONVERTED)} registered & paid`} tone="gold" />
        <StatCard label="Marketing spend (recorded)" value={formatPKR(spend)} tone="amber" />
        <StatCard label="Cost per confirmed registration" value={confirmedRegs && spend ? formatPKR(spend / confirmedRegs) : "—"} hint="All marketing spend ÷ confirmed registrations" />
        <StatCard label="Confirmed registrations" value={formatNumber(confirmedRegs)} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Campaign performance" description="Sign-ups are attributed by tracking link; spend comes from expenses linked to the campaign." />
          {campaigns.length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns yet" description="Create one with the form to get a tracking link." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Campaign</TH>
                  <TH className="text-right">Visits</TH>
                  <TH className="text-right">Sign-ups</TH>
                  <TH className="text-right">Confirmed</TH>
                  <TH className="text-right">Spend</TH>
                  <TH className="text-right">Cost / reg.</TH>
                  <TH>Link</TH>
                </tr>
              </THead>
              <tbody>
                {campaigns.map((c) => {
                  const signups = c.signups.length;
                  const confirmed = c.signups.reduce((a, u) => a + u.registrations.length, 0);
                  const cs = c.expenses.reduce((a, e) => a + num(e.amount), 0);
                  const link = c.landingEnabled ? appUrl(`/l/${c.slug}`) : appUrl(`/?utm_campaign=${c.slug}`);
                  return (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/admin/marketing/campaigns/${c.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                          {c.name}
                        </Link>
                        <p className="text-xs text-navy-500">
                          {label(c.channel)} · <StatusBadge status={c.status} />
                        </p>
                      </TD>
                      <TD className="text-right">{c.landingEnabled ? c.visitCount : "—"}</TD>
                      <TD className="text-right">{signups}</TD>
                      <TD className="text-right">{confirmed}</TD>
                      <TD className="text-right text-xs">
                        {formatPKR(cs)}
                        {c.budget != null && <span className="block text-navy-400">of {formatPKR(c.budget)}</span>}
                      </TD>
                      <TD className="text-right text-xs">{confirmed && cs ? formatPKR(cs / confirmed) : "—"}</TD>
                      <TD>
                        <CopyButton value={link} label="Link" className="px-2 py-1 text-xs" />
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="New campaign" description="Facebook, Instagram, TikTok, WhatsApp, ambassadors, school partnerships…" />
            <CardBody>
              <CampaignForm competitions={competitions} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Top referrers & ambassadors" description="Students share their link from My Profile." />
            {referrers.length === 0 ? (
              <EmptyState title="No referrals yet" />
            ) : (
              <ul className="divide-y divide-navy-100 text-sm">
                {topReferrers.map((r) => {
                  const u = referrers.find((x) => x.id === r.referrerId);
                  return (
                    <li key={r.referrerId} className="flex justify-between px-5 py-2.5">
                      <Link href={`/admin/students/${r.referrerId}`} className="font-semibold text-brand-700">
                        {u?.fullName} <span className="font-mono text-xs text-navy-500">{u?.referralCode}</span>
                      </Link>
                      <span>
                        {r._count._all} sign-ups · {u?.referralsMade.length ?? 0} paid
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
