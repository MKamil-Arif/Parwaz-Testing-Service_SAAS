import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { TICKET_STATUS, label } from "@/lib/constants";
import { replyTicketAction } from "@/actions/student";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Textarea } from "@/components/ui/form";
import { TicketThread } from "@/components/support/ticket-thread";

export const metadata: Metadata = { title: "Support ticket" };

export default async function TicketPage({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const { ticketNumber } = await params;
  const { user } = await requireStudent();
  const ticket = await db.supportTicket.findUnique({
    where: { ticketNumber },
    include: { messages: { orderBy: { createdAt: "asc" } }, competition: { select: { title: true } } },
  });
  if (!ticket || ticket.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`${ticket.ticketNumber} · ${label(ticket.category)}${ticket.competition ? ` · ${ticket.competition.title}` : ""}`}
        back={{ href: "/dashboard/support", label: "Help & support" }}
        actions={<StatusBadge status={ticket.status} />}
      />
      <Card>
        <CardBody>
          <TicketThread messages={ticket.messages} ownerName="You" />
        </CardBody>
      </Card>
      {ticket.status !== TICKET_STATUS.CLOSED && (
        <Card>
          <CardHeader title="Add a reply" />
          <CardBody>
            <ActionForm action={replyTicketAction} resetOnSuccess className="space-y-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <Field label="Message" name="message">
                <Textarea id="message" name="message" rows={4} required maxLength={5000} />
              </Field>
              <SubmitButton>Send reply</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
