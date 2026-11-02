import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { getFaqs } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { FAQ_CATEGORY, label } from "@/lib/constants";
import { FaqList, PageHero } from "@/components/site/sections";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help & support" };

export default async function HelpPage() {
  const [faqs, user] = await Promise.all([getFaqs(), getCurrentUser()]);
  const groups = Object.values(FAQ_CATEGORY)
    .map((cat) => ({ cat, items: faqs.filter((f) => f.category === cat) }))
    .filter((g) => g.items.length);

  return (
    <>
      <PageHero eyebrow="Help & support" title="Answers to common questions" description="Browse by topic, or contact our support team." />
      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_280px]">
        <div className="space-y-10">
          {groups.map((g) => (
            <div key={g.cat} id={g.cat.toLowerCase()}>
              <h2 className="mb-4 text-xl font-bold">{label(g.cat)}</h2>
              <FaqList items={g.items} />
            </div>
          ))}
          {groups.length === 0 && <p className="text-navy-500">Help articles will appear here soon.</p>}
        </div>
        <aside className="h-fit space-y-4 rounded-3xl bg-navy-950 p-6 text-white lg:sticky lg:top-24">
          <LifeBuoy className="size-7 text-gold-300" />
          <p className="text-lg font-bold">Still need help?</p>
          <p className="text-sm text-navy-300">
            {user ? "Open a support ticket from your dashboard to track replies." : "Send us a message and we'll get back to you."}
          </p>
          <Link href={user ? "/dashboard/support" : "/contact"} className={buttonClasses("gold", "md", "w-full")}>
            {user ? "Open a support ticket" : "Contact support"}
          </Link>
          <nav className="border-t border-white/10 pt-4 text-sm">
            {groups.map((g) => (
              <a key={g.cat} href={`#${g.cat.toLowerCase()}`} className="block py-1 text-navy-300 hover:text-white">
                {label(g.cat)}
              </a>
            ))}
          </nav>
        </aside>
      </section>
    </>
  );
}
