import Link from "next/link";
import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { TICKET_CATEGORY, TICKET_STATUS, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Support & complaints" };

type SP = { q?: string; status?: string; category?: string; page?: string };

export default async function SupportAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("support.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.status ? { status: sp.status } : { status: { in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] } }),
    ...(sp.category ? { category: sp.category } : {}),
    ...(sp.q ? { OR: [{ ticketNumber: { contains: sp.q } }, { subject: { contains: sp.q } }, { email: { contains: sp.q } }, { name: { contains: sp.q } }] } : {}),
  };
  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({ where, include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ updatedAt: "desc" }], ...skipTake(page) }),
    db.supportTicket.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Support & complaints" description="Contact-form messages, student tickets, complaints and result disputes." />
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Input name="q" defaultValue={sp.q} placeholder="Ticket no., subject, name or email…" className="min-w-48 flex-1" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Open & in progress" options={Object.values(TICKET_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <Select name="category" defaultValue={sp.category ?? ""} placeholder="All topics" options={Object.values(TICKET_CATEGORY).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Ticket</TH>
                <TH>From</TH>
                <TH>Topic</TH>
                <TH>Priority</TH>
                <TH>Last activity</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {tickets.map((t) => (
                <TR key={t.id}>
                  <TD>
                    <Link href={`/admin/support/${t.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {t.subject}
                    </Link>
                    <p className="font-mono text-xs text-navy-500">
                      {t.ticketNumber} · {t._count.messages} msg {t.messages[0]?.isStaff ? "· answered" : "· awaiting reply"}
                    </p>
                  </TD>
                  <TD>
                    {t.name}
                    <p className="text-xs text-navy-500">{t.userId ? "Registered student" : "Guest"} · {t.email}</p>
                  </TD>
                  <TD>{t.category === "RESULT_DISPUTE" ? <Badge tone="violet">Result dispute</Badge> : label(t.category)}</TD>
                  <TD>{t.priority === "HIGH" ? <Badge tone="red">High</Badge> : label(t.priority)}</TD>
                  <TD className="text-xs">{formatDateTime(t.updatedAt)}</TD>
                  <TD>
                    <StatusBadge status={t.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/support" params={{ q: sp.q, status: sp.status, category: sp.category }} />
      </Card>
    </>
  );
}
