import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CAMPAIGN_STATUS, COMPETITION_STATUS } from "@/lib/constants";
import { formatDate, formatPKR } from "@/lib/format";
import { PageHero } from "@/components/site/sections";
import { Prose } from "@/components/ui/prose";
import { buttonClasses } from "@/components/ui/button";
import { ShareButtons } from "@/components/ui/client-widgets";

export const metadata: Metadata = { title: "Rewarding Potential" };

/** Campaign landing page (Admin → Marketing → Campaigns). Visits are counted; attribution cookie is set by the proxy. */
export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await db.marketingCampaign.findFirst({
    where: { slug, landingEnabled: true, status: { in: [CAMPAIGN_STATUS.ACTIVE, CAMPAIGN_STATUS.PLANNED] } },
    include: { landingCompetition: true },
  });
  if (!campaign) notFound();
  await db.marketingCampaign.update({ where: { id: campaign.id }, data: { visitCount: { increment: 1 } } });

  const comp = campaign.landingCompetition?.status === COMPETITION_STATUS.PUBLISHED ? campaign.landingCompetition : null;
  return (
    <>
      <PageHero eyebrow="Rewarding Potential" title={campaign.landingHeadline ?? campaign.name}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className={buttonClasses("gold", "lg")}>
            Register now
          </Link>
          {comp && (
            <Link href={`/competitions/${comp.slug}`} className={buttonClasses("light", "lg")}>
              {comp.title}
            </Link>
          )}
        </div>
      </PageHero>
      <section className="container-page grid max-w-5xl gap-8 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div>{campaign.landingBody ? <Prose>{campaign.landingBody}</Prose> : null}</div>
        {comp && (
          <aside className="h-fit rounded-3xl border border-navy-100 bg-white p-6 shadow-card">
            <p className="text-xs font-bold tracking-[0.14em] text-gold-600 uppercase">Featured competition</p>
            <p className="mt-2 text-lg font-bold">{comp.title}</p>
            <p className="mt-1 text-sm text-navy-600">{comp.summary}</p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Fee</dt>
                <dd className="font-semibold">{formatPKR(comp.registrationFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Registration closes</dt>
                <dd className="font-semibold">{formatDate(comp.registrationClosesAt)}</dd>
              </div>
            </dl>
          </aside>
        )}
        <div className="lg:col-span-2">
          <ShareButtons url={`/l/${campaign.slug}`} text={campaign.landingHeadline ?? campaign.name} />
        </div>
      </section>
    </>
  );
}
