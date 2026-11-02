import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCompetitionBySlug } from "@/lib/queries";
import { getLeaderboard } from "@/lib/leaderboard";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/guards";
import { RESULTS_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PageHero } from "@/components/site/sections";
import { LeaderboardTable } from "@/components/site/leaderboard-table";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Merit list" };

export default async function PublicLeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCompetitionBySlug((await params).slug);
  if (!c || c.resultsStatus !== RESULTS_STATUS.PUBLISHED) notFound();
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const limit = Math.max(10, Number(settings["leaderboard.publicLimit"]) || 100);
  const rows = await getLeaderboard(c.id, limit);

  return (
    <>
      <PageHero
        eyebrow="Official merit list"
        title={c.title}
        description={`Verified results published on ${formatDate(c.resultsPublishedAt)}. Names are shown according to each student's privacy preference.`}
      />
      <section className="container-page space-y-6 py-12">
        <Alert tone="info">
          Rankings follow the published tie-breaking rules. Prize eligibility is subject to identity and eligibility verification; only
          verified winners appear on the Winners page.
        </Alert>
        <Card className="overflow-hidden">
          <LeaderboardTable rows={rows} highlightUserId={user?.id} />
          {rows.length === 0 && <p className="p-6 text-sm text-navy-500">No ranked results.</p>}
        </Card>
      </section>
    </>
  );
}
