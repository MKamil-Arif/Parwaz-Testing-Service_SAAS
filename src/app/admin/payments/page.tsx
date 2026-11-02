import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { PAYMENT_METHOD, PAYMENT_STATUS, REFUND_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { refundAction, reviewManualPaymentAction } from "@/actions/admin/operations";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination, StatCard } from "@/components/ui/layout";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payments" };

type SP = { q?: string; status?: string; method?: string; refund?: string; page?: string };

export default async function PaymentsAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("payments.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.method ? { method: sp.method } : {}),
    ...(sp.refund ? { refundStatus: sp.refund } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q } }, { payerReference: { contains: sp.q } }, { gatewayTransactionId: { contains: sp.q } }, { registration: { user: { fullName: { contains: sp.q } } } }] } : {}),
  };
  const [payments, total, queue, refunds, sums] = await Promise.all([
    db.payment.findMany({ where, include: { registration: { include: { user: true, competition: { select: { title: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: { createdAt: "desc" }, ...skipTake(page) }),
    db.payment.count({ where }),
    db.payment.findMany({ where: { status: PAYMENT_STATUS.PENDING_VERIFICATION }, include: { registration: { include: { user: true, competition: { select: { title: true } } } } }, orderBy: { createdAt: "asc" } }),
    db.payment.count({ where: { refundStatus: REFUND_STATUS.REQUESTED } }),
    db.payment.groupBy({ by: ["status", "isSandbox"], _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const sum = (status: string, sandbox: boolean) => sums.find((x) => x.status === status && x.isSandbox === sandbox);

  return (
    <>
      <PageHeader
        title="Payment management"
        description="Online payments are confirmed by verified gateway callbacks; manual transfers by your finance team below."
        actions={
          <a href="/api/admin/export/payments" className={buttonClasses("secondary", "md")}>
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verified revenue" value={formatPKR(sum(PAYMENT_STATUS.SUCCEEDED, false)?._sum.amount)} hint={`${sum(PAYMENT_STATUS.SUCCEEDED, false)?._count._all ?? 0} payments`} tone="green" />
        <StatCard label="Awaiting verification" value={queue.length} tone="amber" />
        <StatCard label="Refund requests" value={refunds} tone="violet" />
        <StatCard label="Sandbox (test) total" value={formatPKR(sum(PAYMENT_STATUS.SUCCEEDED, true)?._sum.amount)} hint="Never counted as revenue" tone="navy" />
      </div>

      {queue.length > 0 && (
        <Card className="mb-6 overflow-hidden border-amber-200">
          <CardHeader title="Manual transfers awaiting verification" description="Match the transaction ID and amount against your JazzCash / Easypaisa / bank statement before approving." />
          <Table>
            <THead>
              <tr>
                <TH>Student</TH>
                <TH>Competition</TH>
                <TH>Transaction ID</TH>
                <TH>Sent from</TH>
                <TH>Amount</TH>
                <TH>Submitted</TH>
                <TH>Decision</TH>
              </tr>
            </THead>
            <tbody>
              {queue.map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-navy-950">{p.registration.user.fullName}</TD>
                  <TD>{p.registration.competition.title}</TD>
                  <TD className="font-mono text-xs">
                    {p.payerReference}
                    {p.payerNote && <p className="max-w-40 font-sans text-navy-500">{p.payerNote}</p>}
                  </TD>
                  <TD className="text-xs">{p.payerAccount}</TD>
                  <TD className="font-semibold">{formatPKR(p.amount)}</TD>
                  <TD className="text-xs">{formatDateTime(p.createdAt)}</TD>
                  <TD>
                    <ActionForm action={reviewManualPaymentAction} compact className="flex min-w-56 flex-col gap-1.5">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Input name="reason" placeholder="Reason (required to reject)" className="h-8 py-1 text-xs" />
                      <div className="flex gap-1.5">
                        <SubmitButton size="xs" name="decision" value="APPROVE" confirm={`Confirm you have received ${formatPKR(p.amount)} with transaction ID ${p.payerReference}?`}>
                          Verify & confirm
                        </SubmitButton>
                        <SubmitButton size="xs" variant="danger-soft" name="decision" value="REJECT">
                          Reject
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Input name="q" defaultValue={sp.q} placeholder="Reference, transaction ID or student…" className="min-w-48 flex-1" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Any status" options={Object.values(PAYMENT_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <Select name="method" defaultValue={sp.method ?? ""} placeholder="Any method" options={Object.values(PAYMENT_METHOD).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <Select name="refund" defaultValue={sp.refund ?? ""} placeholder="Any refund state" options={Object.values(REFUND_STATUS).map((s) => ({ value: s, label: label(s) }))} className="w-44" />
          <button type="submit" className={buttonClasses("navy", "md")}>Filter</button>
        </form>
        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments found" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Reference</TH>
                <TH>Student / competition</TH>
                <TH>Amount</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH>Gateway log</TH>
                <TH>Refund</TH>
              </tr>
            </THead>
            <tbody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">
                    {p.reference}
                    <p className="text-navy-400">{formatDateTime(p.createdAt)}</p>
                    {(p.gatewayTransactionId || p.payerReference) && <p className="text-navy-500">Txn {p.gatewayTransactionId ?? p.payerReference}</p>}
                  </TD>
                  <TD>
                    <Link href={`/admin/students/${p.registration.userId}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {p.registration.user.fullName}
                    </Link>
                    <p className="text-xs text-navy-500">{p.registration.competition.title}</p>
                  </TD>
                  <TD className="font-semibold">{formatPKR(p.amount)}</TD>
                  <TD>
                    {label(p.method)} {p.isSandbox && <Badge tone="gold">Sandbox</Badge>}
                  </TD>
                  <TD>
                    <StatusBadge status={p.status} />
                    {p.failureReason && <p className="mt-1 max-w-44 text-xs text-navy-500">{p.failureReason}</p>}
                  </TD>
                  <TD className="max-w-52 text-xs text-navy-500">
                    {p.events.map((e) => (
                      <p key={e.id}>
                        {e.signatureValid ? "✓" : "✗"} {e.outcome}
                      </p>
                    ))}
                  </TD>
                  <TD>
                    {p.refundStatus && <StatusBadge status={p.refundStatus} />}
                    {p.status === PAYMENT_STATUS.SUCCEEDED && (
                      <ActionForm action={refundAction} compact className="mt-1 flex min-w-48 flex-col gap-1">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <Input name="reason" placeholder="Refund reason" required className="h-8 py-1 text-xs" />
                        <Input name="amount" type="number" placeholder={`Amount (default ${Number(p.amount)})`} className="h-8 py-1 text-xs" />
                        <div className="flex flex-wrap gap-1">
                          {!p.refundStatus && <SubmitButton size="xs" variant="secondary" name="step" value="REQUEST">Request</SubmitButton>}
                          <SubmitButton size="xs" variant="danger-soft" name="step" value="COMPLETE" confirm="Record this refund as paid out? The registration will be deactivated.">
                            Mark refunded
                          </SubmitButton>
                          {p.refundStatus === REFUND_STATUS.REQUESTED && <SubmitButton size="xs" variant="ghost" name="step" value="REJECT">Decline</SubmitButton>}
                        </div>
                      </ActionForm>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/payments" params={{ q: sp.q, status: sp.status, method: sp.method, refund: sp.refund }} />
      </Card>
    </>
  );
}
