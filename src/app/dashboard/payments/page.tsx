import Link from "next/link";
import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { PAYMENT_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "My payments" };

export default async function MyPaymentsPage() {
  const { user } = await requireStudent();
  const payments = await db.payment.findMany({
    where: { registration: { userId: user.id } },
    include: { registration: { include: { competition: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="My payments" description="Payment history, transaction references, refund status and receipts." />
      <Card className="overflow-hidden">
        {payments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Reference</TH>
                <TH>Competition</TH>
                <TH>Amount</TH>
                <TH>Method</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH>Refund</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">
                    {p.reference}
                    {p.gatewayTransactionId && <p className="text-navy-400">Txn {p.gatewayTransactionId}</p>}
                    {p.payerReference && <p className="text-navy-400">Your ID {p.payerReference}</p>}
                  </TD>
                  <TD>{p.registration.competition.title}</TD>
                  <TD className="font-semibold">{formatPKR(p.amount)}</TD>
                  <TD>
                    {label(p.method)} {p.isSandbox && <Badge tone="gold">Test</Badge>}
                  </TD>
                  <TD>{formatDateTime(p.paidAt ?? p.createdAt)}</TD>
                  <TD>
                    <StatusBadge status={p.status} />
                    {p.failureReason && <p className="mt-1 max-w-48 text-xs text-navy-500">{p.failureReason}</p>}
                  </TD>
                  <TD>{p.refundStatus ? <StatusBadge status={p.refundStatus} /> : "—"}</TD>
                  <TD className="text-right">
                    {(p.status === PAYMENT_STATUS.SUCCEEDED || p.status === PAYMENT_STATUS.REFUNDED) && (
                      <Link href={`/dashboard/payments/${p.reference}`} className="text-sm font-semibold text-brand-700">
                        Receipt
                      </Link>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
