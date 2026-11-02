// Pure merit-list ranking with the published tie-breaking rules.

export const DEFAULT_TIE_BREAK_POLICY = `Students are ranked by total score (highest first). If two or more students have the same score, the tie is broken in this order:

1. **Fewer incorrect answers** ranks higher (rewards accuracy over guessing).
2. **Less time taken** to complete the examination ranks higher.
3. **Earlier final submission time** ranks higher.
4. **Earlier competition registration** ranks higher.

Only results verified by the Rewarding Potential team are ranked. Withheld or disqualified results are excluded. Final merit lists are approved by an administrator before publication.`;

export type RankInput = {
  resultId: number;
  score: number;
  incorrectCount: number;
  timeTakenSeconds: number;
  submittedAt: Date;
  registeredAt: Date;
};

export function compareForMerit(a: RankInput, b: RankInput): number {
  return (
    b.score - a.score ||
    a.incorrectCount - b.incorrectCount ||
    a.timeTakenSeconds - b.timeTakenSeconds ||
    a.submittedAt.getTime() - b.submittedAt.getTime() ||
    a.registeredAt.getTime() - b.registeredAt.getTime() ||
    a.resultId - b.resultId
  );
}

/** Returns a unique, gap-free merit position for every result. */
export function rankResults(results: RankInput[]): { resultId: number; rank: number }[] {
  return [...results].sort(compareForMerit).map((r, i) => ({ resultId: r.resultId, rank: i + 1 }));
}

export type PrizeTier = { id: number; rankFrom: number; rankTo: number };

export function prizeForRank<T extends PrizeTier>(rank: number | null | undefined, prizes: T[]): T | null {
  if (rank == null) return null;
  return prizes.find((p) => rank >= p.rankFrom && rank <= p.rankTo) ?? null;
}
