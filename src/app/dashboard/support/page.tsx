import Link from "next/link";
import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { createTicketAction } from "@/actions/student";
import { PageHeader, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Help & support" };

export default async function SupportPage() {
  const { user } = await requireStudent();
  const [tickets, regs] = await Promise.all([
    db.supportTicket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { messages: true } } } }),
    db.competitionRegistration.findMany({ where: { userId: user.id }, include: { competition: { select: { id: true, title: true } } } }),
  ]);
  return (
    <>
      <PageHeader
        title="Help & support"
        description="Open a ticket for registration, payment, exam or technical issues. You'll be notified when we reply."
        actions={
          <Link href="/help" className="text-sm font-semibold text-brand-700">
            Browse FAQs →
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="My tickets" />
          {tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No support tickets" description="Your requests and their replies will appear here." />
          ) : (
            <ul className="divide-y divide-navy-100">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/dashboard/support/${t.ticketNumber}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-navy-50/50">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-950">{t.subject}</p>
                      <p className="text-xs text-navy-500">
                        {t.ticketNumber} · {label(t.category)} · updated {formatDateTime(t.updatedAt)} · {t._count.messages} message(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {t.category === "RESULT_DISPUTE" && <Badge tone="violet">Dispute</Badge>}
                      <StatusBadge status={t.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Open a new ticket" />
          <CardBody>
            <ActionForm action={createTicketAction} className="space-y-4">
              <Field label="Topic" name="category">
                <Select
                  id="category"
                  name="category"
                  defaultValue="GENERAL"
                  options={["GENERAL", "REGISTRATION", "PAYMENT", "EXAM", "TECHNICAL", "COMPLAINT"].map((v) => ({ value: v, label: label(v) }))}
                />
              </Field>
              <Field label="Related competition (optional)" name="competitionId">
                <Select id="competitionId" name="competitionId" placeholder="—" defaultValue="" options={regs.map((r) => ({ value: String(r.competition.id), label: r.competition.title }))} />
              </Field>
              <Field label="Subject" name="subject">
                <Input id="subject" name="subject" required maxLength={200} />
              </Field>
              <Field label="Message" name="message">
                <Textarea id="message" name="message" rows={5} required maxLength={5000} />
              </Field>
              <SubmitButton>Submit ticket</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
