import Link from "next/link";
import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { ANNOUNCEMENT_TYPE } from "@/lib/constants";

/** Site-wide promotional banner managed in Admin → Marketing → Announcements. */
export async function AnnouncementBar() {
  const now = new Date();
  const banner = await db.announcement.findFirst({
    where: {
      type: ANNOUNCEMENT_TYPE.BANNER,
      isPublished: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!banner) return null;
  return (
    <div className="bg-gradient-to-r from-gold-400 via-gold-300 to-gold-400 text-navy-950">
      <div className="container-page flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm font-semibold">
        <Megaphone className="hidden size-4 sm:block" />
        <span>{banner.title}</span>
        {banner.linkUrl && (
          <Link href={banner.linkUrl} className="underline decoration-navy-950/40 underline-offset-2 hover:decoration-navy-950">
            {banner.linkLabel ?? "Learn more"} →
          </Link>
        )}
      </div>
    </div>
  );
}
