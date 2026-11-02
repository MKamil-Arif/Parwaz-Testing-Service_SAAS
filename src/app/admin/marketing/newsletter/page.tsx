import type { Metadata } from "next";
import { Download, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { setSubscriberStatusAction } from "@/actions/admin/marketing";
import { PageHeader, Table, THead, TH, TR, TD, EmptyState, Pagination, StatCard } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { MarketingTabs } from "../tabs";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("marketing.manage");
  const page = pageParam((await searchParams).page);
  const [subs, total, active] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { consentAt: "desc" }, ...skipTake(page) }),
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { status: "SUBSCRIBED" } }),
  ]);
  return (
    <>
      <PageHeader
        title="Marketing"
        description="Newsletter subscribers who opted in on the website."
        actions={
          <a href="/api/admin/export/newsletter" className={buttonClasses("secondary", "md")}>
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <MarketingTabs active="newsletter" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Subscribed" value={active} icon={Mail} />
        <StatCard label="Unsubscribed" value={total - active} tone="navy" />
      </div>
      <Card className="overflow-hidden">
        {subs.length === 0 ? (
          <EmptyState icon={Mail} title="No subscribers yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Source</TH>
                <TH>Consent</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {subs.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy-950">{s.email}</TD>
                  <TD>{s.source ?? "—"}</TD>
                  <TD className="text-xs">{formatDateTime(s.consentAt)}</TD>
                  <TD>
                    <StatusBadge status={s.status === "SUBSCRIBED" ? "ACTIVE" : "CLOSED"} />
                  </TD>
                  <TD>
                    <form action={setSubscriberStatusAction.bind(null, s.id, s.status === "SUBSCRIBED" ? "UNSUBSCRIBED" : "SUBSCRIBED")}>
                      <button type="submit" className="text-xs font-semibold text-navy-600 hover:text-navy-950">
                        {s.status === "SUBSCRIBED" ? "Unsubscribe" : "Resubscribe"}
                      </button>
                    </form>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/marketing/newsletter" params={{}} />
      </Card>
    </>
  );
}
