import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { smtpConfigured } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { pageParam, skipTake } from "@/lib/admin-helpers";
import { PageHeader, Pagination, EmptyState, Alert } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Email outbox" };

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("audit.view");
  const page = pageParam((await searchParams).page);
  const [emails, total] = await Promise.all([db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, ...skipTake(page, 20) }), db.emailOutbox.count()]);
  return (
    <>
      <PageHeader title="Email outbox" description="Every email the platform sends, with delivery status." />
      {!smtpConfigured() && (
        <Alert tone="info" className="mb-5">
          SMTP is not configured, so emails are only recorded here (status “Logged”). Configure SMTP_HOST etc. in the environment to deliver them.
        </Alert>
      )}
      <Card>
        {emails.length === 0 ? (
          <EmptyState icon={Mail} title="No emails yet" />
        ) : (
          <ul className="divide-y divide-navy-100">
            {emails.map((e) => (
              <li key={e.id}>
                <details className="px-5 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                    <StatusBadge status={e.status} />
                    <span className="font-semibold text-navy-950">{e.subject}</span>
                    <span className="text-navy-500">→ {e.toEmail}</span>
                    <span className="ml-auto text-xs text-navy-400">{formatDateTime(e.createdAt)}</span>
                  </summary>
                  <pre className="mt-3 rounded-xl bg-navy-50 p-4 text-xs whitespace-pre-wrap text-navy-800">{e.body}</pre>
                  {e.error && <p className="mt-2 text-xs text-red-700">{e.error}</p>}
                </details>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={20} total={total} basePath="/admin/outbox" params={{}} />
      </Card>
    </>
  );
}
