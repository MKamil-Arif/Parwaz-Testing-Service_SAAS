import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { BROADCAST_AUDIENCE, NOTIFICATION_TYPE, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { smtpConfigured } from "@/lib/email";
import { sendBroadcastAction, sendExamRemindersAction } from "@/actions/admin/engagement";
import { PageHeader, Table, THead, TH, TR, TD, Alert, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsAdminPage() {
  await requireStaff("notifications.send");
  const [competitions, history] = await Promise.all([
    db.competition.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { examStartsAt: "desc" } }),
    db.notificationBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const compOptions = competitions.map((c) => ({ value: String(c.id), label: c.title }));
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Send in-app notifications (and optionally email) to students. Registration, payment, result and prize notifications are sent automatically." />
      <Alert tone={smtpConfigured() ? "success" : "info"}>
        Email: {smtpConfigured() ? "SMTP is configured — emails are delivered." : "SMTP is not configured — emails are recorded in the Email outbox only."} SMS: {process.env.SMS_PROVIDER ? `provider "${process.env.SMS_PROVIDER}" configured` : "not configured (set SMS_PROVIDER and SMS_API_KEY)"}.
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Compose announcement" />
          <CardBody>
            <ActionForm action={sendBroadcastAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
              <Field label="Audience" name="audience" className="sm:col-span-2">
                <Select id="audience" name="audience" options={Object.values(BROADCAST_AUDIENCE).map((a) => ({ value: a, label: label(a) }))} />
              </Field>
              <Field label="Competition (for competition audiences)" name="competitionId">
                <Select id="competitionId" name="competitionId" placeholder="—" defaultValue="" options={compOptions} />
              </Field>
              <Field label="Type" name="type">
                <Select id="type" name="type" defaultValue="ANNOUNCEMENT" options={Object.values(NOTIFICATION_TYPE).map((t) => ({ value: t, label: label(t) }))} />
              </Field>
              <Field label="Title" name="title" className="sm:col-span-2">
                <Input id="title" name="title" required maxLength={200} />
              </Field>
              <Field label="Message" name="body" className="sm:col-span-2">
                <Textarea id="body" name="body" rows={4} required maxLength={2000} />
              </Field>
              <Field label="Link (optional)" name="link" hint="A site path, e.g. /competitions">
                <Input id="link" name="link" placeholder="/dashboard/exams" />
              </Field>
              <div className="flex items-end">
                <CheckboxField name="email" label="Also send by email" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton confirm="Send this notification now?">Send notification</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Examination reminders" description="Notifies confirmed students who have not yet attempted the exam." />
          <CardBody>
            <ActionForm action={sendExamRemindersAction} className="space-y-4">
              <Field label="Competition" name="competitionId">
                <Select id="rem-competitionId" name="competitionId" required placeholder="Select…" defaultValue="" options={compOptions} />
              </Field>
              <SubmitButton variant="gold">Send reminders</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Sent history" />
        {history.length === 0 ? (
          <EmptyState title="Nothing sent yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Sent</TH>
                <TH>Title</TH>
                <TH>Audience</TH>
                <TH>Channels</TH>
                <TH className="text-right">Recipients</TH>
              </tr>
            </THead>
            <tbody>
              {history.map((h) => (
                <TR key={h.id}>
                  <TD className="text-xs">{formatDateTime(h.createdAt)}</TD>
                  <TD className="font-semibold text-navy-950">{h.title}</TD>
                  <TD className="text-xs">{label(h.audience)}</TD>
                  <TD className="text-xs">{h.channels}</TD>
                  <TD className="text-right">{h.recipientCount}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
