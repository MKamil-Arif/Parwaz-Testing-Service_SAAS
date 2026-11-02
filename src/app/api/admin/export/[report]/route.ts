import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasPermission, isStaff, type Permission } from "@/lib/auth/permissions";
import { csvResponse, toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";
import { PAYMENT_STATUS, label } from "@/lib/constants";
import { num } from "@/lib/format";

const REPORTS: Record<string, Permission> = {
  "question-template": "questions.manage",
  payments: "payments.manage",
  registrations: "registrations.manage",
  expenses: "finance.manage",
  "financial-summary": "finance.manage",
  newsletter: "marketing.manage",
  results: "results.manage",
};

const stamp = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const perm = REPORTS[report];
  const session = await getSession();
  if (!perm || !session || !isStaff(session.user.roles) || !hasPermission(session.user.roles, perm)) {
    return new Response("Not found", { status: 404 });
  }
  const url = new URL(request.url);

  if (report === "question-template") {
    return csvResponse(
      "question-import-template.csv",
      toCsv(
        ["category", "difficulty", "marks", "question", "optionA", "optionB", "optionC", "optionD", "correct", "explanation"],
        [["Mathematics", "EASY", "1", "What is 15% of 200?", "20", "25", "30", "35", "C", "15/100 × 200 = 30"]],
      ),
    );
  }

  await audit({ actor: session, action: "report.exported", entityType: "Report", entityId: report });

  if (report === "payments") {
    const rows = await db.payment.findMany({ include: { registration: { include: { user: true, competition: true } } }, orderBy: { createdAt: "desc" } });
    return csvResponse(
      `payments-${stamp()}.csv`,
      toCsv(
        ["Reference", "Student", "Email", "Competition", "Registration no", "Amount (PKR)", "Method", "Sandbox", "Status", "Gateway txn", "Payer reference", "Created", "Paid", "Refund status"],
        rows.map((p) => [p.reference, p.registration.user.fullName, p.registration.user.email, p.registration.competition.title, p.registration.registrationNumber, num(p.amount), label(p.method), p.isSandbox ? "Yes" : "No", label(p.status), p.gatewayTransactionId, p.payerReference, p.createdAt, p.paidAt, p.refundStatus]),
      ),
    );
  }

  if (report === "registrations") {
    const competitionId = Number(url.searchParams.get("competitionId")) || undefined;
    const rows = await db.competitionRegistration.findMany({
      where: competitionId ? { competitionId } : {},
      include: { user: { include: { profile: true } }, competition: true },
      orderBy: { createdAt: "desc" },
    });
    return csvResponse(
      `registrations-${stamp()}.csv`,
      toCsv(
        ["Registration no", "Student", "Email", "Phone", "District", "City", "Institution", "Class", "Competition", "Status", "Registered", "Confirmed"],
        rows.map((r) => [r.registrationNumber, r.user.fullName, r.user.email, r.user.phone, r.user.profile?.district, r.user.profile?.city, r.user.profile?.institution, r.user.profile?.classLevel, r.competition.title, label(r.status), r.createdAt, r.confirmedAt]),
      ),
    );
  }

  if (report === "results") {
    const competitionId = Number(url.searchParams.get("competitionId"));
    const rows = await db.examResult.findMany({
      where: { attempt: { registration: { competitionId } } },
      include: { attempt: { include: { registration: { include: { user: { include: { profile: true } } } } } } },
      orderBy: [{ meritRank: "asc" }, { score: "desc" }],
    });
    return csvResponse(
      `results-${competitionId}-${stamp()}.csv`,
      toCsv(
        ["Merit rank", "Student", "Registration no", "District", "Score", "Max", "Percentage", "Correct", "Incorrect", "Unanswered", "Time (s)", "Status", "Flags"],
        rows.map((r) => [r.meritRank, r.attempt.registration.user.fullName, r.attempt.registration.registrationNumber, r.attempt.registration.user.profile?.district, r.score, r.maxScore, r.percentage, r.correctCount, r.incorrectCount, r.unansweredCount, r.timeTakenSeconds, label(r.status), r.attempt.flagCount]),
      ),
    );
  }

  if (report === "expenses") {
    const rows = await db.businessExpense.findMany({ include: { prize: true, campaign: true, competition: true }, orderBy: { expenseDate: "desc" } });
    return csvResponse(
      `expenses-${stamp()}.csv`,
      toCsv(
        ["Date", "Category", "Description", "Amount (PKR)", "Vendor", "Receipt ref", "Quantity", "Prize", "Campaign", "Competition"],
        rows.map((e) => [e.expenseDate.toISOString().slice(0, 10), label(e.category), e.description, num(e.amount), e.vendor, e.receiptReference, e.quantity, e.prize?.title, e.campaign?.name, e.competition?.title]),
      ),
    );
  }

  if (report === "financial-summary") {
    const [revenue, sandbox, refunded, expenses, projections] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: false } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { status: PAYMENT_STATUS.SUCCEEDED, isSandbox: true } }),
      db.payment.aggregate({ _sum: { refundAmount: true }, where: { status: PAYMENT_STATUS.REFUNDED, isSandbox: false } }),
      db.businessExpense.groupBy({ by: ["category"], _sum: { amount: true } }),
      db.financialProjection.findMany({ orderBy: [{ type: "desc" }, { sortOrder: "asc" }] }),
    ]);
    const totalExp = expenses.reduce((a, e) => a + num(e._sum.amount), 0);
    const rows: unknown[][] = [
      ["ACTUAL", "Revenue", "Verified registration fees", num(revenue._sum.amount)],
      ["ACTUAL", "Revenue", "Refunded", -num(refunded._sum.refundAmount)],
      ...expenses.map((e) => ["ACTUAL", "Expense", label(e.category), num(e._sum.amount)]),
      ["ACTUAL", "Result", "Operating surplus / (deficit)", num(revenue._sum.amount) - num(refunded._sum.refundAmount) - totalExp],
      ["INFO", "Excluded", "Sandbox (test) payments", num(sandbox._sum.amount)],
      ...projections.map((p) => ["PROJECTED", label(p.type), p.label, num(p.amount)]),
    ];
    return csvResponse(`financial-summary-${stamp()}.csv`, toCsv(["Basis", "Type", "Line", "Amount (PKR)"], rows));
  }

  if (report === "newsletter") {
    const rows = await db.newsletterSubscriber.findMany({ orderBy: { consentAt: "desc" } });
    return csvResponse(`newsletter-${stamp()}.csv`, toCsv(["Email", "Status", "Source", "Consent date"], rows.map((r) => [r.email, r.status, r.source, r.consentAt])));
  }

  return new Response("Not found", { status: 404 });
}
