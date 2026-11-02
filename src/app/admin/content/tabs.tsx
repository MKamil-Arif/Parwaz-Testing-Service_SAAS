import { LinkTabs } from "@/components/ui/layout";

export const CONTENT_PAGES = [
  { slug: "privacy-policy", label: "Privacy policy" },
  { slug: "terms", label: "Terms & conditions" },
  { slug: "refund-policy", label: "Refund policy" },
  { slug: "competition-rules", label: "Competition rules" },
];

export function ContentTabs({ active }: { active: string }) {
  return (
    <LinkTabs
      tabs={[
        { href: "/admin/content", label: "Site texts & contact", active: active === "settings" },
        { href: "/admin/content/faqs", label: "FAQs", active: active === "faqs" },
        { href: "/admin/content/testimonials", label: "Testimonials", active: active === "testimonials" },
        ...CONTENT_PAGES.map((p) => ({ href: `/admin/content/pages/${p.slug}`, label: p.label, active: active === p.slug })),
      ]}
    />
  );
}
