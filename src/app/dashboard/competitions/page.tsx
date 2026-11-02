import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getPublicCompetitions, prizeCount } from "@/lib/queries";
import { PHASE_LABEL } from "@/lib/competition-rules";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/layout";
import { PhaseBadge } from "@/components/site/competition-card";
import { SampleBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Browse competitions" };

export default async function BrowseCompetitionsPage() {
  const { user } = await requireStudent();
  const [competitions, regs] = await Promise.all([
    getPublicCompetitions(),
    db.competitionRegistration.findMany({ where: { userId: user.id } }),
  ]);
  const regBy = new Map(regs.map((r) => [r.competitionId, r]));
  const sorted = [...competitions].sort((a, b) => Number(a.phase === "COMPLETED") - Number(b.phase === "COMPLETED"));

  return (
    <>
      <PageHeader title="Browse competitions" description="Register for open competitions. Your place is confirmed once payment is verified." />
      {sorted.length === 0 ? (
        <EmptyState icon={Trophy} title="No competitions published yet" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {sorted.map((c) => {
            const reg = regBy.get(c.id);
            const active = reg && reg.status !== REGISTRATION_STATUS.CANCELLED;
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <PhaseBadge phase={c.phase} />
                  {c.isDemo && <SampleBadge>Practice / demo</SampleBadge>}
                  {active && <StatusBadge status={reg.status} />}
                </div>
                <h2 className="mt-3 text-lg font-bold">{c.title}</h2>
                <p className="mt-1 text-sm text-navy-600">{c.summary}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-navy-500">Fee</dt>
                    <dd className="font-semibold">{Number(c.registrationFee) ? formatPKR(c.registrationFee) : "Free"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Prizes</dt>
                    <dd className="font-semibold">{c.prizes.length ? `${prizeCount(c.prizes)} devices` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Registration closes</dt>
                    <dd className="font-semibold">{formatDateTime(c.registrationClosesAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-navy-500">Exam window</dt>
                    <dd className="font-semibold">{formatDateTime(c.examStartsAt)}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
                  {active && reg.status === REGISTRATION_STATUS.PENDING_PAYMENT ? (
                    <Link href={`/dashboard/registrations/${reg.id}/pay`} className={buttonClasses("gold", "sm")}>
                      Complete payment
                    </Link>
                  ) : active ? (
                    <Link href="/dashboard/exams" className={buttonClasses("primary", "sm")}>
                      My examinations
                    </Link>
                  ) : c.phase === "REGISTRATION_OPEN" ? (
                    <Link href={`/dashboard/competitions/${c.slug}/register`} className={buttonClasses("primary", "sm")}>
                      Register
                    </Link>
                  ) : (
                    <span className="text-sm text-navy-500">{PHASE_LABEL[c.phase]}</span>
                  )}
                  <Link href={`/competitions/${c.slug}`} className={buttonClasses("secondary", "sm")}>
                    Full details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
