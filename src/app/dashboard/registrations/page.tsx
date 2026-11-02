import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireStudent } from "@/lib/auth/guards";
import { getStudentRegistrations } from "@/lib/student";
import { label, REGISTRATION_STATUS } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "My registrations" };

export default async function MyRegistrationsPage() {
  const { user } = await requireStudent();
  const regs = await getStudentRegistrations(user.id);
  return (
    <>
      <PageHeader
        title="My registrations"
        description="Every competition you have registered for, with its registration number and payment status."
        actions={
          <Link href="/dashboard/competitions" className={buttonClasses("primary", "md")}>
            Register for a competition
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {regs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No registrations yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Competition</TH>
                <TH>Registration no.</TH>
                <TH>Registered</TH>
                <TH>Fee</TH>
                <TH>Payment</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {regs.map((r) => {
                const p = r.payments[0];
                return (
                  <TR key={r.id}>
                    <TD className="font-semibold text-navy-950">{r.competition.title}</TD>
                    <TD className="font-mono text-xs">{r.registrationNumber}</TD>
                    <TD>{formatDateTime(r.createdAt)}</TD>
                    <TD>{formatPKR(r.competition.registrationFee)}</TD>
                    <TD>{p ? label(p.status) : "—"}</TD>
                    <TD>
                      <StatusBadge status={r.status} />
                    </TD>
                    <TD className="text-right">
                      {r.status === REGISTRATION_STATUS.PENDING_PAYMENT ? (
                        <Link href={`/dashboard/registrations/${r.id}/pay`} className={buttonClasses("gold", "xs")}>
                          Pay now
                        </Link>
                      ) : r.status === REGISTRATION_STATUS.CONFIRMED ? (
                        <Link href={`/dashboard/exams/${r.registrationNumber}`} className="text-sm font-semibold text-brand-700">
                          Exam →
                        </Link>
                      ) : null}
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
