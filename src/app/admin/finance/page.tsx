import type { Metadata } from "next";
import { Download, Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { EXPENSE_CATEGORY, PAYMENT_STATUS, PROJECTION_TYPE, label } from "@/lib/constants";
import { formatDate, formatPKR, num, toDateInput } from "@/lib/format";
import { monthKey, monthLabel, pktDayKey } from "@/lib/admin-helpers";
import { deleteExpenseAction, deleteProjectionAction, saveExpenseAction, saveProjectionAction } from "@/actions/admin/finance";
import { PageHeader, StatCard, Table, THead, TH, TR, TD, EmptyState, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { ChartCard } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Financial reports" };

export default async function FinancePage() {
  await requireStaff("finance.manage");
  const [payments, refunds, sandbox, expenses, projections, campaigns, competitions] = await Promise.all([
    db.payment.findMany({ where: { status: { in: [PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.REFUNDED] }, isSandbox: false }, select: { amount: true, paidAt: true, status: true, refundAmount: true, refundedAt: true } }),
    db.payment.aggregate({ _sum: { refundAmount: true }, where: { status: PAYMENT_STATUS.REFUNDED, isSandbox: false } }),
    db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: true } }),
    db.businessExpense.findMany({ include: { prize: { select: { title: true } }, campaign: { select: { name: true } } }, orderBy: { expenseDate: "desc" } }),
    db.financialProjection.findMany({ orderBy: [{ type: "desc" }, { sortOrder: "asc" }] }),
    db.marketingCampaign.findMany({ select: { id: true, name: true } }),
    db.competition.findMany({ select: { id: true, title: true } }),
  ]);

  const grossRevenue = payments.reduce((a, p) => a + num(p.amount), 0);
  const refunded = num(refunds._sum.refundAmount);
  const netRevenue = grossRevenue - refunded;
  const totalExpenses = expenses.reduce((a, e) => a + num(e.amount), 0);
  const projRevenue = projections.filter((p) => p.type === PROJECTION_TYPE.REVENUE).reduce((a, p) => a + num(p.amount), 0);
  const projExpense = projections.filter((p) => p.type === PROJECTION_TYPE.EXPENSE).reduce((a, p) => a + num(p.amount), 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + num(e.amount));

  const compare = [
    { label: "Registration revenue", projected: projRevenue, actual: netRevenue },
    ...Object.values(EXPENSE_CATEGORY)
      .filter((c) => c !== EXPENSE_CATEGORY.OTHER || byCategory.has(c))
      .map((c) => ({
        label: label(c),
        projected: projections.filter((p) => p.type === PROJECTION_TYPE.EXPENSE && p.category === c).reduce((a, p) => a + num(p.amount), 0),
        actual: byCategory.get(c) ?? 0,
      })),
  ];

  // Monthly performance: last 12 months by payment/expense date (PKT).
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  const monthly = months.map((m) => ({
    month: monthLabel(m),
    revenue:
      payments.filter((p) => p.paidAt && monthKey(p.paidAt) === m).reduce((a, p) => a + num(p.amount), 0) -
      payments.filter((p) => p.refundedAt && monthKey(p.refundedAt) === m).reduce((a, p) => a + num(p.refundAmount), 0),
    expenditure: expenses.filter((e) => monthKey(e.expenseDate) === m).reduce((a, e) => a + num(e.amount), 0),
  }));

  // Cumulative registration revenue by day.
  const days = new Map<string, number>();
  for (const p of payments) if (p.paidAt) days.set(pktDayKey(p.paidAt), (days.get(pktDayKey(p.paidAt)) ?? 0) + num(p.amount));
  let running = 0;
  const cumulative = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ day: d.slice(5), revenue: (running += v) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial management"
        description="Actual figures come only from verified payments and recorded expenses. Projections are your editable budget and are never mixed with actuals."
        actions={
          <>
            <a href="/api/admin/export/financial-summary" className={buttonClasses("secondary", "md")}>
              <Download className="size-4" /> Summary CSV
            </a>
            <a href="/api/admin/export/expenses" className={buttonClasses("secondary", "md")}>
              <Download className="size-4" /> Expenses CSV
            </a>
            <a href="/api/admin/export/payments" className={buttonClasses("secondary", "md")}>
              <Download className="size-4" /> Payments CSV
            </a>
          </>
        }
      />

      <div>
        <p className="mb-3 text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">Actual (verified)</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Net registration revenue" value={formatPKR(netRevenue)} hint={`${formatPKR(grossRevenue)} received · ${formatPKR(refunded)} refunded`} tone="green" />
          <StatCard label="Recorded expenditure" value={formatPKR(totalExpenses)} hint={`${expenses.length} expense record(s)`} tone="amber" />
          <StatCard label="Operating surplus / (deficit)" value={formatPKR(netRevenue - totalExpenses)} tone={netRevenue - totalExpenses >= 0 ? "blue" : "violet"} />
          <StatCard label="Verified payments" value={payments.length} hint={sandbox._count ? `${sandbox._count} sandbox payments (${formatPKR(sandbox._sum.amount)}) excluded` : "Sandbox payments excluded"} tone="navy" />
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">Projected (preliminary estimates — not guaranteed)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Projected revenue" value={formatPKR(projRevenue)} tone="green" />
          <StatCard label="Projected expenditure" value={formatPKR(projExpense)} tone="amber" />
          <StatCard label="Potential operating surplus" value={formatPKR(projRevenue - projExpense)} tone="gold" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Revenue vs expenditure: projected and actual"
          description="By budget line (PKR)"
          data={compare}
          xKey="label"
          series={[
            { key: "projected", label: "Projected" },
            { key: "actual", label: "Actual" },
          ]}
          format="pkr"
          horizontal
          height={340}
        />
        <ChartCard
          title="Expense breakdown (actual)"
          data={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: label(c), amount: v }))}
          xKey="label"
          series={[{ key: "amount", label: "Spent" }]}
          format="pkr"
          horizontal
          height={340}
          emptyText="No expenses recorded yet"
        />
        <ChartCard
          title="Monthly financial performance"
          description="Last 12 months — net revenue and expenditure (PKR)"
          data={monthly}
          xKey="month"
          series={[
            { key: "revenue", label: "Net revenue" },
            { key: "expenditure", label: "Expenditure" },
          ]}
          format="pkr"
        />
        <ChartCard
          title="Cumulative registration revenue"
          description="Verified payments by payment date"
          data={cumulative}
          xKey="day"
          series={[{ key: "revenue", label: "Cumulative revenue" }]}
          format="pkr"
          kind="line"
          emptyText="No verified payments yet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Business expenses" description="Prize purchases are recorded from Prizes & distribution." />
          {expenses.length === 0 ? (
            <EmptyState title="No expenses yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Description</TH>
                  <TH>Category</TH>
                  <TH className="text-right">Amount</TH>
                  <TH />
                </tr>
              </THead>
              <tbody>
                {expenses.slice(0, 100).map((e) => (
                  <TR key={e.id}>
                    <TD className="text-xs">{formatDate(e.expenseDate)}</TD>
                    <TD>
                      {e.description}
                      <p className="text-xs text-navy-500">{[e.vendor, e.receiptReference, e.campaign?.name, e.prize?.title].filter(Boolean).join(" · ")}</p>
                    </TD>
                    <TD>
                      <Badge>{label(e.category)}</Badge>
                    </TD>
                    <TD className="text-right font-semibold tabular-nums">{formatPKR(e.amount)}</TD>
                    <TD>
                      <form action={deleteExpenseAction.bind(null, e.id)}>
                        <button type="submit" aria-label="Delete expense" className="text-red-600 hover:text-red-800">
                          <Trash className="size-4" />
                        </button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="Record an expense" />
          <CardBody>
            <ActionForm action={saveExpenseAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" name="category" className="sm:col-span-2">
                <Select id="category" name="category" options={Object.values(EXPENSE_CATEGORY).filter((c) => c !== EXPENSE_CATEGORY.PRIZE_PURCHASE).map((c) => ({ value: c, label: label(c) }))} />
              </Field>
              <Field label="Description" name="description" className="sm:col-span-2">
                <Input id="description" name="description" required />
              </Field>
              <Field label="Amount (PKR)" name="amount">
                <Input id="amount" name="amount" type="number" min={1} step="0.01" required />
              </Field>
              <Field label="Date" name="expenseDate">
                <Input id="expenseDate" name="expenseDate" type="date" required defaultValue={toDateInput(new Date())} />
              </Field>
              <Field label="Vendor" name="vendor">
                <Input id="vendor" name="vendor" />
              </Field>
              <Field label="Receipt / invoice no." name="receiptReference">
                <Input id="receiptReference" name="receiptReference" />
              </Field>
              <Field label="Marketing campaign" name="campaignId">
                <Select id="campaignId" name="campaignId" placeholder="—" defaultValue="" options={campaigns.map((c) => ({ value: String(c.id), label: c.name }))} />
              </Field>
              <Field label="Competition" name="competitionId">
                <Select id="competitionId" name="competitionId" placeholder="—" defaultValue="" options={competitions.map((c) => ({ value: String(c.id), label: c.title }))} />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Save expense</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Financial projections (editable)" description="The preliminary model. Changing these never affects actual figures." />
        <Alert tone="info" className="mx-5 mt-4">These are planning estimates, not guaranteed business results.</Alert>
        <Table className="mt-2">
          <THead>
            <tr>
              <TH>Type</TH>
              <TH>Line</TH>
              <TH>Category</TH>
              <TH className="text-right">Amount (PKR)</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {projections.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Badge tone={p.type === "REVENUE" ? "green" : "amber"}>{label(p.type)}</Badge>
                </TD>
                <TD colSpan={3}>
                  <ActionForm action={saveProjectionAction} compact className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="type" value={p.type} />
                    <input type="hidden" name="sortOrder" value={p.sortOrder} />
                    <Input name="label" defaultValue={p.label} className="h-8 w-64 py-1 text-sm" required />
                    <Input name="category" defaultValue={p.category} className="h-8 w-44 py-1 text-xs" required />
                    <Input name="amount" type="number" min={0} defaultValue={num(p.amount)} className="h-8 w-36 py-1 text-right text-sm" required />
                    <SubmitButton size="xs" variant="secondary">Save</SubmitButton>
                  </ActionForm>
                </TD>
                <TD>
                  <form action={deleteProjectionAction.bind(null, p.id)}>
                    <button type="submit" aria-label="Delete projection" className="text-red-600 hover:text-red-800">
                      <Trash className="size-4" />
                    </button>
                  </form>
                </TD>
              </TR>
            ))}
            <TR>
              <TD colSpan={5}>
                <ActionForm action={saveProjectionAction} compact resetOnSuccess className="flex flex-wrap items-center gap-2">
                  <Select name="type" options={[{ value: "EXPENSE", label: "Expense" }, { value: "REVENUE", label: "Revenue" }]} className="h-8 w-32 py-1 text-xs" />
                  <Input name="label" placeholder="New line" className="h-8 w-64 py-1 text-sm" required />
                  <Input name="category" placeholder="Category code e.g. MARKETING" className="h-8 w-56 py-1 text-xs" required />
                  <Input name="amount" type="number" min={0} placeholder="Amount" className="h-8 w-36 py-1 text-sm" required />
                  <input type="hidden" name="sortOrder" value={projections.length + 1} />
                  <SubmitButton size="xs">Add line</SubmitButton>
                </ActionForm>
              </TD>
            </TR>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
