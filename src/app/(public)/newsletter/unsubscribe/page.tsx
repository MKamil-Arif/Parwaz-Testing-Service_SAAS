import type { Metadata } from "next";
import { unsubscribeNewsletter } from "@/actions/public";
import { PageHero } from "@/components/site/sections";

export const metadata: Metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await unsubscribeNewsletter(token) : false;
  return (
    <PageHero
      eyebrow="Newsletter"
      title={ok ? "You have been unsubscribed" : "Link not valid"}
      description={ok ? "You will no longer receive competition announcements by email." : "This unsubscribe link is invalid or has already been used."}
    />
  );
}
