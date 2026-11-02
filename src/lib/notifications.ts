import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/request";

type NotifyInput = {
  type: string;
  title: string;
  body: string;
  link?: string;
  /** Also send the notification by email. */
  email?: boolean;
};

export async function notify(userId: number, input: NotifyInput): Promise<void> {
  await db.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body, link: input.link ?? null },
  });
  if (input.email) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      const link = input.link ? `\n\nOpen: ${appUrl(input.link)}` : "";
      await sendEmail(user.email, input.title, `${input.body}${link}`);
    }
  }
}

/** Fans a notification out to many users. Returns how many were created. */
export async function notifyMany(userIds: number[], input: NotifyInput): Promise<number> {
  const unique = [...new Set(userIds)];
  for (let i = 0; i < unique.length; i += 500) {
    await db.notification.createMany({
      data: unique.slice(i, i + 500).map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      })),
    });
  }
  if (input.email && unique.length) {
    const users = await db.user.findMany({ where: { id: { in: unique } }, select: { email: true } });
    const link = input.link ? `\n\nOpen: ${appUrl(input.link)}` : "";
    for (const u of users) await sendEmail(u.email, input.title, `${input.body}${link}`);
  }
  return unique.length;
}

export async function unreadCount(userId: number): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}
