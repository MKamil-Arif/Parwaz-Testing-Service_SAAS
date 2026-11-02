import type { Metadata } from "next";
import { ContentPageView } from "@/components/site/content-page";

export const metadata: Metadata = { title: "Terms and conditions" };

export default function Page() {
  return <ContentPageView slug="terms" eyebrow="Policies" />;
}
