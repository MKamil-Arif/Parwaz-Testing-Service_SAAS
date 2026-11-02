import Link from "next/link";
import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ALLOCATION_STATUS, label } from "@/lib/constants";
import { ageOn, formatDateTime, publicName } from "@/lib/format";
import { reviewAllocationAction, togglePublicWinnerAction } from "@/actions/admin/prizes";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Alert } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Winners" };

export default async function WinnersAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; competitionId?: string }> }) {
  await requireStaff("prizes.manage");
  const sp = await searchParams;
  const [allocations, competitions] = await Promise.all([
    db.prizeAllocation.findMany({
      where: { ...(sp.status ? { status: sp.status } : {}), ...(sp.competitionId ? { prize: { competitionId: Number(sp.competitionId) } } : {}) },
      include: {
        prize: { include: { competition: true } },
        result: { include: { attempt: { include: { registration: { include: { user: { include: { profile: true } } } } } } } },
        distribution: true,
      },
      orderBy: [{ prizeId: "asc" }, { rank: "asc" }],
    }),
    db.competition.findMany({ where: { prizes: { some: {} } }, select: { id: true, title: true } }),
  ]);
  return (
    <>
      <PageHeader title="Winner management" description="Verify every provisional winner's identity and eligibility before announcing them. Only verified, approved winners appear publicly." />
      <Alert tone="info" className="mb-5">
        Suggested checks: school/college confirmation of enrolment and class, B-Form/ID sighted in person (do not store the number), guardian contact for under-18s, and a match
        with the registered name and date of birth.
      </Alert>
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Select name="competitionId" defaultValue={sp.competitionId ?? ""} placeholder="All competitions" options={competitions.map((c) => ({ value: String(c.id), label: c.title }))} className="w-60" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Any status" options={Object.values(ALLOCATION_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-52" />
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {allocations.length === 0 ? (
          <EmptyState icon={UserCheck} title="No prize allocations yet" description="Allocate prizes from a competition's results page after the merit list is approved." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Rank / prize</TH>
                <TH>Student</TH>
                <TH>Details to verify</TH>
                <TH>Status</TH>
                <TH>Verification</TH>
                <TH>Public</TH>
              </tr>
            </THead>
            <tbody>
              {allocations.map((a) => {
                const u = a.result.attempt.registration.user;
                const p = u.profile;
                return (
                  <TR key={a.id}>
                    <TD>
                      <p className="font-bold">#{a.rank}</p>
                      <Badge tone="gold">{a.prize.title}</Badge>
                      <p className="mt-1 text-xs text-navy-500">{a.prize.competition.title}</p>
                    </TD>
                    <TD>
                      <Link href={`/admin/students/${u.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                        {u.fullName}
                      </Link>
                      <p className="text-xs text-navy-500">{u.phone}</p>
                    </TD>
                    <TD className="text-xs text-navy-600">
                      {p ? (
                        <>
                          {p.institution} · {p.district}
                          <br />
                          DOB {p.dateOfBirth.toISOString().slice(0, 10)} (age {ageOn(p.dateOfBirth)})
                          {ageOn(p.dateOfBirth) < 18 && (
                            <>
                              <br />
                              Guardian: {p.guardianName} ({p.guardianRelation}) {p.guardianPhone} {p.guardianConsentVerified ? "✓" : ""}
                            </>
                          )}
                          <br />
                          Publishing consent: {p.mediaConsent ? "full name & photos" : `initials only (${publicName(u.fullName, "INITIALS")})`}
                        </>
                      ) : (
                        "No profile"
                      )}
                    </TD>
                    <TD>
                      <StatusBadge status={a.status} />
                      {a.verifiedAt && <p className="mt-1 text-xs text-navy-500">{formatDateTime(a.verifiedAt)}</p>}
                      {a.verificationNotes && <p className="mt-1 max-w-48 text-xs text-navy-500">{a.verificationNotes}</p>}
                      {a.distribution && <p className="mt-1 text-xs">Delivery: {label(a.distribution.status)}</p>}
                    </TD>
                    <TD>
                      <ActionForm action={reviewAllocationAction} compact className="flex min-w-56 flex-col gap-1">
                        <input type="hidden" name="allocationId" value={a.id} />
                        <Input name="notes" placeholder="What was checked / reason" required className="h-8 py-1 text-xs" />
                        <div className="flex flex-wrap gap-1">
                          {a.status !== ALLOCATION_STATUS.VERIFIED && <SubmitButton size="xs" name="decision" value="VERIFIED">Verify</SubmitButton>}
                          {a.status !== ALLOCATION_STATUS.REJECTED && <SubmitButton size="xs" variant="danger-soft" name="decision" value="REJECTED">Reject</SubmitButton>}
                          {a.status !== ALLOCATION_STATUS.FORFEITED && <SubmitButton size="xs" variant="ghost" name="decision" value="FORFEITED">Forfeit</SubmitButton>}
                        </div>
                      </ActionForm>
                    </TD>
                    <TD>
                      {a.status === ALLOCATION_STATUS.VERIFIED ? (
                        <form action={togglePublicWinnerAction.bind(null, a.id)}>
                          <button type="submit" className={buttonClasses(a.publicApproved ? "secondary" : "primary", "xs")}>
                            {a.publicApproved ? "Hide from Winners page" : "Approve for Winners page"}
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-navy-400">Verify first</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
