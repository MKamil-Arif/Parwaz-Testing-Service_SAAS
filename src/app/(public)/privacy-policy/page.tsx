import type { Metadata } from "next";
import { ContentPageView } from "@/components/site/content-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return <ContentPageView slug="privacy-policy" eyebrow="Policies" />;
}
