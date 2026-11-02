import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { TICKET_PRIORITY, TICKET_STATUS, label } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { staffReplyAction } from "@/actions/admin/engagement";
import { PageHeader, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Select, Textarea } from "@/components/ui/form";
import { TicketThread } from "@/components/support/ticket-thread";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("support.manage");
  const { id } = await params;
  const t = await db.supportTicket.findUnique({
    where: { id: Number(id) || 0 },
    include: { messages: { orderBy: { createdAt: "asc" } }, competition: true, result: { include: { attempt: true } } },
  });
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t.subject} description={`${t.ticketNumber} · ${label(t.category)}`} back={{ href: "/admin/support", label: "Support" }} actions={<StatusBadge status={t.status} />} />
      <Card>
        <CardBody>
          <DescriptionList
            items={[
              { label: "From", value: t.userId ? <Link href={`/admin/students/${t.userId}`} className="font-semibold text-brand-700">{t.name}</Link> : `${t.name} (guest)` },
              { label: "Email / phone", value: `${t.email}${t.phone ? ` · ${t.phone}` : ""}` },
              { label: "Competition", value: t.competition?.title ?? "—" },
              {
                label: "Disputed result",
                value: t.result ? (
                  <Link href={`/admin/exams/${t.result.attemptId}`} className="font-semibold text-brand-700">
                    {formatNumber(t.result.score, 2)}/{formatNumber(t.result.maxScore, 2)} · rank {t.result.meritRank ?? "—"} — review attempt
                  </Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <TicketThread messages={t.messages} ownerName={t.name} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Reply / update" description="The student is notified in-app and by email; guests by email." />
        <CardBody>
          <ActionForm action={staffReplyAction} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
            <input type="hidden" name="ticketId" value={t.id} />
            <Field label="Message" name="message" className="sm:col-span-2">
              <Textarea id="message" name="message" rows={5} maxLength={5000} />
            </Field>
            <Field label="Status" name="status">
              <Select id="status" name="status" defaultValue={t.status === TICKET_STATUS.OPEN ? TICKET_STATUS.IN_PROGRESS : t.status} options={Object.values(TICKET_STATUS).map((s) => ({ value: s, label: label(s) }))} />
            </Field>
            <Field label="Priority" name="priority">
              <Select id="priority" name="priority" defaultValue={t.priority} options={Object.values(TICKET_PRIORITY).map((s) => ({ value: s, label: label(s) }))} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Save</SubmitButton>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
