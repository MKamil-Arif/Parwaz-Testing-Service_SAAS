import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { getPublicCompetitions, getPublicWinners, prizeCount, prizeFund } from "@/lib/queries";
import { formatPKR } from "@/lib/format";
import { PageHero } from "@/components/site/sections";
import { PrizeArt } from "@/components/site/prize-art";
import { PhaseBadge } from "@/components/site/competition-card";
import { EmptyState } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Prize gallery" };

export default async function PrizesPage() {
  const competitions = (await getPublicCompetitions()).filter((c) => c.prizes.length > 0);
  const winners = await getPublicWinners();

  return (
    <>
      <PageHero
        eyebrow="Prize gallery"
        title="Devices that power the next stage of learning"
        description="Prizes are allocated by verified merit position according to each competition's published rules. Values shown are estimates and may vary with market prices."
      />
      <section className="container-page space-y-14 py-14">
        {competitions.length === 0 && (
          <EmptyState icon={Award} title="No prizes announced yet" description="Prize details are published with each competition." />
        )}
        {competitions.map((c) => {
          const compWinners = winners.filter((w) => w.competition.id === c.id);
          return (
            <div key={c.id}>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <PhaseBadge phase={c.phase} />
                  <h2 className="mt-2 text-2xl font-bold">
                    <Link href={`/competitions/${c.slug}`} className="hover:text-brand-700">
                      {c.title}
                    </Link>
                  </h2>
                </div>
                <p className="text-sm text-navy-600">
                  {prizeCount(c.prizes)} devices · Estimated prize fund{" "}
                  <span className="font-display text-lg font-bold text-navy-950">{formatPKR(prizeFund(c.prizes))}</span>
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {c.prizes.map((p) => {
                  const pw = compWinners.filter((w) => w.rank >= p.rankFrom && w.rank <= p.rankTo);
                  return (
                    <article key={p.id} className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card">
                      <div className="bg-gradient-to-b from-navy-50 to-white px-12 pt-10 pb-2">
                        <PrizeArt category={p.category} />
                      </div>
                      <div className="p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="gold">
                            Ranks {p.rankFrom}–{p.rankTo}
                          </Badge>
                          <Badge tone="blue">{p.quantity} units</Badge>
                        </div>
                        <h3 className="mt-3 text-xl font-bold">{p.title}</h3>
                        {p.description && <p className="mt-1 text-sm text-navy-600">{p.description}</p>}
                        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-navy-100 pt-4 text-sm">
                          <div>
                            <dt className="text-navy-500">Est. value each</dt>
                            <dd className="font-semibold">{formatPKR(p.estimatedUnitValue)}</dd>
                          </div>
                          <div>
                            <dt className="text-navy-500">Est. total</dt>
                            <dd className="font-semibold">{formatPKR(p.quantity * Number(p.estimatedUnitValue))}</dd>
                          </div>
                        </dl>
                        <div className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm">
                          {pw.length ? (
                            <>
                              <p className="font-semibold text-navy-900">Verified winners</p>
                              <p className="mt-1 text-navy-600">{pw.map((w) => `#${w.rank} ${w.name}`).join(" · ")}</p>
                            </>
                          ) : (
                            <p className="text-navy-600">Winner information will appear here once results are verified and approved.</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
