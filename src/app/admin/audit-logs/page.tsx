import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { pageParam, skipTake } from "@/lib/admin-helpers";
import { PageHeader, Table, THead, TH, TR, TD, Pagination, EmptyState } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Audit logs" };

const SIZE = 50;

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string; actor?: string; page?: string }> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.q ? { action: { contains: sp.q } } : {}),
    ...(sp.entity ? { entityType: sp.entity } : {}),
    ...(sp.actor ? { actorEmail: { contains: sp.actor } } : {}),
  };
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, SIZE) }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Audit logs" description="Every important administrative change, who made it, when and from where. Logs cannot be edited from the application." />
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Input name="q" defaultValue={sp.q} placeholder="Action contains… (e.g. payment, result)" className="min-w-48 flex-1" />
          <Input name="entity" defaultValue={sp.entity} placeholder="Entity type (e.g. Payment)" className="w-48" />
          <Input name="actor" defaultValue={sp.actor} placeholder="Staff email" className="w-48" />
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No log entries" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Who</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Details</TH>
                <TH>IP</TH>
              </tr>
            </THead>
            <tbody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</TD>
                  <TD className="text-xs">{l.actorEmail ?? "system"}</TD>
                  <TD className="font-mono text-xs font-semibold text-navy-900">{l.action}</TD>
                  <TD className="text-xs">
                    {l.entityType}
                    {l.entityId ? ` #${l.entityId}` : ""}
                  </TD>
                  <TD className="max-w-md font-mono text-[11px] break-all text-navy-500">{l.details}</TD>
                  <TD className="text-xs">{l.ipAddress}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={SIZE} total={total} basePath="/admin/audit-logs" params={{ q: sp.q, entity: sp.entity, actor: sp.actor }} />
      </Card>
    </>
  );
}
