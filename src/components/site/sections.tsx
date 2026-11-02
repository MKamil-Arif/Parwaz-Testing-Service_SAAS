import { BadgeCheck, ChevronDown, Search, Sparkles, Trophy, UserPlus, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export const JOURNEY: { title: string; text: string; detail: string; Icon: LucideIcon }[] = [
  {
    title: "Discover",
    text: "Find a competition that matches your class and read its rules, prizes and dates.",
    detail: "Every competition page lists eligibility, subjects, exam duration, prize allocation and the tie-breaking rules — published before registration opens.",
    Icon: Search,
  },
  {
    title: "Register",
    text: "Create your account, confirm eligibility and pay the PKR 500 registration fee.",
    detail: "Registration is confirmed only after your payment is verified. You receive a registration number and confirmation by email and in your dashboard.",
    Icon: UserPlus,
  },
  {
    title: "Compete",
    text: "Sit the timed online exam from your phone or computer during the exam window.",
    detail: "Answers save automatically, the timer is controlled by our server, and your exam is submitted automatically when time ends — even if your connection drops.",
    Icon: PenLine,
  },
  {
    title: "Verify",
    text: "Our team reviews submissions and verifies results before any ranking is published.",
    detail: "Scores are calculated automatically, checked for irregularities, ranked with the published tie-break rules and approved by an administrator before release.",
    Icon: BadgeCheck,
  },
  {
    title: "Recognize",
    text: "Top performers earn laptops and Chromebooks, presented at award ceremonies in Sindh.",
    detail: "Prize winners complete a short identity and eligibility check. Devices are handed over at ceremonies in major cities or delivered securely.",
    Icon: Trophy,
  },
];

export function JourneySteps({ dark }: { dark?: boolean }) {
  return (
    <ol className="relative grid gap-5 md:grid-cols-5 md:gap-4">
      <div
        aria-hidden="true"
        className={cn("absolute top-7 right-[10%] left-[10%] hidden h-px md:block", dark ? "bg-white/15" : "bg-navy-200")}
      />
      {JOURNEY.map(({ title, text, Icon }, i) => (
        <li key={title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
          <span
            className={cn(
              "relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl ring-1",
              dark ? "bg-navy-900 text-gold-300 ring-white/15" : "bg-white text-brand-700 ring-navy-200 shadow-card",
            )}
          >
            <Icon className="size-6" />
            <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-gold-400 text-[11px] font-extrabold text-navy-950">
              {i + 1}
            </span>
          </span>
          <div>
            <h3 className={cn("text-base font-bold md:mt-4", dark && "text-white")}>{title}</h3>
            <p className={cn("mt-1 text-sm leading-relaxed", dark ? "text-navy-300" : "text-navy-600")}>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ items }: { items: { id: number; question: string; answer: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="divide-y divide-navy-100 rounded-2xl border border-navy-100 bg-white shadow-card">
      {items.map((f) => (
        <details key={f.id} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-navy-950">
            {f.question}
            <ChevronDown className="size-5 shrink-0 text-navy-400 transition-transform group-open:rotate-180" />
          </summary>
          <p className="pb-5 text-sm leading-relaxed whitespace-pre-line text-navy-600">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 bg-grid-dark text-white">
      <div aria-hidden="true" className="absolute -top-32 right-0 size-[420px] rounded-full bg-brand-600/30 blur-3xl" />
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
            <Sparkles className="size-3.5" /> {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-extrabold text-balance text-white sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  );
}
