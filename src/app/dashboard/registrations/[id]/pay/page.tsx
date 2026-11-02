import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, Clock, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { paymentMethods } from "@/lib/payments/gateway";
import { PAYMENT_STATUS, REGISTRATION_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { cancelPendingRegistrationAction, startOnlinePaymentAction, submitManualPaymentAction } from "@/actions/student";
import { PageHeader, Alert, DescriptionList, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Textarea } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Registration payment" };

const RESULT_MESSAGES: Record<string, { tone: "success" | "error" | "warning"; title: string; body: string }> = {
  succeeded: { tone: "success", title: "Payment verified", body: "The gateway confirmed your payment and your registration is now confirmed." },
  failed: { tone: "error", title: "Payment declined", body: "The payment was not completed. No money was taken. You can try again below." },
  cancelled: { tone: "warning", title: "Payment cancelled", body: "You cancelled the checkout. You can start a new payment below." },
};

export default async function PayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  const { id } = await params;
  const { result } = await searchParams;
  const { user } = await requireStudent();
  const reg = await db.competitionRegistration.findUnique({
    where: { id: Number(id) || 0 },
    include: { competition: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!reg || reg.userId !== user.id) notFound();

  const settings = await getSettings();
  const methods = paymentMethods();
  const inReview = reg.payments.find((p) => p.status === PAYMENT_STATUS.PENDING_VERIFICATION);
  const paid = reg.payments.find((p) => p.status === PAYMENT_STATUS.SUCCEEDED);
  const msg = result ? RESULT_MESSAGES[result] : null;
  const closed = new Date() > reg.competition.registrationClosesAt;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Registration payment" back={{ href: "/dashboard/registrations", label: "My registrations" }} />
      {msg && <Alert tone={msg.tone} title={msg.title}>{msg.body}</Alert>}

      <Card>
        <CardHeader title={reg.competition.title} action={<StatusBadge status={reg.status} />} />
        <CardBody>
          <DescriptionList
            items={[
              { label: "Registration number", value: <span className="font-mono">{reg.registrationNumber}</span> },
              { label: "Amount due", value: <span className="font-display text-lg font-bold">{formatPKR(reg.competition.registrationFee)}</span> },
              { label: "Registration closes", value: formatDateTime(reg.competition.registrationClosesAt) },
              { label: "Exam window opens", value: formatDateTime(reg.competition.examStartsAt) },
            ]}
          />
        </CardBody>
      </Card>

      {reg.status === REGISTRATION_STATUS.CONFIRMED ? (
        <Alert tone="success" title="Your registration is confirmed">
          {paid ? (
            <>
              Payment {paid.reference} verified on {formatDateTime(paid.verifiedAt)}.{" "}
              <Link href={`/dashboard/payments/${paid.reference}`} className="font-semibold underline">
                View receipt
              </Link>
            </>
          ) : (
            "No payment was required."
          )}
        </Alert>
      ) : reg.status !== REGISTRATION_STATUS.PENDING_PAYMENT ? (
        <Alert tone="warning" title={`Registration ${label(reg.status).toLowerCase()}`}>
          This registration is not awaiting payment.
        </Alert>
      ) : inReview ? (
        <Alert tone="info" title="Payment under verification">
          We received your transfer details (transaction ID {inReview.payerReference}) on {formatDateTime(inReview.createdAt)}. Your registration
          will be confirmed after our team verifies it — you'll get a notification and email.
        </Alert>
      ) : closed ? (
        <Alert tone="error" title="Registration has closed">
          The registration deadline has passed, so payment can no longer be accepted.
        </Alert>
      ) : (
        <div className="space-y-5">
          <h2 className="text-lg font-bold">Choose how to pay</h2>
          {methods
            .filter((m) => m.kind === "redirect")
            .map((m) => (
              <Card key={m.method} className={m.available ? "" : "opacity-70"}>
                <CardBody className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <CreditCard className="size-5" />
                    </span>
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-navy-950">
                        {m.label} {m.method === "SANDBOX" && <Badge tone="gold">TEST MODE</Badge>}
                      </p>
                      <p className="mt-0.5 max-w-md text-sm text-navy-600">{m.available ? m.description : m.unavailableReason}</p>
                    </div>
                  </div>
                  {m.available && (
                    <ActionForm action={startOnlinePaymentAction}>
                      <input type="hidden" name="registrationId" value={reg.id} />
                      <input type="hidden" name="method" value={m.method} />
                      <SubmitButton>Pay {formatPKR(reg.competition.registrationFee)}</SubmitButton>
                    </ActionForm>
                  )}
                </CardBody>
              </Card>
            ))}

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Landmark className="size-5 text-brand-700" /> JazzCash / Easypaisa / bank transfer
                </span>
              }
              description="Manual verification by our team — usually within 24 hours."
            />
            <CardBody className="space-y-5">
              <div className="rounded-xl bg-navy-50 p-4 text-sm whitespace-pre-line text-navy-800">{settings["payment.manualInstructions"]}</div>
              <ActionForm action={submitManualPaymentAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="registrationId" value={reg.id} />
                <Field label="Transaction ID / reference" name="payerReference" required hint="Printed on your JazzCash/Easypaisa/bank receipt">
                  <Input id="payerReference" name="payerReference" required maxLength={100} />
                </Field>
                <Field label="Sent from (account or mobile number)" name="payerAccount" required>
                  <Input id="payerAccount" name="payerAccount" required maxLength={100} />
                </Field>
                <Field label="Note (optional)" name="payerNote" className="sm:col-span-2">
                  <Textarea id="payerNote" name="payerNote" rows={2} maxLength={500} placeholder="e.g. paid by my father from his account" />
                </Field>
                <div className="sm:col-span-2">
                  <SubmitButton variant="navy">Submit payment for verification</SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
          </Card>

          <p className="flex items-start gap-2 text-xs text-navy-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            We never ask for your card number or PIN. Online payments are confirmed only by the payment gateway's verified callback; manual
            transfers only after our finance team matches the transaction.
          </p>
          <form action={cancelPendingRegistrationAction.bind(null, reg.id)}>
            <button type="submit" className="text-sm font-semibold text-red-700 hover:underline">
              Cancel this registration
            </button>
          </form>
        </div>
      )}

      {reg.payments.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader title="Payment attempts" />
          <Table>
            <THead>
              <tr>
                <TH>Reference</TH>
                <TH>Method</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {reg.payments.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.reference}</TD>
                  <TD>
                    {label(p.method)} {p.isSandbox && <Badge tone="gold">Sandbox</Badge>}
                  </TD>
                  <TD>{formatDateTime(p.createdAt)}</TD>
                  <TD>
                    <StatusBadge status={p.status} />
                    {p.failureReason && <p className="mt-1 text-xs text-navy-500">{p.failureReason}</p>}
                  </TD>
                  <TD className="text-right">
                    {p.status === PAYMENT_STATUS.SUCCEEDED ? (
                      <Link href={`/dashboard/payments/${p.reference}`} className="text-sm font-semibold text-brand-700">
                        Receipt
                      </Link>
                    ) : p.status === PAYMENT_STATUS.INITIATED ? (
                      <Link href={`/pay/sandbox/${p.reference}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                        <Clock className="size-3.5" /> Resume
                      </Link>
                    ) : p.status === PAYMENT_STATUS.PENDING_VERIFICATION ? (
                      <CircleCheck className="ml-auto size-4 text-navy-300" />
                    ) : null}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
