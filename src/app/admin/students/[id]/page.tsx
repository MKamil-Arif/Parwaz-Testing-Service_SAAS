import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { USER_STATUS, classLabel, label } from "@/lib/constants";
import { ageOn, formatDate, formatDateTime, formatNumber, formatPKR } from "@/lib/format";
import { markEmailVerifiedAction, revokeSessionsAction, setUserStatusAction, verifyGuardianConsentAction } from "@/actions/admin/operations";
import { PageHeader, DescriptionList, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Student" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("students.manage");
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      profile: true,
      registrations: { include: { competition: true, payments: true, attempts: { include: { result: true } } }, orderBy: { createdAt: "desc" } },
      supportTickets: { orderBy: { createdAt: "desc" }, take: 10 },
      referredBy: { include: { referrer: { select: { fullName: true, id: true } } } },
      signupCampaign: true,
      _count: { select: { sessions: true, referralsMade: true } },
    },
  });
  if (!u) notFound();
  const p = u.profile;
  const minor = p ? ageOn(p.dateOfBirth) < 18 : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={u.fullName}
        description={u.email}
        back={{ href: "/admin/students", label: "Students" }}
        actions={
          <>
            <StatusBadge status={u.status} />
            <form action={setUserStatusAction.bind(null, u.id, u.status === USER_STATUS.ACTIVE ? USER_STATUS.SUSPENDED : USER_STATUS.ACTIVE)}>
              <button type="submit" className={buttonClasses(u.status === USER_STATUS.ACTIVE ? "danger-soft" : "secondary", "sm")}>
                {u.status === USER_STATUS.ACTIVE ? "Suspend account" : "Reactivate account"}
              </button>
            </form>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Phone", value: u.phone },
                { label: "Date of birth", value: p ? `${formatDate(p.dateOfBirth)} (age ${ageOn(p.dateOfBirth)})` : "—" },
                { label: "City / district", value: p ? `${p.city}, ${p.district}` : "—" },
                { label: "Institution", value: p?.institution ?? "—" },
                { label: "Class", value: classLabel(p?.classLevel) },
                { label: "Leaderboard name", value: label(p?.leaderboardNameMode) },
                { label: "Media consent", value: p?.mediaConsent ? "Yes" : "No" },
                { label: "Referral code", value: <span className="font-mono">{u.referralCode}</span> },
                { label: "Referred by", value: u.referredBy ? <Link className="text-brand-700" href={`/admin/students/${u.referredBy.referrer.id}`}>{u.referredBy.referrer.fullName}</Link> : "—" },
                { label: "Signup campaign", value: u.signupCampaign?.name ?? "—" },
                { label: "Friends referred", value: u._count.referralsMade },
                { label: "Joined / last login", value: `${formatDate(u.createdAt)} / ${formatDateTime(u.lastLoginAt)}` },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Verification & security" />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Email</p>
                <p className="text-sm text-navy-500">{u.emailVerifiedAt ? `Verified ${formatDateTime(u.emailVerifiedAt)}` : "Not verified"}</p>
              </div>
              {!u.emailVerifiedAt && (
                <form action={markEmailVerifiedAction.bind(null, u.id)}>
                  <button type="submit" className={buttonClasses("secondary", "sm")}>Mark verified</button>
                </form>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4">
              <div>
                <p className="text-sm font-semibold">Parent / guardian consent</p>
                <p className="text-sm text-navy-500">
                  {!minor
                    ? "Not required (18+)"
                    : p?.guardianConsentAt
                      ? `${p.guardianName} (${p.guardianRelation}), ${p.guardianPhone} — declared ${formatDate(p.guardianConsentAt)}`
                      : "Missing"}
                </p>
              </div>
              {minor && p?.guardianConsentAt && (p.guardianConsentVerified ? (
                <Badge tone="green">Verified by staff</Badge>
              ) : (
                <form action={verifyGuardianConsentAction.bind(null, u.id)}>
                  <button type="submit" className={buttonClasses("secondary", "sm")}>Mark consent verified</button>
                </form>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4">
              <div>
                <p className="text-sm font-semibold">Active sessions</p>
                <p className="text-sm text-navy-500">{u._count.sessions} signed-in device(s){u.lockedUntil && u.lockedUntil > new Date() ? ` · locked until ${formatDateTime(u.lockedUntil)}` : ""}</p>
              </div>
              <form action={revokeSessionsAction.bind(null, u.id)}>
                <button type="submit" className={buttonClasses("secondary", "sm")}>Sign out everywhere</button>
              </form>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Registrations, payments & results" />
        <Table>
          <THead>
            <tr>
              <TH>Competition</TH>
              <TH>Registration</TH>
              <TH>Payments</TH>
              <TH>Attempt</TH>
              <TH>Result</TH>
            </tr>
          </THead>
          <tbody>
            {u.registrations.map((r) => (
              <TR key={r.id}>
                <TD className="font-semibold text-navy-950">{r.competition.title}</TD>
                <TD>
                  <span className="font-mono text-xs">{r.registrationNumber}</span> <StatusBadge status={r.status} />
                </TD>
                <TD className="text-xs">{r.payments.map((p) => `${p.reference} ${formatPKR(p.amount)} ${label(p.status)}`).join("; ") || "—"}</TD>
                <TD>
                  {r.attempts.map((a) => (
                    <Link key={a.id} href={`/admin/exams/${a.id}`} className="mr-2 text-xs font-semibold text-brand-700">
                      #{a.attemptNumber} {label(a.status)}
                    </Link>
                  ))}
                </TD>
                <TD className="text-xs">
                  {r.attempts.map((a) => a.result).filter(Boolean).map((res) => `${formatNumber(res!.score, 2)}/${formatNumber(res!.maxScore, 2)} · ${label(res!.status)}${res!.meritRank ? ` · #${res!.meritRank}` : ""}`).join("; ") || "—"}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      {u.supportTickets.length > 0 && (
        <Card>
          <CardHeader title="Support tickets" />
          <ul className="divide-y divide-navy-100">
            {u.supportTickets.map((t) => (
              <li key={t.id} className="flex justify-between px-5 py-3 text-sm">
                <Link href={`/admin/support/${t.id}`} className="font-semibold text-brand-700">
                  {t.ticketNumber} · {t.subject}
                </Link>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
