import { db } from "@/lib/db";
import { RESULT_STATUS } from "@/lib/constants";
import { publicName } from "@/lib/format";
import { prizeForRank } from "@/lib/exam/ranking";

/** Ranked, verified results of a competition with privacy-safe display names. */
export async function getLeaderboard(competitionId: number, limit = 100) {
  const [rows, prizes] = await Promise.all([
    db.examResult.findMany({
      where: { meritRank: { not: null }, status: RESULT_STATUS.VERIFIED, attempt: { registration: { competitionId } } },
      orderBy: { meritRank: "asc" },
      take: limit,
      include: { attempt: { include: { registration: { include: { user: { include: { profile: true } } } } } } },
    }),
    db.prize.findMany({ where: { competitionId } }),
  ]);
  return rows.map((r) => {
    const user = r.attempt.registration.user;
    return {
      resultId: r.id,
      userId: user.id,
      rank: r.meritRank!,
      name: publicName(user.fullName, user.profile?.leaderboardNameMode),
      district: user.profile?.district ?? "—",
      score: r.score,
      maxScore: r.maxScore,
      percentage: r.percentage,
      prize: prizeForRank(r.meritRank, prizes)?.title ?? null,
    };
  });
}
