import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Eye, HeartHandshake, Scale, Sprout, Target, Telescope } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { PageHero } from "@/components/site/sections";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "About us" };

export default async function AboutPage() {
  const s = await getSettings();
  const blocks = [
    { Icon: Compass, t: "Our purpose", d: s["about.purpose"] },
    { Icon: Target, t: "Our approach to academic testing", d: s["about.approach"] },
    { Icon: Scale, t: "Our commitment to transparency", d: s["about.transparency"] },
    { Icon: HeartHandshake, t: "Our social impact", d: s["about.impact"] },
  ];
  return (
    <>
      <PageHero eyebrow="About Rewarding Potential" title="A fair test for every capable student in Sindh" description={s["about.intro"]} />

      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        <div className="rounded-3xl bg-navy-950 p-8 text-white">
          <Sprout className="size-7 text-gold-300" />
          <h2 className="mt-4 text-2xl font-bold text-white">Mission</h2>
          <p className="mt-3 leading-relaxed text-navy-200">{s["about.mission"]}</p>
        </div>
        <div className="rounded-3xl bg-gold-50 p-8 ring-1 ring-gold-100">
          <Eye className="size-7 text-gold-600" />
          <h2 className="mt-4 text-2xl font-bold">Vision</h2>
          <p className="mt-3 leading-relaxed text-navy-700">{s["about.vision"]}</p>
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {blocks.map(({ Icon, t, d }) => (
            <article key={t} className="rounded-2xl border border-navy-100 bg-white p-7 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-600">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-8 rounded-3xl border border-navy-100 p-8 sm:p-10 lg:grid-cols-[auto_1fr]">
          <span className="grid size-14 place-items-center rounded-2xl bg-navy-950 text-gold-300">
            <Telescope className="size-7" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-gold-600 uppercase">Where we want to go</p>
            <h2 className="mt-2 text-2xl font-bold">Our long-term ambition</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-navy-600">{s["about.future"]}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/competitions" className={buttonClasses("primary", "md")}>
                See current competitions
              </Link>
              <Link href="/contact" className={buttonClasses("secondary", "md")}>
                Partner with us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
