import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, ListChecks, Trophy } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { PHASE_LABEL, type Phase } from "@/lib/competition-rules";
import { formatDate, formatPKR, num } from "@/lib/format";
import { prizeCount, prizeFund } from "@/lib/queries";

type CompetitionCardData = {
  slug: string;
  title: string;
  summary: string;
  subjects: string;
  registrationFee: unknown;
  registrationClosesAt: Date;
  examStartsAt: Date;
  examEndsAt: Date;
  durationMinutes: number;
  questionCount: number;
  isDemo: boolean;
  phase: Phase;
  resultsStatus: string;
  prizes: { title: string; quantity: number; estimatedUnitValue: unknown }[];
};

export const PHASE_TONE: Record<Phase, "green" | "blue" | "amber" | "neutral" | "violet"> = {
  REGISTRATION_OPEN: "green",
  EXAM_LIVE: "blue",
  REGISTRATION_CLOSED: "amber",
  UPCOMING: "violet",
  COMPLETED: "neutral",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  return (
    <Badge tone={PHASE_TONE[phase]}>
      <span className="size-1.5 rounded-full bg-current" />
      {PHASE_LABEL[phase]}
    </Badge>
  );
}

export function CompetitionCard({ c }: { c: CompetitionCardData }) {
  const fee = num(c.registrationFee as number);
  const fund = prizeFund(c.prizes);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative bg-navy-950 bg-grid-dark px-6 pt-5 pb-6 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={c.phase} />
          {c.isDemo && <SampleBadge>Practice / demo</SampleBadge>}
          {c.resultsStatus === "PUBLISHED" && <Badge tone="gold">Results published</Badge>}
        </div>
        <h3 className="mt-3 text-xl font-bold text-white">{c.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-navy-300">{c.summary}</p>
        <p className="mt-4 font-display text-2xl font-extrabold text-gold-300">
          {fee === 0 ? "Free entry" : formatPKR(fee)}
          {fee > 0 && <span className="ml-1.5 text-sm font-medium text-navy-300">registration fee</span>}
        </p>
      </div>
      <div className="flex flex-1 flex-col px-6 py-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 text-brand-600" />
            <div>
              <dt className="text-xs text-navy-500">Exam window opens</dt>
              <dd className="font-semibold text-navy-900">{formatDate(c.examStartsAt)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 text-brand-600" />
            <div>
              <dt className="text-xs text-navy-500">Duration</dt>
              <dd className="font-semibold text-navy-900">{c.durationMinutes} minutes</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ListChecks className="mt-0.5 size-4 text-brand-600" />
            <div>
              <dt className="text-xs text-navy-500">Questions</dt>
              <dd className="font-semibold text-navy-900">{c.questionCount} MCQs</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Trophy className="mt-0.5 size-4 text-gold-500" />
            <div>
              <dt className="text-xs text-navy-500">Prizes</dt>
              <dd className="font-semibold text-navy-900">
                {c.prizes.length ? `${prizeCount(c.prizes)} devices` : "Recognition only"}
              </dd>
            </div>
          </div>
        </dl>
        {c.prizes.length > 0 && (
          <p className="mt-4 rounded-xl bg-gold-50 px-3 py-2 text-xs font-medium text-gold-700 ring-1 ring-gold-100">
            {c.prizes.map((p) => `${p.quantity} ${p.title}${p.quantity > 1 ? "s" : ""}`).join(" · ")} — est. {formatPKR(fund)} prize fund
          </p>
        )}
        <p className="mt-3 text-xs text-navy-500">
          Subjects: <span className="text-navy-700">{c.subjects}</span>
        </p>
        <div className="mt-auto pt-5">
          <Link
            href={`/competitions/${c.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 group-hover:gap-2.5 transition-all"
          >
            View details & register <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
