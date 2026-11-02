import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getLeaderboard } from "@/lib/leaderboard";
import { COMPETITION_STATUS, RESULT_STATUS, RESULTS_STATUS } from "@/lib/constants";
import { PageHeader, EmptyState, LinkTabs, Alert } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/site/leaderboard-table";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function StudentLeaderboardPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { user } = await requireStudent();
  const competitions = await db.competition.findMany({
    where: { resultsStatus: RESULTS_STATUS.PUBLISHED, status: { not: COMPETITION_STATUS.DRAFT } },
    orderBy: { resultsPublishedAt: "desc" },
  });
  const selected = competitions.find((x) => String(x.id) === c) ?? competitions[0];
  const rows = selected ? await getLeaderboard(selected.id, 200) : [];
  const mine = selected
    ? await db.examResult.findFirst({
        where: { status: RESULT_STATUS.VERIFIED, attempt: { registration: { userId: user.id, competitionId: selected.id } } },
      })
    : null;

  return (
    <>
      <PageHeader title="Leaderboard" description="Official merit lists of competitions whose results have been published." />
      {!selected ? (
        <Card>
          <EmptyState icon={Trophy} title="No published merit lists yet" description="Leaderboards appear after results are verified and published." />
        </Card>
      ) : (
        <>
          {competitions.length > 1 && (
            <LinkTabs tabs={competitions.map((x) => ({ href: `/dashboard/leaderboard?c=${x.id}`, label: x.title, active: x.id === selected.id }))} />
          )}
          {mine?.meritRank && (
            <Alert tone="success" className="mb-5" title={`Your position: #${mine.meritRank}`}>
              Your row is highlighted below.
            </Alert>
          )}
          <Card className="overflow-hidden">
            <LeaderboardTable rows={rows} highlightUserId={user.id} competitionName={selected.title} />
          </Card>
          <p className="mt-3 text-xs text-navy-500">
            Names follow each student's privacy choice (set in{" "}
            <Link href="/dashboard/profile" className="font-semibold text-brand-700">
              My profile
            </Link>
            ).
          </p>
        </>
      )}
    </>
  );
}
