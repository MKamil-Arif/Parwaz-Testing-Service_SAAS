import Link from "next/link";
import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { CeremonyForm } from "./ceremony-form";

export const metadata: Metadata = { title: "Award ceremonies" };

export default async function CeremoniesAdminPage() {
  await requireStaff("ceremonies.manage");
  const [ceremonies, competitions] = await Promise.all([
    db.awardCeremony.findMany({ orderBy: { eventDate: "desc" }, include: { _count: { select: { media: true, distributions: true } } } }),
    db.competition.findMany({ select: { id: true, title: true } }),
  ]);
  return (
    <>
      <PageHeader title="Award ceremonies" description="Publish physical award events in cities across Sindh, with photos (consent required), videos and announcements." />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          {ceremonies.length === 0 ? (
            <EmptyState icon={PartyPopper} title="No ceremonies yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Media</TH>
                  <TH>Winners</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {ceremonies.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/admin/ceremonies/${c.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                        {c.title}
                      </Link>
                      <p className="text-xs text-navy-500">
                        {c.venue}, {c.city}
                      </p>
                    </TD>
                    <TD className="text-xs">{formatDateTime(c.eventDate)}</TD>
                    <TD>{c._count.media}</TD>
                    <TD>{c._count.distributions}</TD>
                    <TD>
                      <StatusBadge status={c.status} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="New ceremony" />
          <CardBody>
            <CeremonyForm competitions={competitions} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
