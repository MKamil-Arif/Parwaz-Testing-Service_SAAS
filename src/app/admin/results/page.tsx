import Link from "next/link";
import type { Metadata } from "next";
import { Award } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { RESULT_STATUS } from "@/lib/constants";
import { competitionPhase, PHASE_LABEL } from "@/lib/competition-rules";
import { formatDateTime } from "@/lib/format";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Results & merit lists" };

export default async function ResultsAdminPage() {
  await requireStaff("results.manage");
  const comps = await db.competition.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { examStartsAt: "desc" } });
  const rows = await Promise.all(
    comps.map(async (c) => {
      const g = await db.examResult.groupBy({ by: ["status"], _count: { _all: true }, where: { attempt: { registration: { competitionId: c.id } } } });
      const n = (s: string) => g.find((x) => x.status === s)?._count._all ?? 0;
      return { c, total: g.reduce((a, x) => a + x._count._all, 0), verified: n(RESULT_STATUS.VERIFIED), pending: n(RESULT_STATUS.PROVISIONAL) + n(RESULT_STATUS.PENDING_REVIEW) };
    }),
  );
  return (
    <>
      <PageHeader title="Results & merit lists" description="Review submissions, verify results, generate merit lists with the published tie-break rules, approve and publish." />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Award} title="No published competitions yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Competition</TH>
                <TH>Phase</TH>
                <TH>Results</TH>
                <TH>Awaiting verification</TH>
                <TH>Verified</TH>
                <TH>Merit list</TH>
                <TH>Published</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map(({ c, total, verified, pending }) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/results/${c.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {c.title}
                    </Link>
                  </TD>
                  <TD>
                    <Badge>{PHASE_LABEL[competitionPhase(c)]}</Badge>
                  </TD>
                  <TD>{total}</TD>
                  <TD>{pending ? <Badge tone="amber">{pending}</Badge> : 0}</TD>
                  <TD>{verified}</TD>
                  <TD>
                    <StatusBadge status={c.resultsStatus} />
                  </TD>
                  <TD className="text-xs">{formatDateTime(c.resultsPublishedAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
