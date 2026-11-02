import { LinkTabs } from "@/components/ui/layout";

export function MarketingTabs({ active }: { active: "overview" | "announcements" | "newsletter" }) {
  return (
    <LinkTabs
      tabs={[
        { href: "/admin/marketing", label: "Analytics & campaigns", active: active === "overview" },
        { href: "/admin/marketing/announcements", label: "Announcements & banners", active: active === "announcements" },
        { href: "/admin/marketing/newsletter", label: "Newsletter", active: active === "newsletter" },
      ]}
    />
  );
}
