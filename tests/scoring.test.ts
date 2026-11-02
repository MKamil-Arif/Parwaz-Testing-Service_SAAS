import { describe, expect, it } from "vitest";
import { gradeAttempt, type GradableAnswer } from "@/lib/exam/scoring";

const mcq = (id: number, selected: number | null, correct = 1, marks = 1): GradableAnswer => ({
  id,
  type: "MCQ",
  marks,
  selectedOptionId: selected,
  correctOptionId: correct,
  textAnswer: null,
  reviewedMarks: null,
});

describe("gradeAttempt", () => {
  it("counts correct, incorrect and unanswered questions", () => {
    const g = gradeAttempt([mcq(1, 1), mcq(2, 2), mcq(3, null), mcq(4, 1)], 0);
    expect(g).toMatchObject({ total: 4, correct: 2, incorrect: 1, unanswered: 1, score: 2, maxScore: 4, percentage: 50 });
  });

  it("applies negative marking only to wrong answers", () => {
    const g = gradeAttempt([mcq(1, 1), mcq(2, 2), mcq(3, 3), mcq(4, null)], 0.25);
    expect(g.score).toBe(0.5);
    expect(g.perAnswer.find((a) => a.id === 2)?.marksAwarded).toBe(-0.25);
    expect(g.perAnswer.find((a) => a.id === 4)?.marksAwarded).toBe(0);
  });

  it("never returns a negative total score", () => {
    const g = gradeAttempt([mcq(1, 2), mcq(2, 2)], 1);
    expect(g.score).toBe(0);
    expect(g.percentage).toBe(0);
  });

  it("uses per-question marks", () => {
    const g = gradeAttempt([mcq(1, 1, 1, 2), mcq(2, 1, 1, 3)], 0);
    expect(g.score).toBe(5);
    expect(g.maxScore).toBe(5);
  });

  it("keeps written answers pending until reviewed, then uses reviewer marks (capped)", () => {
    const pending: GradableAnswer = { id: 9, type: "SHORT_ANSWER", marks: 2, selectedOptionId: null, correctOptionId: null, textAnswer: "An answer", reviewedMarks: null };
    expect(gradeAttempt([pending], 0)).toMatchObject({ pendingReview: 1, score: 0 });
    expect(gradeAttempt([{ ...pending, reviewedMarks: 5 }], 0)).toMatchObject({ pendingReview: 0, correct: 1, score: 2 });
    expect(gradeAttempt([{ ...pending, textAnswer: "  " }], 0)).toMatchObject({ unanswered: 1 });
  });
});
