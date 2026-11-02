import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { competitionPhase, PHASE_LABEL } from "@/lib/competition-rules";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, SampleBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Competitions" };

export default async function AdminCompetitionsPage() {
  await requireStaff("competitions.manage");
  const list = await db.competition.findMany({
    orderBy: { examStartsAt: "desc" },
    include: { _count: { select: { questions: true, prizes: true } }, registrations: { select: { status: true } } },
  });
  return (
    <>
      <PageHeader
        title="Competition management"
        description="Create, configure, publish and archive competitions."
        actions={
          <Link href="/admin/competitions/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" /> New competition
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={Trophy} title="No competitions yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Competition</TH>
                <TH>Status</TH>
                <TH>Phase</TH>
                <TH>Fee</TH>
                <TH>Exam window</TH>
                <TH className="text-right">Confirmed / total</TH>
                <TH className="text-right">Pool</TH>
                <TH>Results</TH>
              </tr>
            </THead>
            <tbody>
              {list.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/competitions/${c.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {c.title}
                    </Link>
                    {c.isDemo && <span className="ml-2"><SampleBadge>Demo</SampleBadge></span>}
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD>
                    <Badge>{PHASE_LABEL[competitionPhase(c)]}</Badge>
                  </TD>
                  <TD>{formatPKR(c.registrationFee)}</TD>
                  <TD className="text-xs">{formatDateTime(c.examStartsAt)}</TD>
                  <TD className="text-right tabular-nums">
                    {c.registrations.filter((r) => r.status === REGISTRATION_STATUS.CONFIRMED).length} / {c.registrations.filter((r) => r.status !== REGISTRATION_STATUS.CANCELLED).length}
                  </TD>
                  <TD className={`text-right tabular-nums ${c._count.questions < c.questionCount ? "text-red-600" : ""}`}>
                    {c._count.questions}/{c.questionCount}
                  </TD>
                  <TD>
                    <StatusBadge status={c.resultsStatus} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
