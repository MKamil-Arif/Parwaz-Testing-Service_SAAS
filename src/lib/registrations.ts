import { db } from "@/lib/db";
import { NOTIFICATION_TYPE, REFERRAL_STATUS } from "@/lib/constants";
import { notify } from "@/lib/notifications";
import { formatDateTime } from "@/lib/format";

/** Side effects once a registration becomes CONFIRMED (after a verified payment or for free competitions). */
export async function onRegistrationConfirmed(registrationId: number): Promise<void> {
  const reg = await db.competitionRegistration.findUnique({
    where: { id: registrationId },
    include: { competition: true },
  });
  if (!reg) return;

  await notify(reg.userId, {
    type: NOTIFICATION_TYPE.REGISTRATION,
    title: "Registration confirmed",
    body: `Your registration ${reg.registrationNumber} for "${reg.competition.title}" is confirmed. The examination window opens on ${formatDateTime(reg.competition.examStartsAt)} and closes on ${formatDateTime(reg.competition.examEndsAt)} (Pakistan time).`,
    link: "/dashboard/exams",
    email: true,
  });

  await db.referral.updateMany({
    where: { referredUserId: reg.userId, status: REFERRAL_STATUS.SIGNED_UP },
    data: { status: REFERRAL_STATUS.CONVERTED, convertedAt: new Date() },
  });
}
