import { describe, expect, it } from "vitest";
import { checkEligibility, competitionPhase, computeTotalMarks, publishBlockers } from "@/lib/competition-rules";

const times = {
  registrationOpensAt: new Date("2026-11-01T00:00:00Z"),
  registrationClosesAt: new Date("2027-01-15T00:00:00Z"),
  examStartsAt: new Date("2027-01-24T05:00:00Z"),
  examEndsAt: new Date("2027-01-24T17:00:00Z"),
};

describe("competitionPhase", () => {
  it("moves through the lifecycle", () => {
    expect(competitionPhase(times, new Date("2026-10-01"))).toBe("UPCOMING");
    expect(competitionPhase(times, new Date("2026-12-01"))).toBe("REGISTRATION_OPEN");
    expect(competitionPhase(times, new Date("2027-01-20"))).toBe("REGISTRATION_CLOSED");
    expect(competitionPhase(times, new Date("2027-01-24T08:00:00Z"))).toBe("EXAM_LIVE");
    expect(competitionPhase(times, new Date("2027-01-25"))).toBe("COMPLETED");
  });

  it("keeps registration open when it overlaps the exam window (practice rounds)", () => {
    const rolling = { ...times, registrationClosesAt: times.examEndsAt, examStartsAt: times.registrationOpensAt };
    expect(competitionPhase(rolling, new Date("2026-12-01"))).toBe("REGISTRATION_OPEN");
  });
});

describe("checkEligibility", () => {
  const comp = { eligibleClasses: ["CLASS_9", "CLASS_10"], eligibleProvince: "Sindh", minAge: null, maxAge: null, examStartsAt: times.examStartsAt };
  it("accepts an eligible Sindh student", () => {
    const checks = checkEligibility(comp, { classLevel: "CLASS_10", district: "Sukkur", dateOfBirth: new Date("2010-01-01") });
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it("rejects an ineligible class or a student outside Sindh", () => {
    const checks = checkEligibility(comp, { classLevel: "CLASS_12", district: "Outside Sindh", dateOfBirth: new Date("2008-01-01") });
    expect(checks.filter((c) => !c.ok).map((c) => c.label)).toEqual(["Class / level", "Location"]);
  });
  it("checks age on examination day", () => {
    const checks = checkEligibility({ ...comp, minAge: 14, maxAge: 16 }, { classLevel: "CLASS_9", district: "Badin", dateOfBirth: new Date("2005-01-01") });
    expect(checks.find((c) => c.label.startsWith("Age"))?.ok).toBe(false);
  });
});

describe("totals and publishing", () => {
  it("computes total marks", () => {
    expect(computeTotalMarks(100, 1, [])).toBe(100);
    expect(computeTotalMarks(3, null, [1, 2, 3])).toBe(6);
  });

  it("blocks publishing with a short pool, unequal random marks or overlapping prizes", () => {
    const issues = publishBlockers({
      questionCount: 3,
      marksPerQuestion: null,
      poolMarks: [1, 2, 1, 1],
      times,
      durationMinutes: 90,
      prizeRanges: [
        { rankFrom: 1, rankTo: 10, quantity: 10 },
        { rankFrom: 10, rankTo: 29, quantity: 20 },
      ],
    });
    expect(issues.some((i) => i.includes("equal marks"))).toBe(true);
    expect(issues.some((i) => i.includes("overlap"))).toBe(true);
    expect(publishBlockers({ questionCount: 5, marksPerQuestion: 1, poolMarks: [1, 1], times, durationMinutes: 90, prizeRanges: [] })[0]).toContain("pool");
  });

  it("accepts the initial competition configuration", () => {
    const issues = publishBlockers({
      questionCount: 100,
      marksPerQuestion: 1,
      poolMarks: Array(120).fill(1),
      times,
      durationMinutes: 90,
      prizeRanges: [
        { rankFrom: 1, rankTo: 10, quantity: 10 },
        { rankFrom: 11, rankTo: 30, quantity: 20 },
      ],
    });
    expect(issues).toEqual([]);
  });
});
