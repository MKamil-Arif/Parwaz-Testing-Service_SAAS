// Pure helpers about a competition's lifecycle and eligibility (no database access).
import { ageOn } from "@/lib/format";
import { CLASS_LEVELS, OUTSIDE_SINDH } from "@/lib/constants";

export type CompetitionTimes = {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  examStartsAt: Date;
  examEndsAt: Date;
};

export type Phase = "UPCOMING" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "EXAM_LIVE" | "COMPLETED";

/**
 * Registration may overlap the exam window (rolling practice rounds), so an open registration
 * window takes precedence over "exam live" for display and registration purposes.
 */
export function competitionPhase(c: CompetitionTimes, now: Date = new Date()): Phase {
  if (now > c.examEndsAt) return "COMPLETED";
  if (now >= c.registrationOpensAt && now <= c.registrationClosesAt) return "REGISTRATION_OPEN";
  if (now >= c.examStartsAt) return "EXAM_LIVE";
  if (now < c.registrationOpensAt) return "UPCOMING";
  return "REGISTRATION_CLOSED";
}

export const PHASE_LABEL: Record<Phase, string> = {
  UPCOMING: "Upcoming",
  REGISTRATION_OPEN: "Registration open",
  REGISTRATION_CLOSED: "Registration closed",
  EXAM_LIVE: "Examination live",
  COMPLETED: "Completed",
};

export type ListFilter = "active" | "upcoming" | "completed";

export function phaseGroup(phase: Phase): ListFilter {
  if (phase === "UPCOMING") return "upcoming";
  if (phase === "COMPLETED") return "completed";
  return "active";
}

export function isRegistrationOpen(c: CompetitionTimes, now: Date = new Date()): boolean {
  return competitionPhase(c, now) === "REGISTRATION_OPEN";
}

export function isExamWindowOpen(c: CompetitionTimes, now: Date = new Date()): boolean {
  return now >= c.examStartsAt && now <= c.examEndsAt;
}

export type EligibilityInput = {
  eligibleClasses: string[];
  eligibleProvince: string | null;
  minAge: number | null;
  maxAge: number | null;
  examStartsAt: Date;
};

export type ProfileInput = {
  classLevel: string;
  district: string;
  dateOfBirth: Date;
};

export type EligibilityCheck = { label: string; ok: boolean; detail: string };

export function checkEligibility(c: EligibilityInput, p: ProfileInput): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  if (c.eligibleClasses.length) {
    const ok = c.eligibleClasses.includes(p.classLevel);
    const names = c.eligibleClasses.map((v) => CLASS_LEVELS.find((cl) => cl.value === v)?.label.split(" (")[0] ?? v);
    checks.push({ label: "Class / level", ok, detail: ok ? "Your class is eligible" : `Open to: ${names.join(", ")}` });
  }
  if (c.eligibleProvince === "Sindh") {
    const ok = p.district !== OUTSIDE_SINDH;
    checks.push({ label: "Location", ok, detail: ok ? `${p.district}, Sindh` : "This competition is open to students studying in Sindh" });
  }
  if (c.minAge != null || c.maxAge != null) {
    const age = ageOn(p.dateOfBirth, c.examStartsAt);
    const ok = (c.minAge == null || age >= c.minAge) && (c.maxAge == null || age <= c.maxAge);
    checks.push({
      label: "Age on examination day",
      ok,
      detail: ok ? `${age} years` : `Must be ${c.minAge ?? "any"}–${c.maxAge ?? "any"} years (you will be ${age})`,
    });
  }
  return checks;
}

/** Total marks: uniform marks × question count, or the sum of a fixed pool's marks. */
export function computeTotalMarks(questionCount: number, marksPerQuestion: number | null, poolMarks: number[]): number {
  if (marksPerQuestion != null) return questionCount * marksPerQuestion;
  if (poolMarks.length === questionCount) return poolMarks.reduce((a, b) => a + b, 0);
  return questionCount * (poolMarks[0] ?? 1);
}

/** Problems that must be fixed before a competition can be published. */
export function publishBlockers(input: {
  questionCount: number;
  marksPerQuestion: number | null;
  poolMarks: number[];
  times: CompetitionTimes;
  durationMinutes: number;
  prizeRanges: { rankFrom: number; rankTo: number; quantity: number }[];
}): string[] {
  const issues: string[] = [];
  const { times } = input;
  if (input.poolMarks.length < input.questionCount)
    issues.push(`The question pool has ${input.poolMarks.length} active questions but the exam needs ${input.questionCount}.`);
  if (input.marksPerQuestion == null && input.poolMarks.length > input.questionCount && new Set(input.poolMarks).size > 1)
    issues.push("Students receive different random questions, so all pool questions must carry equal marks (or set a uniform 'marks per question').");
  if (!(times.registrationOpensAt < times.registrationClosesAt)) issues.push("Registration must open before it closes.");
  if (!(times.registrationClosesAt <= times.examEndsAt)) issues.push("Registration must close before the examination window closes.");
  if (!(times.examStartsAt < times.examEndsAt)) issues.push("The examination window must end after it starts.");
  if ((times.examEndsAt.getTime() - times.examStartsAt.getTime()) / 60000 < input.durationMinutes)
    issues.push("The examination window must be at least as long as the exam duration.");
  for (const p of input.prizeRanges) {
    if (p.rankTo < p.rankFrom) issues.push(`Prize rank range ${p.rankFrom}–${p.rankTo} is invalid.`);
    if (p.rankTo - p.rankFrom + 1 !== p.quantity) issues.push(`Prize ranks ${p.rankFrom}–${p.rankTo} do not match quantity ${p.quantity}.`);
  }
  const sorted = [...input.prizeRanges].sort((a, b) => a.rankFrom - b.rankFrom);
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].rankFrom <= sorted[i - 1].rankTo) issues.push("Prize rank ranges overlap.");
  return issues;
}
