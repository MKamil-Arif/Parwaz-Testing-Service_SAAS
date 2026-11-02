import { describe, expect, it } from "vitest";
import { prizeForRank, rankResults, type RankInput } from "@/lib/exam/ranking";

const r = (resultId: number, score: number, incorrect = 0, time = 1000, submitted = "2027-01-24T10:00:00Z", registered = "2026-12-01T00:00:00Z"): RankInput => ({
  resultId,
  score,
  incorrectCount: incorrect,
  timeTakenSeconds: time,
  submittedAt: new Date(submitted),
  registeredAt: new Date(registered),
});

describe("rankResults (published tie-break rules)", () => {
  it("ranks by score first", () => {
    expect(rankResults([r(1, 50), r(2, 80), r(3, 65)]).map((x) => x.resultId)).toEqual([2, 3, 1]);
  });

  it("breaks ties by fewer incorrect answers, then less time, then earlier submission, then earlier registration", () => {
    const ranked = rankResults([
      r(1, 70, 5, 900),
      r(2, 70, 3, 1200),
      r(3, 70, 3, 1000),
      r(4, 70, 3, 1000, "2027-01-24T09:00:00Z"),
      r(5, 70, 3, 1000, "2027-01-24T09:00:00Z", "2026-11-15T00:00:00Z"),
    ]);
    expect(ranked.map((x) => x.resultId)).toEqual([5, 4, 3, 2, 1]);
  });

  it("assigns unique, gap-free ranks starting at 1", () => {
    const ranked = rankResults([r(1, 10), r(2, 10), r(3, 10)]);
    expect(ranked.map((x) => x.rank)).toEqual([1, 2, 3]);
  });
});

describe("prizeForRank", () => {
  const prizes = [
    { id: 1, rankFrom: 1, rankTo: 10 },
    { id: 2, rankFrom: 11, rankTo: 30 },
  ];
  it("maps ranks 1–10 to laptops and 11–30 to Chromebooks", () => {
    expect(prizeForRank(1, prizes)?.id).toBe(1);
    expect(prizeForRank(10, prizes)?.id).toBe(1);
    expect(prizeForRank(11, prizes)?.id).toBe(2);
    expect(prizeForRank(30, prizes)?.id).toBe(2);
    expect(prizeForRank(31, prizes)).toBeNull();
    expect(prizeForRank(null, prizes)).toBeNull();
  });
});
