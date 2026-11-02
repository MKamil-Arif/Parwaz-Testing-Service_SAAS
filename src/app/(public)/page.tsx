import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  Clock,
  Gauge,
  Landmark,
  ListChecks,
  MapPin,
  Quote,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { confirmedRegistrationCount, getFaqs, getFeaturedCompetition, prizeCount, prizeFund } from "@/lib/queries";
import { formatDate, formatDateTime, formatNumber, formatPKR, num } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/competition-rules";
import { SINDH_DISTRICTS } from "@/lib/constants";
import { buttonClasses } from "@/components/ui/button";
import { SampleBadge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/client-widgets";
import { SectionHeading } from "@/components/ui/layout";
import { FaqList, JourneySteps } from "@/components/site/sections";
import { PrizeArt } from "@/components/site/prize-art";
import { NewsletterForm } from "@/components/site/newsletter-form";

export default async function HomePage() {
  const [settings, featured, testimonials, faqs] = await Promise.all([
    getSettings(),
    getFeaturedCompetition(),
    db.testimonial.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    getFaqs(),
  ]);
  const showLive = settings["home.showLiveRegistrationCount"] === "true";
  const liveCount = featured && showLive ? await confirmedRegistrationCount(featured.id) : null;
  const fund = featured ? prizeFund(featured.prizes) : 0;
  const devices = featured ? prizeCount(featured.prizes) : 0;
  const fee = featured ? num(featured.registrationFee) : 0;
  const registerHref = featured ? `/competitions/${featured.slug}` : "/competitions";

  const countdownTarget =
    featured?.phase === "REGISTRATION_OPEN"
      ? { label: "Registration closes in", at: featured.registrationClosesAt }
      : featured?.phase === "UPCOMING"
        ? { label: "Registration opens in", at: featured.registrationOpensAt }
        : featured?.phase === "REGISTRATION_CLOSED"
          ? { label: "Exam window opens in", at: featured.examStartsAt }
          : featured?.phase === "EXAM_LIVE"
            ? { label: "Exam window closes in", at: featured.examEndsAt }
            : null;

  return (
    <>
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden bg-navy-950 bg-grid-dark text-white">
        <div aria-hidden="true" className="absolute -top-40 -right-24 size-[560px] rounded-full bg-brand-600/35 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-48 -left-32 size-[420px] rounded-full bg-gold-500/15 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-navy-100 ring-1 ring-white/15">
              <span className="size-1.5 rounded-full bg-gold-400" />
              {settings["hero.eyebrow"]}
            </p>
            <h1 className="mt-6 text-[42px] leading-[1.05] font-extrabold text-balance text-white sm:text-6xl lg:text-[64px]">
              Test Your Knowledge,{" "}
              <span className="bg-gradient-to-r from-gold-200 via-gold-300 to-gold-500 bg-clip-text text-transparent">Earn Your Future.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">{settings["hero.subheadline"]}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonClasses("gold", "lg")}>
                Register now <ArrowRight className="size-4" />
              </Link>
              <Link href="/competitions" className={buttonClasses("light", "lg")}>
                Explore competitions
              </Link>
            </div>
            <ul className="mt-9 grid max-w-lg grid-cols-1 gap-3 text-sm text-navy-200 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <Wallet className="size-4 text-gold-400" /> {fee ? `${formatPKR(fee)} entry` : "Affordable entry"}
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="size-4 text-gold-400" /> Works on Android
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-gold-400" /> Verified merit list
              </li>
            </ul>
          </div>

          {/* Admit-card style summary of the current competition */}
          {featured ? (
            <div className="relative animate-fade-up [animation-delay:150ms]">
              <div className="absolute -top-5 -right-3 z-10 hidden animate-float rounded-2xl bg-gold-400 px-4 py-3 text-navy-950 shadow-lift sm:block">
                <p className="text-[10px] font-bold tracking-widest uppercase">Prize fund</p>
                <p className="font-display text-xl font-extrabold">{formatPKR(fund)}</p>
              </div>
              <div className="overflow-hidden rounded-3xl bg-white text-navy-900 shadow-lift ring-1 ring-white/10">
                <div className="border-b border-dashed border-navy-200 px-6 pt-6 pb-5">
                  <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">
                    {PHASE_LABEL[featured.phase]} · {featured.isDemo ? "Practice round" : "Current competition"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-navy-950">{featured.title}</h2>
                  {countdownTarget && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-navy-500">{countdownTarget.label}</p>
                      <Countdown target={countdownTarget.at.toISOString()} />
                    </div>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-px bg-navy-100">
                  {[
                    { k: "Registration fee", v: fee ? formatPKR(fee) : "Free", Icon: Wallet },
                    { k: "Exam window opens", v: formatDate(featured.examStartsAt), Icon: CalendarDays },
                    { k: "Duration", v: `${featured.durationMinutes} minutes`, Icon: Clock },
                    { k: "Questions", v: `${featured.questionCount} MCQs`, Icon: ListChecks },
                  ].map(({ k, v, Icon }) => (
                    <div key={k} className="bg-white px-6 py-4">
                      <dt className="flex items-center gap-1.5 text-xs text-navy-500">
                        <Icon className="size-3.5" /> {k}
                      </dt>
                      <dd className="mt-1 font-display text-[17px] font-bold text-navy-950">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-50 px-6 py-4">
                  <div className="text-sm">
                    <p className="font-semibold text-navy-900">
                      {featured.prizes.map((p) => `${p.quantity} ${p.title}s`).join(" + ") || "Merit recognition"}
                    </p>
                    <p className="text-xs text-navy-500">
                      {featured.targetRegistrations
                        ? `Registration target: ${formatNumber(featured.targetRegistrations)} students`
                        : "Open to eligible students in Sindh"}
                      {liveCount !== null && ` · ${formatNumber(liveCount)} confirmed so far`}
                    </p>
                  </div>
                  <Link href={registerHref} className={buttonClasses("primary", "sm")}>
                    Details <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <p className="text-lg font-semibold">Our next competition will be announced soon.</p>
              <p className="mt-2 text-sm text-navy-300">Subscribe below to hear first when registration opens.</p>
            </div>
          )}
        </div>
      </section>

      {/* ───── Trust strip ───── */}
      <section className="border-b border-navy-100 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-7 text-sm md:grid-cols-4">
          {[
            { Icon: Scale, t: "Rules published before registration" },
            { Icon: ShieldCheck, t: "Server-timed, secure online exam" },
            { Icon: BadgeCheck, t: "Results verified before publication" },
            { Icon: MapPin, t: "Built for students across Sindh" },
          ].map(({ Icon, t }) => (
            <p key={t} className="flex items-center gap-3 font-semibold text-navy-800">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-[18px]" />
              </span>
              {t}
            </p>
          ))}
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            align="center"
            eyebrow="How it works"
            title="Five steps from registration to recognition"
            description="A simple, transparent journey — the same for every student, wherever they live."
          />
          <div className="mt-14">
            <JourneySteps />
          </div>
          <p className="mt-12 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:gap-2.5 transition-all">
              Read the full process <ArrowRight className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* ───── Current competition ───── */}
      {featured && (
        <section className="py-20 sm:py-24">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow={featured.isDemo ? "Practice round" : "Current competition"}
                title={featured.title}
                description={featured.summary}
              />
              <div className="mt-6 flex flex-wrap gap-2">
                {featured.subjects.split(",").map((s) => (
                  <span key={s} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                    {s.trim()}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={registerHref} className={buttonClasses("primary", "lg")}>
                  View competition & register
                </Link>
                <Link href="/competition-rules" className={buttonClasses("secondary", "lg")}>
                  Competition rules
                </Link>
              </div>
            </div>
            <ol className="relative space-y-0 rounded-3xl border border-navy-100 bg-white p-6 shadow-card sm:p-8">
              <p className="mb-5 text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">Important dates (Pakistan time)</p>
              {[
                { t: "Registration opens", d: featured.registrationOpensAt },
                { t: "Registration closes", d: featured.registrationClosesAt },
                { t: "Examination window opens", d: featured.examStartsAt },
                { t: "Examination window closes", d: featured.examEndsAt },
              ].map((row, i, arr) => {
                const past = row.d < new Date();
                return (
                  <li key={row.t} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < arr.length - 1 && <span aria-hidden="true" className="absolute top-6 left-[11px] h-full w-px bg-navy-200" />}
                    <span
                      className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-white ${past ? "bg-brand-600 text-white" : "bg-navy-100 text-navy-500"}`}
                    >
                      {past ? <CircleCheck className="size-3.5" /> : <span className="size-2 rounded-full bg-current" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy-950">{row.t}</p>
                      <p className="text-sm text-navy-500">{formatDateTime(row.d)}</p>
                    </div>
                  </li>
                );
              })}
              <li className="mt-6 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-700 ring-1 ring-gold-100">
                Results are published after verification and administrator approval. Winners are announced only once eligibility checks are complete.
              </li>
            </ol>
          </div>
        </section>
      )}

      {/* ───── Prize showcase ───── */}
      {featured && featured.prizes.length > 0 && (
        <section className="relative overflow-hidden bg-navy-950 bg-grid-dark py-20 text-white sm:py-24">
          <div aria-hidden="true" className="absolute top-0 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="container-page relative">
            <SectionHeading
              light
              align="center"
              eyebrow="Prize showcase"
              title={`${devices} devices for ${devices} top performers`}
              description="Prizes are allocated strictly by verified merit position, according to rules published before registration."
            />
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {featured.prizes.map((p) => (
                <div key={p.id} className="rounded-3xl bg-white/[0.04] p-7 ring-1 ring-white/10">
                  <div className="rounded-2xl bg-gradient-to-b from-white to-navy-100 px-10 pt-8 pb-4">
                    <PrizeArt category={p.category} />
                  </div>
                  <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] text-gold-300 uppercase">
                        Ranks {p.rankFrom}–{p.rankTo}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-white">
                        {p.quantity} × {p.title}
                      </h3>
                      {p.description && <p className="mt-1 text-sm text-navy-300">{p.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-navy-400">Est. value each</p>
                      <p className="font-display text-xl font-bold text-gold-300">{formatPKR(p.estimatedUnitValue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-6 py-5 ring-1 ring-white/10 sm:flex-row">
              <p className="text-sm text-navy-200">
                Total estimated prize fund: <span className="font-display text-lg font-bold text-gold-300">{formatPKR(fund)}</span>
              </p>
              <Link href="/prizes" className={buttonClasses("light", "md")}>
                Visit the prize gallery
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───── Why choose us ───── */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Why Rewarding Potential"
            title="A testing business built on fairness you can check"
            description="We run commercial academic competitions with a social purpose. That only works if students, parents and schools can trust the process."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Scale, t: "Merit-based and transparent", d: "Rankings follow published tie-breaking rules. Every result change and approval is logged." },
              { Icon: Wallet, t: "Affordable entry", d: "A single registration fee, clearly stated. Pay by JazzCash, Easypaisa or bank transfer." },
              { Icon: Smartphone, t: "Accessible anywhere in Sindh", d: "Take the exam on an Android phone or computer — no travel to a test centre required." },
              { Icon: ShieldCheck, t: "Secure examination engine", d: "Server-controlled timer, randomized questions, automatic saving and integrity monitoring." },
              { Icon: BadgeCheck, t: "Verified before announced", d: "Results are reviewed and approved by our team. Winners pass an eligibility check first." },
              { Icon: Trophy, t: "Real recognition", d: "Laptops and Chromebooks presented at award ceremonies in major cities of Sindh." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="group rounded-2xl border border-navy-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                <span className="grid size-11 place-items-center rounded-xl bg-navy-950 text-gold-300 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Student benefits ───── */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Student benefits"
              title="More than a chance to win a device"
              description="Every participant gains experience that matters for board exams and future entrance tests."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Practise answering under real, timed exam conditions",
                "See how you compare with students across Sindh",
                "Build familiarity with online, MCQ-based testing used by entrance tests",
                "Receive a detailed result: correct, incorrect and unanswered questions",
                "Earn a laptop or Chromebook that supports your studies if you rank in the top 30",
                "Be celebrated with your family and school at an award ceremony",
              ].map((b) => (
                <li key={b} className="flex gap-3 text-[15px] text-navy-800">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">Example result card</p>
                <SampleBadge>Illustration</SampleBadge>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-gold-100 font-display text-xl font-extrabold text-gold-700">#—</div>
                <div>
                  <p className="font-semibold text-navy-950">Your merit position</p>
                  <p className="text-sm text-navy-500">Published after verification</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "Correct", c: "text-emerald-700 bg-emerald-50" },
                  { k: "Incorrect", c: "text-red-700 bg-red-50" },
                  { k: "Unanswered", c: "text-navy-700 bg-navy-50" },
                ].map((x) => (
                  <div key={x.k} className={`rounded-xl px-2 py-3 ${x.c}`}>
                    <p className="font-display text-lg font-bold">—</p>
                    <p className="text-[11px] font-semibold">{x.k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                <Gauge className="size-4" /> Score, percentage and prize eligibility in your dashboard
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Targets ───── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-navy-900 py-16 text-white">
        <div className="container-page">
          <p className="mb-8 text-center text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
            Our first competition at a glance — targets, not results
          </p>
          <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            {[
              { v: featured?.targetRegistrations ? formatNumber(featured.targetRegistrations) : "—", k: "Student registration target", Icon: Target },
              { v: devices ? String(devices) : "—", k: "Devices to be awarded", Icon: Trophy },
              { v: fund ? formatPKR(fund, { compact: true }) : "—", k: "Estimated prize fund", Icon: Landmark },
              { v: String(SINDH_DISTRICTS.length), k: "Sindh districts eligible", Icon: MapPin },
            ].map(({ v, k, Icon }) => (
              <div key={k}>
                <Icon className="mx-auto size-6 text-gold-300" />
                <dd className="mt-3 font-display text-4xl font-extrabold tabular-nums">{v}</dd>
                <dt className="mt-1 text-sm text-brand-100">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      {testimonials.length > 0 && (
        <section className="py-20 sm:py-24">
          <div className="container-page">
            <SectionHeading
              align="center"
              eyebrow="Voices"
              title="What students and parents tell us"
              description={
                testimonials.some((t) => t.isSample)
                  ? "Cards marked “Sample” are illustrative placeholders. Genuine testimonials will be published, with consent, after our first competition."
                  : undefined
              }
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="flex flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
                  <div className="flex items-start justify-between">
                    <Quote className="size-7 text-gold-400" />
                    {t.isSample && <SampleBadge />}
                  </div>
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-navy-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 border-t border-navy-100 pt-4">
                    <p className="font-semibold text-navy-950">{t.name}</p>
                    <p className="text-sm text-navy-500">{t.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── FAQ ───── */}
      {faqs.length > 0 && (
        <section className="bg-surface py-20 sm:py-24">
          <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading eyebrow="FAQ" title="Questions students and parents ask" />
              <p className="mt-4 text-navy-600">
                Can’t find your answer?{" "}
                <Link href="/contact" className="font-semibold text-brand-700 underline underline-offset-2">
                  Contact our team
                </Link>
                .
              </p>
            </div>
            <FaqList items={faqs.slice(0, 7)} />
          </div>
        </section>
      )}

      {/* ───── CTA ───── */}
      <section className="py-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[28px] bg-navy-950 bg-grid-dark px-6 py-12 text-white sm:px-12">
            <div aria-hidden="true" className="absolute -right-20 -bottom-24 size-80 rounded-full bg-gold-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
                  <Sparkles className="size-3.5" /> Ready when you are
                </p>
                <h2 className="mt-3 text-3xl font-bold text-balance text-white sm:text-4xl">Your knowledge deserves a fair test.</h2>
                <p className="mt-3 text-navy-300">Create your free account today, then register for a competition when you’re ready.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/register" className={buttonClasses("gold", "lg")}>
                    Create your account
                  </Link>
                  <Link href="/how-it-works" className={buttonClasses("light", "lg")}>
                    How it works
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-sm font-semibold">Not ready to register yet?</p>
                <p className="mt-1 mb-3 text-xs text-navy-300">Get registration dates and exam reminders by email.</p>
                <NewsletterForm source="home-cta" dark />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
