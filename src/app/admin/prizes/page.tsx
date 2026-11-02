import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ALLOCATION_STATUS, DISTRIBUTION_METHOD, DISTRIBUTION_STATUS, EXPENSE_CATEGORY, label } from "@/lib/constants";
import { formatDate, formatPKR, num, toDateInput } from "@/lib/format";
import { recordPrizePurchaseAction, saveDistributionAction } from "@/actions/admin/prizes";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";

export const metadata: Metadata = { title: "Prizes & distribution" };

export default async function PrizesAdminPage() {
  await requireStaff("prizes.manage");
  const [prizes, verified, ceremonies] = await Promise.all([
    db.prize.findMany({
      include: { competition: { select: { title: true } }, allocations: { include: { distribution: true } }, purchases: { where: { category: EXPENSE_CATEGORY.PRIZE_PURCHASE } } },
      orderBy: [{ competitionId: "desc" }, { rankFrom: "asc" }],
    }),
    db.prizeAllocation.findMany({
      where: { status: ALLOCATION_STATUS.VERIFIED },
      include: { prize: true, distribution: true, result: { include: { attempt: { include: { registration: { include: { user: true } } } } } } },
      orderBy: [{ prizeId: "asc" }, { rank: "asc" }],
    }),
    db.awardCeremony.findMany({ orderBy: { eventDate: "desc" }, select: { id: true, title: true, city: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Prize & award management" description="Inventory, purchases, and delivery of every verified prize." />
      <Card className="overflow-hidden">
        <CardHeader title="Prize inventory" />
        {prizes.length === 0 ? (
          <EmptyState icon={Gift} title="No prize tiers configured" description="Add prize tiers on a competition's Prizes tab." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Prize</TH>
                <TH className="text-right">Required</TH>
                <TH className="text-right">Purchased</TH>
                <TH className="text-right">Spent / budget</TH>
                <TH className="text-right">Allocated</TH>
                <TH className="text-right">Verified</TH>
                <TH className="text-right">Delivered</TH>
                <TH>Record purchase</TH>
              </tr>
            </THead>
            <tbody>
              {prizes.map((p) => {
                const purchased = p.purchases.reduce((a, e) => a + (e.quantity ?? 0), 0);
                const spent = p.purchases.reduce((a, e) => a + num(e.amount), 0);
                const verifiedN = p.allocations.filter((a) => a.status === ALLOCATION_STATUS.VERIFIED).length;
                const delivered = p.allocations.filter((a) => a.distribution?.status === DISTRIBUTION_STATUS.DELIVERED).length;
                return (
                  <TR key={p.id}>
                    <TD>
                      <p className="font-semibold text-navy-950">
                        {p.title} <span className="text-xs text-navy-500">(ranks {p.rankFrom}–{p.rankTo})</span>
                      </p>
                      <p className="text-xs text-navy-500">{p.competition.title}</p>
                    </TD>
                    <TD className="text-right">{p.quantity}</TD>
                    <TD className={`text-right ${purchased < p.quantity ? "text-amber-700" : "text-emerald-700"}`}>{purchased}</TD>
                    <TD className="text-right text-xs">
                      {formatPKR(spent)} / {formatPKR(p.quantity * num(p.estimatedUnitValue))}
                    </TD>
                    <TD className="text-right">{p.allocations.length}</TD>
                    <TD className="text-right">{verifiedN}</TD>
                    <TD className="text-right">{delivered}</TD>
                    <TD>
                      <ActionForm action={recordPrizePurchaseAction} compact className="grid min-w-72 grid-cols-2 gap-1">
                        <input type="hidden" name="prizeId" value={p.id} />
                        <Input name="quantity" type="number" min={1} placeholder="Qty" required className="h-8 py-1 text-xs" />
                        <Input name="amount" type="number" min={0} placeholder="Total PKR" required className="h-8 py-1 text-xs" />
                        <Input name="expenseDate" type="date" required defaultValue={toDateInput(new Date())} className="h-8 py-1 text-xs" />
                        <Input name="vendor" placeholder="Vendor" className="h-8 py-1 text-xs" />
                        <Input name="receiptReference" placeholder="Invoice / receipt no." className="col-span-2 h-8 py-1 text-xs" />
                        <SubmitButton size="xs" variant="secondary" className="col-span-2">Record purchase</SubmitButton>
                      </ActionForm>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Distribution of verified prizes" description="Track ceremony hand-over or courier delivery, device serial numbers and receipt." />
        {verified.length === 0 ? (
          <EmptyState title="No verified winners yet" />
        ) : (
          <CardBody className="space-y-4">
            {verified.map((a) => {
              const d = a.distribution;
              return (
                <details key={a.id} className="rounded-2xl border border-navy-100 p-4" open={!d}>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                    <span className="font-bold">#{a.rank}</span>
                    <span className="font-semibold text-navy-950">{a.result.attempt.registration.user.fullName}</span>
                    <Badge tone="gold">{a.prize.title}</Badge>
                    {d ? <StatusBadge status={d.status} /> : <Badge tone="amber">Not scheduled</Badge>}
                    {d?.deliveredAt && <span className="text-xs text-navy-500">Delivered {formatDate(d.deliveredAt)}</span>}
                  </summary>
                  <ActionForm action={saveDistributionAction} className="mt-4 grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="allocationId" value={a.id} />
                    <Field label="Status" name="status">
                      <Select id={`st-${a.id}`} name="status" defaultValue={d?.status ?? DISTRIBUTION_STATUS.PENDING} options={Object.values(DISTRIBUTION_STATUS).map((v) => ({ value: v, label: label(v) }))} />
                    </Field>
                    <Field label="Method" name="method">
                      <Select id={`m-${a.id}`} name="method" defaultValue={d?.method ?? DISTRIBUTION_METHOD.CEREMONY} options={Object.values(DISTRIBUTION_METHOD).map((v) => ({ value: v, label: label(v) }))} />
                    </Field>
                    <Field label="Award ceremony" name="ceremonyId">
                      <Select id={`c-${a.id}`} name="ceremonyId" defaultValue={d?.ceremonyId ? String(d.ceremonyId) : ""} placeholder="—" options={ceremonies.map((c) => ({ value: String(c.id), label: `${c.title} (${c.city})` }))} />
                    </Field>
                    <Field label="Scheduled date" name="scheduledDate">
                      <Input id={`sd-${a.id}`} name="scheduledDate" type="date" defaultValue={toDateInput(d?.scheduledDate)} />
                    </Field>
                    <Field label="Delivered on" name="deliveredAt">
                      <Input id={`dd-${a.id}`} name="deliveredAt" type="date" defaultValue={toDateInput(d?.deliveredAt)} />
                    </Field>
                    <Field label="Received by" name="receivedBy">
                      <Input id={`rb-${a.id}`} name="receivedBy" defaultValue={d?.receivedBy ?? ""} placeholder="Student / guardian name" />
                    </Field>
                    <Field label="Device serial number" name="deviceSerialNumber">
                      <Input id={`sn-${a.id}`} name="deviceSerialNumber" defaultValue={d?.deviceSerialNumber ?? ""} />
                    </Field>
                    <Field label="Courier tracking" name="trackingReference">
                      <Input id={`tr-${a.id}`} name="trackingReference" defaultValue={d?.trackingReference ?? ""} />
                    </Field>
                    <Field label="Delivery address" name="deliveryAddress">
                      <Input id={`ad-${a.id}`} name="deliveryAddress" defaultValue={d?.deliveryAddress ?? ""} />
                    </Field>
                    <Field label="Notes" name="notes" className="sm:col-span-3">
                      <Input id={`n-${a.id}`} name="notes" defaultValue={d?.notes ?? ""} />
                    </Field>
                    <div className="sm:col-span-3">
                      <SubmitButton size="sm">Save distribution</SubmitButton>
                    </div>
                  </ActionForm>
                </details>
              );
            })}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
