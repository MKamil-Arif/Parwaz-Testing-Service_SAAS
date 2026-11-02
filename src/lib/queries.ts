import { db } from "@/lib/db";
import { ALLOCATION_STATUS, CEREMONY_STATUS, COMPETITION_STATUS, REGISTRATION_STATUS, RESULTS_STATUS } from "@/lib/constants";
import { competitionPhase, phaseGroup, type ListFilter } from "@/lib/competition-rules";
import { num, publicName } from "@/lib/format";

const competitionInclude = {
  prizes: { orderBy: { rankFrom: "asc" as const } },
  eligibleClasses: true,
} as const;

export async function getPublicCompetitions(filter?: ListFilter) {
  const list = await db.competition.findMany({
    where: { status: COMPETITION_STATUS.PUBLISHED },
    include: competitionInclude,
    orderBy: { examStartsAt: "asc" },
  });
  const now = new Date();
  return list
    .map((c) => ({ ...c, phase: competitionPhase(c, now) }))
    .filter((c) => !filter || phaseGroup(c.phase) === filter);
}

/** The flagship competition to promote: the next real (non-demo) competition that is not finished. */
export async function getFeaturedCompetition() {
  const list = await getPublicCompetitions();
  const live = list.filter((c) => c.phase !== "COMPLETED");
  return live.find((c) => !c.isDemo) ?? live[0] ?? list.find((c) => !c.isDemo) ?? null;
}

export async function getCompetitionBySlug(slug: string) {
  const c = await db.competition.findFirst({
    where: { slug, status: { in: [COMPETITION_STATUS.PUBLISHED, COMPETITION_STATUS.ARCHIVED] } },
    include: competitionInclude,
  });
  return c ? { ...c, phase: competitionPhase(c) } : null;
}

export function prizeFund(prizes: { quantity: number; estimatedUnitValue: unknown }[]): number {
  return prizes.reduce((sum, p) => sum + p.quantity * num(p.estimatedUnitValue as number), 0);
}

export function prizeCount(prizes: { quantity: number }[]): number {
  return prizes.reduce((sum, p) => sum + p.quantity, 0);
}

export async function confirmedRegistrationCount(competitionId: number) {
  return db.competitionRegistration.count({ where: { competitionId, status: REGISTRATION_STATUS.CONFIRMED } });
}

/** Only verified, publicly approved winners of competitions whose results are published. */
export async function getPublicWinners(competitionId?: number) {
  const rows = await db.prizeAllocation.findMany({
    where: {
      status: ALLOCATION_STATUS.VERIFIED,
      publicApproved: true,
      prize: { competition: { resultsStatus: RESULTS_STATUS.PUBLISHED, ...(competitionId ? { id: competitionId } : {}) } },
    },
    include: {
      prize: { include: { competition: { select: { id: true, title: true, slug: true } } } },
      result: { include: { attempt: { include: { registration: { include: { user: { include: { profile: true } } } } } } } },
    },
    orderBy: [{ prizeId: "asc" }, { rank: "asc" }],
  });
  return rows.map((a) => {
    const user = a.result.attempt.registration.user;
    const consent = user.profile?.mediaConsent ?? false;
    return {
      id: a.id,
      rank: a.rank,
      prizeTitle: a.prize.title,
      prizeCategory: a.prize.category,
      competition: a.prize.competition,
      name: consent ? user.fullName : publicName(user.fullName, "INITIALS"),
      district: user.profile?.district ?? null,
      institution: consent ? (user.profile?.institution ?? null) : null,
    };
  });
}

export async function getPublishedCeremonies() {
  return db.awardCeremony.findMany({
    where: { status: CEREMONY_STATUS.PUBLISHED },
    include: { media: { where: { isPublished: true, consentConfirmed: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { eventDate: "desc" },
  });
}

export async function getFaqs(category?: string) {
  return db.faqItem.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}
