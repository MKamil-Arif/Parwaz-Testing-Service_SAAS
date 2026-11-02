import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { getPublicCompetitions } from "@/lib/queries";
import type { ListFilter } from "@/lib/competition-rules";
import { CompetitionCard } from "@/components/site/competition-card";
import { PageHero } from "@/components/site/sections";
import { EmptyState } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Competitions" };

const FILTERS: { key: ListFilter | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export default async function CompetitionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = (["active", "upcoming", "completed"] as const).find((f) => f === status);
  const competitions = await getPublicCompetitions(filter);

  return (
    <>
      <PageHero
        eyebrow="Competitions"
        title="Find your competition"
        description="Every competition lists its eligibility, fee, exam format, prizes and dates up front. Register online and sit the exam from anywhere in Sindh."
      />
      <section className="container-page py-12">
        <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter competitions">
          {FILTERS.map((f) => {
            const active = (filter ?? "all") === f.key;
            return (
              <Link
                key={f.key}
                href={f.key === "all" ? "/competitions" : `/competitions?status=${f.key}`}
                role="tab"
                aria-selected={active}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors",
                  active ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-navy-700 ring-navy-200 hover:bg-navy-50",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        {competitions.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {competitions.map((c) => (
              <CompetitionCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-navy-100 bg-white">
            <EmptyState
              icon={Trophy}
              title={filter ? `No ${filter} competitions right now` : "No competitions published yet"}
              description="New competitions are announced on this page and by email. Subscribe at the bottom of the page to be notified."
            />
          </div>
        )}
      </section>
    </>
  );
}
