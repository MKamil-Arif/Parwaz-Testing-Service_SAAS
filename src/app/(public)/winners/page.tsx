import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { getPublicWinners } from "@/lib/queries";
import { PageHero } from "@/components/site/sections";
import { EmptyState } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Winners" };

export default async function WinnersPage() {
  const winners = await getPublicWinners();
  const byCompetition = new Map<number, typeof winners>();
  for (const w of winners) (byCompetition.get(w.competition.id) ?? byCompetition.set(w.competition.id, []).get(w.competition.id)!).push(w);

  return (
    <>
      <PageHero
        eyebrow="Winners"
        title="Verified prize winners"
        description="Only winners whose results and eligibility have been verified and officially approved appear here. Names are shown with the student's (and guardian's) consent; otherwise initials are used."
      />
      <section className="container-page py-14">
        {winners.length === 0 ? (
          <div className="rounded-3xl border border-navy-100 bg-white">
            <EmptyState
              icon={Trophy}
              title="No winners announced yet"
              description="Winners are announced after the examination, result verification and eligibility checks are complete. Follow the competition page or subscribe for updates."
              action={
                <Link href="/competitions" className={buttonClasses("primary", "md")}>
                  View competitions
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-12">
            {[...byCompetition.values()].map((list) => (
              <div key={list[0].competition.id}>
                <h2 className="mb-5 text-2xl font-bold">
                  <Link href={`/competitions/${list[0].competition.slug}`} className="hover:text-brand-700">
                    {list[0].competition.title}
                  </Link>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((w) => (
                    <div key={w.id} className="flex items-center gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-xl font-display font-extrabold ${w.rank <= 3 ? "bg-gold-400 text-navy-950" : "bg-navy-50 text-navy-800"}`}
                      >
                        {w.rank <= 3 ? <Medal className="size-5" /> : `#${w.rank}`}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-950">{w.name}</p>
                        <p className="truncate text-sm text-navy-500">
                          {[w.institution, w.district].filter(Boolean).join(" · ")}
                        </p>
                        <Badge tone="gold" className="mt-1.5">
                          #{w.rank} · {w.prizeTitle}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
