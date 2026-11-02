import { db } from "@/lib/db";
import { ATTEMPT_STATUS, REGISTRATION_STATUS, RESULTS_STATUS } from "@/lib/constants";
import { ageOn } from "@/lib/format";

/** All of a student's registrations with competition, payments, attempts and results. */
export async function getStudentRegistrations(userId: number) {
  return db.competitionRegistration.findMany({
    where: { userId },
    include: {
      competition: { include: { prizes: true } },
      payments: { orderBy: { createdAt: "desc" } },
      attempts: { orderBy: { attemptNumber: "desc" }, include: { result: { include: { prizeAllocation: { include: { prize: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type StudentRegistration = Awaited<ReturnType<typeof getStudentRegistrations>>[number];

/** The attempt that counts for a registration (latest non-voided). */
export function activeAttempt(reg: StudentRegistration) {
  return reg.attempts.find((a) => a.status !== ATTEMPT_STATUS.VOIDED) ?? null;
}

/** A result is visible to the student once results are published (or instantly for practice rounds). */
export function resultVisible(reg: StudentRegistration): boolean {
  return reg.competition.resultsStatus === RESULTS_STATUS.PUBLISHED || reg.competition.showInstantResults;
}

export function profileCompletion(user: {
  emailVerifiedAt: Date | null;
  phone: string;
  profile: { city: string; district: string; institution: string; classLevel: string; dateOfBirth: Date; guardianConsentAt: Date | null } | null;
}): { percent: number; missing: string[] } {
  const p = user.profile;
  const minor = p ? ageOn(p.dateOfBirth) < 18 : false;
  const items: [boolean, string][] = [
    [!!user.emailVerifiedAt, "Verify your email address"],
    [!!user.phone, "Add a mobile number"],
    [!!p?.city && !!p?.district, "Add your city and district"],
    [!!p?.institution, "Add your school or college"],
    [!!p?.classLevel, "Select your class"],
    [!minor || !!p?.guardianConsentAt, "Record parent/guardian consent"],
  ];
  const done = items.filter(([ok]) => ok).length;
  return { percent: Math.round((done / items.length) * 100), missing: items.filter(([ok]) => !ok).map(([, t]) => t) };
}

export function isUpcomingExam(reg: StudentRegistration, now = new Date()): boolean {
  return reg.status === REGISTRATION_STATUS.CONFIRMED && reg.competition.examEndsAt > now && !activeAttempt(reg)?.submittedAt;
}
