import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { PAYMENT_STATUS, label } from "@/lib/constants";
import { formatDateTime, formatPKR } from "@/lib/format";
import { LogoMark } from "@/components/site/logo";
import { PrintButton } from "@/components/ui/client-widgets";
import { PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Payment receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const { user } = await requireStudent();
  const p = await db.payment.findUnique({
    where: { reference },
    include: { registration: { include: { competition: true, user: true } } },
  });
  if (!p || p.registration.userId !== user.id || (p.status !== PAYMENT_STATUS.SUCCEEDED && p.status !== PAYMENT_STATUS.REFUNDED)) notFound();
  const s = await getSettings();

  const rows: [string, string][] = [
    ["Receipt / payment reference", p.reference],
    ["Student", p.registration.user.fullName],
    ["Email", p.registration.user.email],
    ["Competition", p.registration.competition.title],
    ["Registration number", p.registration.registrationNumber],
    ["Payment method", label(p.method)],
    ["Gateway transaction ID", p.gatewayTransactionId ?? p.payerReference ?? "—"],
    ["Paid on", formatDateTime(p.paidAt)],
    ["Verified on", formatDateTime(p.verifiedAt)],
    ["Status", label(p.status)],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print">
        <PageHeader title="Payment receipt" back={{ href: "/dashboard/payments", label: "My payments" }} actions={<PrintButton />} />
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-navy-200 bg-white p-8 print:border-0">
        {p.isSandbox && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="-rotate-12 text-5xl font-black tracking-widest text-amber-500/20 sm:text-6xl">SANDBOX · NOT A REAL PAYMENT</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-4 border-b border-navy-100 pb-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-11" />
            <div>
              <p className="font-display text-lg font-extrabold">Rewarding Potential</p>
              <p className="text-xs text-navy-500">{s["contact.email"]} · {s["contact.phone"]}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-widest text-navy-500 uppercase">Payment receipt</p>
            <p className="font-mono text-sm">{p.reference}</p>
          </div>
        </div>
        <dl className="divide-y divide-navy-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-2.5 text-sm">
              <dt className="text-navy-500">{k}</dt>
              <dd className="text-right font-medium text-navy-950">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-end justify-between rounded-xl bg-navy-50 px-5 py-4">
          <span className="text-sm font-semibold text-navy-700">Amount paid</span>
          <span className="font-display text-2xl font-extrabold">{formatPKR(p.amount)}</span>
        </div>
        {p.refundStatus && (
          <p className="mt-3 text-sm text-violet-700">
            Refund: {label(p.refundStatus)} {p.refundAmount ? `(${formatPKR(p.refundAmount)})` : ""} {p.refundedAt ? `on ${formatDateTime(p.refundedAt)}` : ""}
          </p>
        )}
        <p className="mt-6 text-xs text-navy-500">
          This receipt confirms a registration fee payment verified by Rewarding Potential. Registration fees are subject to our Refund Policy.
        </p>
      </div>
    </div>
  );
}
