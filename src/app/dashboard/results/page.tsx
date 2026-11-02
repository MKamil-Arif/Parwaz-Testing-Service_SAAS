import Link from "next/link";
import type { Metadata } from "next";
import { Award } from "lucide-react";
import { requireStudent } from "@/lib/auth/guards";
import { activeAttempt, getStudentRegistrations, resultVisible } from "@/lib/student";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "My results" };

export default async function MyResultsPage() {
  const { user } = await requireStudent();
  const regs = (await getStudentRegistrations(user.id)).filter((r) => activeAttempt(r)?.result);
  return (
    <>
      <PageHeader title="My results" description="Results become visible once they are verified and officially published." />
      <Card className="overflow-hidden">
        {regs.length === 0 ? (
          <EmptyState icon={Award} title="No results yet" description="Complete an examination to see your results here." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Competition</TH>
                <TH>Submitted</TH>
                <TH className="text-right">Marks</TH>
                <TH className="text-right">Percentage</TH>
                <TH>Merit position</TH>
                <TH>Prize</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {regs.map((r) => {
                const attempt = activeAttempt(r)!;
                const res = attempt.result!;
                const visible = resultVisible(r);
                const ranked = r.competition.resultsStatus === "PUBLISHED";
                return (
                  <TR key={r.id}>
                    <TD className="font-semibold text-navy-950">
                      {r.competition.title}
                      {r.competition.isDemo && <Badge tone="gold" className="ml-2">Practice</Badge>}
                    </TD>
                    <TD>{formatDateTime(attempt.submittedAt)}</TD>
                    <TD className="text-right tabular-nums">{visible ? `${formatNumber(res.score, 2)} / ${formatNumber(res.maxScore, 2)}` : "—"}</TD>
                    <TD className="text-right tabular-nums">{visible ? formatPercent(res.percentage) : "—"}</TD>
                    <TD>{ranked && res.meritRank ? <span className="font-bold">#{res.meritRank}</span> : visible ? "Not ranked" : <Badge tone="amber">Under verification</Badge>}</TD>
                    <TD>{ranked && res.prizeAllocation ? <Badge tone="gold">{res.prizeAllocation.prize.title}</Badge> : "—"}</TD>
                    <TD className="text-right">
                      {visible && (
                        <Link href={`/dashboard/results/${res.id}`} className="text-sm font-semibold text-brand-700">
                          Details →
                        </Link>
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
