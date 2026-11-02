import type { Metadata } from "next";
import { ContentPageView } from "@/components/site/content-page";

export const metadata: Metadata = { title: "Refund policy" };

export default function Page() {
  return <ContentPageView slug="refund-policy" eyebrow="Policies" />;
}
