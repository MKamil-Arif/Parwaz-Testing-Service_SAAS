import Link from "next/link";
import type { Metadata } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/student";
import { PageHeader, EmptyState } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireStudent();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Registration, payment, examination, result and prize updates."
        actions={
          unread > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
                <CheckCheck className="size-4" /> Mark all as read
              </button>
            </form>
          )
        }
      />
      <Card>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" />
        ) : (
          <ul className="divide-y divide-navy-100">
            {items.map((n) => (
              <li key={n.id} className={cn("flex gap-4 px-5 py-4", !n.readAt && "bg-brand-50/40")}>
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.readAt ? "bg-navy-200" : "bg-brand-600")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy-950">{n.title}</p>
                    <Badge>{label(n.type)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-navy-600">{n.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-navy-500">
                    <span>{formatDateTime(n.createdAt)}</span>
                    {n.link && (
                      <Link href={n.link} className="font-semibold text-brand-700">
                        Open →
                      </Link>
                    )}
                    {!n.readAt && (
                      <form action={markNotificationReadAction.bind(null, n.id)}>
                        <button type="submit" className="font-semibold text-navy-600 hover:text-navy-950">
                          Mark as read
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
