import type { Metadata } from "next";
import Link from "next/link";
import { BatteryCharging, Clock, Wifi, Smartphone, ShieldCheck, Bookmark } from "lucide-react";
import { JOURNEY, PageHero } from "@/components/site/sections";
import { buttonClasses } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/layout";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Discover. Register. Compete. Verify. Recognize."
        description="The same transparent five-step journey for every student — from the first click to the award ceremony."
      />
      <section className="container-page py-16">
        <ol className="space-y-6">
          {JOURNEY.map(({ title, text, detail, Icon }, i) => (
            <li key={title} className="grid gap-6 rounded-3xl border border-navy-100 bg-white p-6 shadow-card sm:grid-cols-[auto_1fr] sm:p-8">
              <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                <span className="font-display text-5xl font-extrabold text-navy-100">{String(i + 1).padStart(2, "0")}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-navy-950 text-gold-300">
                  <Icon className="size-6" />
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="mt-2 text-lg text-navy-700">{text}</p>
                <p className="mt-3 leading-relaxed text-navy-600">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface py-16">
        <div className="container-page">
          <SectionHeading eyebrow="Exam day" title="Tips for a smooth online examination" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Smartphone, t: "Use one device", d: "An Android phone with Chrome or a computer works. Don't open the exam on two devices — it is logged." },
              { Icon: BatteryCharging, t: "Charge up", d: "Start with a full battery or keep your charger nearby for the whole exam duration." },
              { Icon: Wifi, t: "Connection drops are OK", d: "Answers save automatically. If you go offline, keep answering — they sync when you reconnect." },
              { Icon: Clock, t: "Watch the server timer", d: "The countdown is controlled by our server. When it reaches zero your exam is submitted automatically." },
              { Icon: Bookmark, t: "Mark for review", d: "Unsure? Mark the question and use the question palette to come back before submitting." },
              { Icon: ShieldCheck, t: "Work independently", d: "Tab switching and copy attempts are recorded for review. Fair play protects every honest student." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
                <Icon className="size-6 text-brand-600" />
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClasses("primary", "lg")}>
              Create your account
            </Link>
            <Link href="/competition-rules" className={buttonClasses("secondary", "lg")}>
              Read the competition rules
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
