// Pure grading logic for an examination attempt.
import { QUESTION_TYPE } from "@/lib/constants";

export type GradableAnswer = {
  id: number;
  type: string;
  /** Marks this question carries in this competition. */
  marks: number;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  textAnswer: string | null;
  /** Marks awarded by a human reviewer (manual questions only); null = not yet reviewed. */
  reviewedMarks: number | null;
};

export type GradedAnswer = { id: number; isCorrect: boolean | null; marksAwarded: number | null };

export type GradeSummary = {
  perAnswer: GradedAnswer[];
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  pendingReview: number;
  score: number;
  maxScore: number;
  percentage: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Objective questions are marked automatically; a wrong MCQ answer deducts `negativeMarking`.
 * Manual-review questions stay pending until a reviewer awards marks.
 * The final score never goes below zero.
 */
export function gradeAttempt(answers: GradableAnswer[], negativeMarking: number): GradeSummary {
  const perAnswer: GradedAnswer[] = [];
  let correct = 0, incorrect = 0, unanswered = 0, pendingReview = 0, raw = 0, maxScore = 0;

  for (const a of answers) {
    maxScore += a.marks;
    if (a.type === QUESTION_TYPE.SHORT_ANSWER) {
      if (!a.textAnswer || !a.textAnswer.trim()) {
        unanswered++;
        perAnswer.push({ id: a.id, isCorrect: null, marksAwarded: 0 });
      } else if (a.reviewedMarks == null) {
        pendingReview++;
        perAnswer.push({ id: a.id, isCorrect: null, marksAwarded: null });
      } else {
        const awarded = Math.min(Math.max(a.reviewedMarks, 0), a.marks);
        raw += awarded;
        if (awarded > 0) correct++;
        else incorrect++;
        perAnswer.push({ id: a.id, isCorrect: awarded > 0, marksAwarded: awarded });
      }
      continue;
    }

    if (a.selectedOptionId == null) {
      unanswered++;
      perAnswer.push({ id: a.id, isCorrect: null, marksAwarded: 0 });
    } else if (a.selectedOptionId === a.correctOptionId) {
      correct++;
      raw += a.marks;
      perAnswer.push({ id: a.id, isCorrect: true, marksAwarded: a.marks });
    } else {
      incorrect++;
      raw -= negativeMarking;
      perAnswer.push({ id: a.id, isCorrect: false, marksAwarded: -negativeMarking });
    }
  }

  const score = round2(Math.max(0, raw));
  return {
    perAnswer,
    total: answers.length,
    correct,
    incorrect,
    unanswered,
    pendingReview,
    score,
    maxScore: round2(maxScore),
    percentage: maxScore > 0 ? round2((score / maxScore) * 100) : 0,
  };
}
