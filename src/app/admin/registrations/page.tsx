import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { REGISTRATION_STATUS, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { cancelRegistrationAction } from "@/actions/admin/operations";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Registrations" };

type SP = { q?: string; competitionId?: string; status?: string; page?: string };

export default async function RegistrationsAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("registrations.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.competitionId ? { competitionId: Number(sp.competitionId) } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.q ? { OR: [{ registrationNumber: { contains: sp.q } }, { user: { fullName: { contains: sp.q } } }, { user: { email: { contains: sp.q } } }] } : {}),
  };
  const [regs, total, competitions] = await Promise.all([
    db.competitionRegistration.findMany({
      where,
      include: { user: { include: { profile: true } }, competition: { select: { title: true } }, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      ...skipTake(page),
    }),
    db.competitionRegistration.count({ where }),
    db.competition.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader
        title="Registration management"
        description={`${total} registration(s)`}
        actions={
          <a href={`/api/admin/export/registrations${sp.competitionId ? `?competitionId=${sp.competitionId}` : ""}`} className={buttonClasses("secondary", "md")}>
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Input name="q" defaultValue={sp.q} placeholder="Registration no., name or email…" className="min-w-48 flex-1" />
          <Select name="competitionId" defaultValue={sp.competitionId ?? ""} placeholder="All competitions" options={competitions.map((c) => ({ value: String(c.id), label: c.title }))} className="w-56" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Any status" options={Object.values(REGISTRATION_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {regs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No registrations found" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Registration</TH>
                <TH>Student</TH>
                <TH>Competition</TH>
                <TH>Latest payment</TH>
                <TH>Created</TH>
                <TH>Status</TH>
                <TH>Cancel</TH>
              </tr>
            </THead>
            <tbody>
              {regs.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-xs">{r.registrationNumber}</TD>
                  <TD>
                    <Link href={`/admin/students/${r.userId}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {r.user.fullName}
                    </Link>
                    <p className="text-xs text-navy-500">{r.user.profile?.district}</p>
                  </TD>
                  <TD>{r.competition.title}</TD>
                  <TD>{r.payments[0] ? <StatusBadge status={r.payments[0].status} /> : "—"}</TD>
                  <TD className="text-xs">{formatDateTime(r.createdAt)}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                    {r.cancellationReason && <p className="mt-1 max-w-48 text-xs text-navy-500">{r.cancellationReason}</p>}
                  </TD>
                  <TD>
                    {(r.status === REGISTRATION_STATUS.PENDING_PAYMENT || r.status === REGISTRATION_STATUS.CONFIRMED) && (
                      <ActionForm action={cancelRegistrationAction} compact className="flex flex-col gap-1">
                        <input type="hidden" name="registrationId" value={r.id} />
                        <Input name="reason" placeholder="Reason" required className="h-8 py-1 text-xs" />
                        <SubmitButton size="xs" variant="danger-soft" confirm="Cancel this registration? The student will be notified.">
                          Cancel
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/registrations" params={{ q: sp.q, competitionId: sp.competitionId, status: sp.status }} />
      </Card>
    </>
  );
}
