import type { Metadata } from "next";
import { ContentPageView } from "@/components/site/content-page";

export const metadata: Metadata = { title: "Competition rules" };

export default function Page() {
  return <ContentPageView slug="competition-rules" eyebrow="Rules" />;
}
